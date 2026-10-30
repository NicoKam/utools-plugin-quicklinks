const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createRequire, wrap } = require('node:module');
const os = require('node:os');
const path = require('node:path');
const process = require('node:process');
const { Script } = require('node:vm');

function loadPreloadInVm(entry) {
  const cache = new Map();
  const load = (filename) => {
    if (cache.has(filename))
      return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const nativeRequire = createRequire(filename);
    const localRequire = name => name.startsWith('.') ? load(nativeRequire.resolve(name)) : nativeRequire(name);
    // Plugin loaders evaluate CommonJS in a VM. No dynamic-import callback is installed.
    const compiled = new Script(wrap(fs.readFileSync(filename, 'utf8')), { filename }).runInThisContext();
    compiled(module.exports, localRequire, module, filename, path.dirname(filename));
    return module.exports;
  };
  return load(entry);
}

function waitForCapture(directory) {
  return new Promise((resolve, reject) => {
    let timeout;
    const watcher = fs.watch(directory, (_, filename) => {
      if (filename !== 'args.json')
        return;
      clearTimeout(timeout);
      watcher.close();
      try {
        resolve(JSON.parse(fs.readFileSync(path.join(directory, 'args.json'), 'utf8')));
      } catch (error) {
        reject(error);
      }
    });
    timeout = setTimeout(() => {
      watcher.close();
      reject(new Error('启动命令未产生参数结果'));
    }, 10000);
  });
}

async function runPreloadRegression() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'quicklinks-runtime-'));
  const oldWindow = globalThis.window;
  try {
    globalThis.window = {};
    loadPreloadInVm(path.resolve(__dirname, '../public/preload/services.js'));
    const service = globalThis.window.services;
    const file = path.join(directory, 'source "quoted" $(literal); file.ts');
    fs.writeFileSync(file, '// 你好\r\nconst value = 1\r\n');
    assert.deepEqual(await service.readPreview(`${file}:12`), { content: '// 你好\nconst value = 1\n', truncated: false });
    assert.equal(service.readFile, undefined);
    await assert.rejects(service.readPreview(`${file}:0`), /整数/);
    await assert.rejects(service.readPreview(path.join(directory, 'missing.ts')), /不存在/);
    const script = path.join(directory, 'capture.cjs');
    fs.writeFileSync(script, 'const fs=require("node:fs"),path=require("node:path");fs.writeFileSync(path.join(__dirname,"args.tmp"),JSON.stringify(process.argv.slice(2)));fs.renameSync(path.join(__dirname,"args.tmp"),path.join(__dirname,"args.json"));');
    const tool = { name: 'Runtime check', command: `"${process.execPath}" "${script}" "{path}" [--line {line} --column {column}] "{label}"` };
    const withLine = await Promise.all([waitForCapture(directory), service.open({ path: `${file}:12:3`, label: '测试书签', tool })]);
    assert.deepEqual(withLine[0], [file, '--line', '12', '--column', '3', '测试书签']);
    const withoutLine = await Promise.all([waitForCapture(directory), service.open({ path: file, label: '无行号书签', tool })]);
    assert.deepEqual(withoutLine[0], [file, '无行号书签']);
    return { node: process.versions.node, electron: process.versions.electron, preview: 'passed', command: 'passed', loader: 'CommonJS VM' };
  } finally {
    globalThis.window = oldWindow;
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

module.exports = { runPreloadRegression };

if (require.main === module) {
  runPreloadRegression().then((result) => {
    console.log(JSON.stringify(result));
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
