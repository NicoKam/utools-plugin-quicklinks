const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const { EventEmitter } = require('node:events');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const process = require('node:process');
const test = require('node:test');
const { createEditorService, assertPath } = require('../public/preload/editors.cjs');
const { runPreloadRegression } = require('./preload-runtime.cjs');

test('preload supports a CommonJS VM without a dynamic-import callback', async () => {
  await runPreloadRegression();
});

test('generated CommonJS modules match the frontend parsers', async () => {
  const nativeCommand = require('../public/preload/command-template.cjs');
  const nativeLocation = require('../public/preload/location.cjs');
  const sharedLocation = await import('../shared/location.mjs');
  const sharedCommand = await import('../shared/command-template.mjs');
  for (const value of ['/tmp/file.ts', '/tmp/a file.ts:12', 'C:\\Users\\me\\file.ts:12:3']) {
    assert.deepEqual(nativeLocation.parseLocation(value), sharedLocation.parseLocation(value));
  }
  for (const context of [{ path: '/tmp/a file.ts' }, { path: '/tmp/a file.ts', line: 12, column: 3 }]) {
    assert.deepEqual(nativeCommand.buildCommand('code -r [-g] "{location}"', context), sharedCommand.buildCommand('code -r [-g] "{location}"', context));
  }
});

async function temporaryFiles(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quicklinks-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

test('code locations support absolute paths and reject invalid positions', async () => {
  const { validateCodeLocation } = await import('../src/editorSettings.ts');
  assert.deepEqual(validateCodeLocation('/Users/me/a file.ts:12'), { path: '/Users/me/a file.ts', position: 'line', line: 12, column: 1 });
  assert.equal(validateCodeLocation('C:\\Users\\me\\source.ts:12:3').path, 'C:\\Users\\me\\source.ts');
  assert.equal(validateCodeLocation('\\\\server\\share\\source.ts:12').line, 12);
  assert.equal(validateCodeLocation('/Users/me/source.ts').position, 'file');
  for (const input of ['source.ts', '/tmp/a.ts:0', '/tmp/a.ts:-1', '/tmp/a.ts:9007199254740992', '/tmp/a.ts\n']) assert.throws(() => validateCodeLocation(input));
  assert.throws(() => assertPath('C:source.ts', 'win32'));
});

test('preset editors handle bookmarks with and without line numbers', async () => {
  const { defaultEditorSettings } = await import('../src/editorSettings.ts');
  const { buildCommand } = await import('../shared/command-template.mjs');
  const settings = defaultEditorSettings();
  const file = '/tmp/a file.ts';
  const args = (id, line) => buildCommand(settings.editors.find(tool => tool.id === id).command, { path: file, line }).args;
  assert.deepEqual(args('vscode', 12), ['-r', '-g', `${file}:12:1`]);
  assert.deepEqual(args('webstorm', 12), ['--line', '12', '--column', '1', file]);
  assert.deepEqual(args('zed', 12), ['-e', `${file}:12:1`]);
  assert.deepEqual(args('sublime', 12), [`${file}:12:1`]);
  assert.deepEqual(args('trae', 12), ['-r', '-g', `${file}:12:1`]);
  for (const tool of settings.editors) assert.ok(buildCommand(tool.command, { path: file }).args.includes(file));
  for (const template of ['', 'code "{unknown}"', 'code "{path}', 'code [--line {line}', 'code {path}; other', 'code\n{path}', 'code [[{line}]]']) assert.throws(() => buildCommand(template, { path: file, line: 12 }));
  assert.throws(() => buildCommand('code {line} {path}', { path: file }), /没有行号/);
  assert.equal(buildCommand('"C:\\Program Files\\Editor\\editor.exe" "{path}"', { path: 'C:\\Users\\me\\a.ts' }).executable, 'C:\\Program Files\\Editor\\editor.exe');
});

test('custom commands really launch and preserve special path and label characters', async (t) => {
  const dir = await temporaryFiles(t);
  const file = path.join(dir, 'source "quoted" $(example); file.ts');
  const script = path.join(dir, 'capture.cjs');
  await fs.writeFile(file, 'const value = 1\n');
  await fs.writeFile(script, 'require(\'node:fs\').writeFileSync(require(\'node:path\').join(__dirname, \'args.json\'), JSON.stringify(process.argv.slice(2)))');
  const tool = { id: 'custom', name: 'Capture', command: `"${process.execPath}" "${script}" "{path}" "{label}" [--line {line}] "{dir}" "{filename}"` };
  await createEditorService().open({ path: `${file}:12`, label: 'A "quoted" label', tool });
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir, 'args.json'), 'utf8')), [file, 'A "quoted" label', '--line', '12', dir, path.basename(file)]);
});

