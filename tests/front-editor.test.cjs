const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { runInNewContext } = require('node:vm');
const { createInvocationAppService, createInvocationDebugLogger } = require('../public/preload/front-app.cjs');

test('macOS skips uTools and chooses the immediate preceding application', () => {
  const script = fs.readFileSync(path.join(__dirname, '../public/preload/front-app.jxa'), 'utf8');
  const applications = {
    1: { localizedName: 'uTools', bundleIdentifier: 'org.yuanli.utools' },
    2: { localizedName: 'Zed', bundleIdentifier: 'dev.zed.Zed' },
    3: { localizedName: 'Safari', bundleIdentifier: 'com.apple.Safari' },
  };
  const windows = [{ kCGWindowLayer: 25, kCGWindowOwnerPID: 3 }, { kCGWindowLayer: 0, kCGWindowOwnerPID: 1 }, { kCGWindowLayer: 0, kCGWindowOwnerPID: 2 }];
  const result = () => JSON.parse(runInNewContext(script, {
    ObjC: { import: () => {}, bindFunction: () => {}, unwrap: value => value, deepUnwrap: value => value },
    $: { NSWorkspace: { sharedWorkspace: { frontmostApplication: applications[1] } }, CGWindowListCopyWindowInfo: () => windows, CFArrayGetCount: value => value.length, CFArrayGetValueAtIndex: (value, index) => value[index], CFRelease: () => {
      throw new Error('JXA owns the returned window array');
    }, NSRunningApplication: { runningApplicationWithProcessIdentifier: id => applications[id] } },
  }));
  assert.equal(result().name, 'Zed');
  windows.splice(2, 0, { kCGWindowLayer: 0, kCGWindowOwnerPID: 3 });
  assert.equal(result().name, 'Safari');
});

test('known editors are recognized by application identity on macOS and Windows', async () => {
  const { defaultEditorSettings, matchForegroundEditor } = await import('../src/editorSettings.ts');
  const settings = defaultEditorSettings();
  for (const [app, expected] of [
    [{ name: 'Zed', bundleId: 'dev.zed.Zed' }, 'zed'],
    [{ name: 'Visual Studio Code', bundleId: 'com.microsoft.VSCode' }, 'vscode'],
    [{ name: 'Code', appPath: 'C:\\Program Files\\Microsoft VS Code\\Code.exe' }, 'vscode'],
    [{ name: 'WebStorm', appPath: '/Applications/WebStorm.app' }, 'webstorm'],
    [{ name: 'sublime_text', appPath: 'C:\\Program Files\\Sublime Text\\sublime_text.exe' }, 'sublime'],
    [{ name: 'Trae CN', bundleId: 'cn.trae.app' }, 'trae'],
  ]) {
    assert.equal(matchForegroundEditor(app, settings)?.id, expected);
  }
  assert.equal(matchForegroundEditor({ name: 'Finder' }, settings), undefined);
  assert.equal(matchForegroundEditor({ name: 'uTools' }, settings), undefined);
  assert.equal(matchForegroundEditor({ name: 'Code Helper' }, settings), undefined);
});

test('default editor settings expose application identifiers for reset and customization', async () => {
  const { defaultEditorSettings } = await import('../src/editorSettings.ts');
  const settings = defaultEditorSettings();
  assert.equal(settings.defaultEditor, 'vscode');
  assert.equal(settings.followFrontEditor, true);
  assert.deepEqual(
    Object.fromEntries(settings.editors.map(editor => [editor.id, editor.appMatch])),
    {
      vscode: 'Visual Studio Code, Code, com.microsoft.VSCode, com.microsoft.VSCodeInsiders',
      webstorm: 'WebStorm, com.jetbrains.WebStorm',
      zed: 'Zed, Zed Preview, dev.zed.Zed, dev.zed.Zed-Preview',
      sublime: 'Sublime Text, sublime_text, com.sublimetext.4, com.sublimetext.3',
      trae: 'Trae, Trae CN, cn.trae.app, com.trae.app',
    },
  );
});

