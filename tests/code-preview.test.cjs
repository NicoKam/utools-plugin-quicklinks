const assert = require('node:assert/strict');
const test = require('node:test');

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('only the latest asynchronous preview dependency can update the editor', async () => {
  const { createLatestAsyncLoader } = await import('../src/utils/latestAsyncLoader.ts');
  const first = deferred();
  const second = deferred();
  const accepted = [];
  const loader = createLatestAsyncLoader();
  const firstRun = loader.run(() => first.promise, value => accepted.push(value));
  const secondRun = loader.run(() => second.promise, value => accepted.push(value));
  second.resolve('VS Code file');
  await secondRun;
  first.resolve('stale Zed file');
  await firstRun;
  assert.deepEqual(accepted, ['VS Code file']);
});

test('CodeMirror language descriptions are selected by bookmark filename', async () => {
  const { codeMirrorLanguageName } = await import('../src/utils/codeMirrorLanguage.ts');
  assert.equal(codeMirrorLanguageName('/project/Component.tsx'), 'TSX');
  assert.equal(codeMirrorLanguageName('/project/service.proto'), 'ProtoBuf');
  assert.equal(codeMirrorLanguageName('/project/unknown.custom'), 'Plain Text');
});