test('global settings persist and explicit editor overrides survive default changes', async (t) => {
  const { defaultEditorSettings, resolveEditor, validateEditorSettings, getEditorSettings, setEditorSettings } = await import('../src/editorSettings.ts');
  const settings = defaultEditorSettings();
  settings.defaultEditor = 'zed';
  assert.equal(resolveEditor(undefined, settings).id, 'zed');
  assert.equal(resolveEditor('default', settings).id, 'zed');
  assert.equal(resolveEditor('vscode', settings).id, 'vscode');
  assert.equal(resolveEditor('deleted-editor', settings).id, 'zed');
  assert.throws(() => validateEditorSettings({ ...settings, defaultEditor: 'missing' }));
  assert.throws(() => validateEditorSettings({ ...settings, editors: [settings.editors[0], settings.editors[0]] }));
  const oldWindow = globalThis.window;
  t.after(() => {
    globalThis.window = oldWindow;
  });
  let stored;
  globalThis.window = { utools: { dbStorage: { getItem: () => stored, setItem: (_, value) => {
    stored = value;
  } } } };
  const custom = { defaultEditor: 'custom', editors: [{ id: 'custom', name: 'My Editor', command: 'my-editor "{location}"' }] };
  setEditorSettings(custom);
  assert.deepEqual(getEditorSettings(), custom);
  stored = { defaultEditor: 'custom', editors: [] };
  assert.equal(getEditorSettings().defaultEditor, 'vscode');
});

test('preview errors explain missing files, directories, binary and non-UTF-8 files', async (t) => {
  const dir = await temporaryFiles(t);
  const service = createEditorService({ env: { PATH: '' }, platform: 'linux' });
  await assert.rejects(service.readPreview(path.join(dir, 'missing.ts')), /不存在/);
  await assert.rejects(service.readPreview(dir), /目录/);
  const file = path.join(dir, 'source.ts');
  await fs.writeFile(file, '// 你好\r\nconst value = 1\r');
  assert.deepEqual(await service.readPreview(`${file}:2`), { content: '// 你好\nconst value = 1\n', truncated: false });
  await assert.rejects(service.open({ path: file, tool: { name: 'Missing', command: 'missing "{path}"' } }), /未找到.*设置/);
  await fs.writeFile(file, '');
  assert.deepEqual(await service.readPreview(file), { content: '', truncated: false });
  await fs.writeFile(file, Buffer.from([0x89, 0x50, 0, 0x47]));
  await assert.rejects(service.readPreview(file), /二进制/);
  await fs.writeFile(file, Buffer.from([0xFF, 0xFE, 0xFA]));
  await assert.rejects(service.readPreview(file), /UTF-8/);
});

test('preview stays bounded and handles a UTF-8 character at the byte limit', async (t) => {
  const dir = await temporaryFiles(t);
  const file = path.join(dir, 'source.ts');
  const service = createEditorService();
  await fs.writeFile(file, 'a\n'.repeat(4000));
  const lines = await service.readPreview(file);
  assert.equal(lines.truncated, true);
  assert.equal(lines.content.split('\n').length, 3000);
  await fs.writeFile(file, `${'a'.repeat(256 * 1024 - 1)}你好`);
  const bytes = await service.readPreview(file);
  assert.equal(bytes.truncated, true);
  assert.equal(bytes.content, 'a'.repeat(256 * 1024 - 1));
});

test('native GUI launchers detach and never invoke a shell', async (t) => {
  const dir = await temporaryFiles(t);
  const file = path.join(dir, 'source.ts');
  const executable = path.join(dir, 'Editor.app/Contents/MacOS/editor');
  await fs.mkdir(path.dirname(executable), { recursive: true });
  await fs.writeFile(file, 'const value = 1');
  await fs.writeFile(executable, '#!/bin/sh\n', { mode: 0o755 });
  let unref = false;
  const service = createEditorService({ platform: 'darwin', spawn: (command, args, options) => {
    assert.equal(command, executable);
    assert.deepEqual(args, [file]);
    assert.equal(options.detached, true);
    assert.equal(options.shell, false);
    const child = new EventEmitter();
    child.unref = () => {
      unref = true;
    };
    process.nextTick(() => child.emit('spawn'));
    return child;
  } });
  await service.open({ path: file, tool: { name: 'My Editor', command: `"${executable}" "{location}"` } });
  assert.equal(unref, true);
});