test('bookmark overrides take precedence and missing contexts fall back to the global default', async () => {
  const { defaultEditorSettings, resolveEditor } = await import('../src/editorSettings.ts');
  const settings = defaultEditorSettings();
  const app = { name: 'Zed', bundleId: 'dev.zed.Zed' };
  assert.equal(resolveEditor('default', settings, app).id, 'zed');
  assert.equal(resolveEditor(undefined, settings, app).id, 'zed');
  assert.equal(resolveEditor('vscode', settings, app).id, 'vscode');
  assert.equal(resolveEditor('deleted-editor', settings, app).id, 'zed');
  assert.equal(resolveEditor('default', settings, { name: 'Finder' }).id, 'vscode');
  assert.equal(resolveEditor('default', settings, null).id, 'vscode');
  settings.followFrontEditor = false;
  assert.equal(resolveEditor('default', settings, app).id, 'vscode');
});

test('custom editors can match names, executables and explicit application identifiers', async () => {
  const { defaultEditorSettings, matchForegroundEditor } = await import('../src/editorSettings.ts');
  const settings = defaultEditorSettings();
  settings.editors.push({ id: 'custom', name: 'My Editor', command: 'my-editor "{path}"', appMatch: 'Cursor, com.todesktop.230313mzl4w4u92' });
  assert.equal(matchForegroundEditor({ name: 'Cursor' }, settings)?.id, 'custom');
  assert.equal(matchForegroundEditor({ name: 'Different Name', bundleId: 'com.todesktop.230313mzl4w4u92' }, settings)?.id, 'custom');
  assert.equal(matchForegroundEditor({ name: 'My Editor', appPath: '/Applications/My Editor.app' }, settings)?.id, 'custom');
  assert.equal(matchForegroundEditor({ name: 'my-editor' }, settings)?.id, 'custom');
});

test('invocation context is captured once and refreshed on the next plugin entry', async () => {
  let onEnter;
  let onOut;
  let runs = 0;
  let app = { name: 'Zed', bundleId: 'dev.zed.Zed' };
  const service = createInvocationAppService({ platform: 'darwin', utools: {
    onPluginEnter: (callback) => {
      onEnter = callback;
    },
    onPluginOut: (callback) => {
      onOut = callback;
    },
  }, execFile: (executable, args, options, callback) => {
    runs++;
    assert.equal(executable, '/usr/bin/osascript');
    assert.equal(options.shell, false);
    assert.equal(options.timeout, 3000);
    assert.equal(args.at(-2), '-e');
    assert.match(args.at(-1), /getInvocationApplication/);
    callback(null, JSON.stringify(app));
  } });
  onEnter({ type: 'text' });
  assert.equal((await service.getInvocationApp()).name, 'Zed');
  app = { name: 'uTools' };
  assert.equal((await service.getInvocationApp()).name, 'Zed');
  assert.equal(runs, 1);
  onOut();
  app = { name: 'Code' };
  onEnter({ type: 'text' });
  assert.equal((await service.getInvocationApp()).name, 'Code');
  assert.equal(runs, 2);
});

test('the renderer can explicitly refresh invocation context when uTools replaces preload listeners', async () => {
  let app = { name: 'Zed', bundleId: 'dev.zed.Zed' };
  const service = createInvocationAppService({ platform: 'darwin', utools: {}, execFile: (_, args, options, callback) => {
    callback(null, JSON.stringify(app));
  } });
  service.captureInvocationApp({ type: 'text', code: 'quicklinks' });
  assert.equal((await service.getInvocationApp()).name, 'Zed');
  app = { name: 'Code', bundleId: 'com.microsoft.VSCode' };
  service.captureInvocationApp({ type: 'text', code: 'quicklinks' });
  assert.equal((await service.getInvocationApp()).name, 'Code');
});

test('native detection failures are silent fallbacks and stale asynchronous results are discarded', async () => {
  let onOut;
  let complete;
  const service = createInvocationAppService({ platform: 'darwin', utools: {
    onPluginEnter: () => {},
    onPluginOut: (callback) => {
      onOut = callback;
    },
  }, execFile: (_, args, options, callback) => {
    complete = callback;
  } });
  const pending = service.getInvocationApp();
  onOut();
  complete(null, '{"name":"Zed"}');
  assert.equal(await pending, null);
  const failing = createInvocationAppService({ platform: 'win32', utools: {}, execFile: (executable, args, options, callback) => {
    assert.equal(executable, 'powershell.exe');
    assert.equal(options.shell, false);
    assert.equal(args.at(-2), '-Command');
    assert.match(args.at(-1), /GetForegroundWindow/);
    callback(new Error('unavailable'));
  } });
  assert.equal(await failing.getInvocationApp(), null);
  const unsupported = createInvocationAppService({ platform: 'linux', utools: {}, execFile: () => {
    throw new Error('should not run');
  } });
  assert.equal(await unsupported.getInvocationApp(), null);
});

test('a transient empty foreground result is retried instead of being cached for the session', async () => {
  let onEnter;
  let runs = 0;
  const service = createInvocationAppService({ platform: 'darwin', utools: {
    onPluginEnter: (callback) => {
      onEnter = callback;
    },
    onPluginOut: () => {},
  }, execFile: (_, args, options, callback) => {
    runs++;
    callback(null, runs === 1 ? '' : '{"name":"Zed","bundleId":"dev.zed.Zed"}');
  } });
  onEnter({ type: 'text' });
  assert.equal(await service.getInvocationApp(), null);
  assert.equal((await service.getInvocationApp()).name, 'Zed');
  assert.equal(runs, 2);
});

test('uTools window-match payloads bypass native detection', async () => {
  let onEnter;
  const service = createInvocationAppService({ platform: 'darwin', utools: {
    onPluginEnter: (callback) => {
      onEnter = callback;
    },
    onPluginOut: () => {},
  }, execFile: () => {
    throw new Error('should not run');
  } });
  onEnter({ type: 'window', payload: { app: 'Zed.app', appPath: '/Applications/Zed.app' } });
  assert.equal((await service.getInvocationApp()).name, 'Zed.app');
});

test('foreground diagnostics are JSON lines and include native capture failures', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'quicklinks-front-log-test-'));
  try {
    const logPath = path.join(directory, 'front-app.log');
    const writeLog = createInvocationDebugLogger(logPath);
    const service = createInvocationAppService({ platform: 'darwin', utools: {}, log: writeLog, execFile: (_, args, options, callback) => {
      const error = new Error('native detector failed');
      error.code = 139;
      callback(error, '', 'segmentation fault');
    } });
    assert.equal(await service.getInvocationApp(), null);
    const entries = fs.readFileSync(logPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.ok(entries.every(entry => typeof entry.time === 'string' && typeof entry.pid === 'number'));
    assert.ok(entries.some(entry => entry.event === 'native-start' && entry.data.platform === 'darwin'));
    assert.ok(entries.some(entry => entry.event === 'native-error' && entry.data.code === 139 && entry.data.stderr === 'segmentation fault'));
    assert.ok(entries.some(entry => entry.event === 'get-result' && entry.data.app === null));
    if (process.platform !== 'win32')
      assert.equal(fs.statSync(logPath).mode & 0o777, 0o600);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('foreground diagnostics stay disabled unless explicitly configured', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'quicklinks-front-log-disabled-'));
  try {
    const logPath = path.join(directory, 'front-app.log');
    createInvocationDebugLogger(logPath, { enabled: false })('native-result', { appPath: '/Users/example/Editor.app' });
    assert.equal(fs.existsSync(logPath), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('foreground diagnostics refuse symbolic-link targets', { skip: process.platform === 'win32' }, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'quicklinks-front-log-symlink-'));
  try {
    const target = path.join(directory, 'target.log');
    const logPath = path.join(directory, 'front-app.log');
    fs.writeFileSync(target, 'unchanged');
    fs.symlinkSync(target, logPath);
    createInvocationDebugLogger(logPath)('native-result', { name: 'Zed' });
    assert.equal(fs.readFileSync(target, 'utf8'), 'unchanged');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('foreground capture refreshes when the hidden plugin document becomes visible', async () => {
  const { watchDocumentVisible } = await import('../src/utils/watchDocumentVisible.ts');
  const listeners = new Set();
  let visibilityState = 'hidden';
  let refreshes = 0;
  const source = {
    get visibilityState() {
      return visibilityState;
    },
    addEventListener: (type, listener) => {
      assert.equal(type, 'visibilitychange');
      listeners.add(listener);
    },
    removeEventListener: (type, listener) => {
      assert.equal(type, 'visibilitychange');
      listeners.delete(listener);
    },
  };
  const stop = watchDocumentVisible(source, () => refreshes++);
  listeners.forEach(listener => listener());
  assert.equal(refreshes, 0);
  visibilityState = 'visible';
  listeners.forEach(listener => listener());
  assert.equal(refreshes, 1);
  stop();
  listeners.forEach(listener => listener());
  assert.equal(refreshes, 1);
});
