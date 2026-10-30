const assert = require('node:assert/strict');
const test = require('node:test');

test('URL fragments match inside a segment and preserve original highlight positions', async () => {
  const { genContentMatchFn } = await import('../src/utils/stringMatch.ts');
  const value = 'https://example.com/MyDashboard?redirect=/MyDashboard';
  const match = genContentMatchFn(value)('DASHBOARD');
  assert.deepEqual(match, [{ start: 22, end: 30 }, { start: 44, end: 52 }]);
  assert.deepEqual(match.map(range => value.slice(range.start, range.end + 1)), ['Dashboard', 'Dashboard']);
  assert.equal(genContentMatchFn(value)('missing'), null);
  assert.equal(genContentMatchFn(value)(''), null);
});

test('URL parameters and regex punctuation are matched literally', async () => {
  const { genContentMatchFn } = await import('../src/utils/stringMatch.ts');
  const value = 'https://example.com/search?q={query}&tag=[abc]+(test)';
  for (const keyword of ['example.com', '?q={query}', '[abc]+(test)']) {
    const ranges = genContentMatchFn(value)(keyword);
    assert.equal(ranges.map(range => value.slice(range.start, range.end + 1)).join(''), keyword);
  }
});

test('file paths support filename fragments, line numbers and Windows separators', async () => {
  const { genContentMatchFn } = await import('../src/utils/stringMatch.ts');
  for (const [value, keyword, expected] of [
    ['/Users/demo/project/src/SalaryDetail.tsx:120', 'Detail.tsx', 'Detail.tsx'],
    ['/Users/demo/project/src/SalaryDetail.tsx:120', ':120', ':120'],
    ['C:\\Users\\demo\\project\\SalaryDetail.tsx:12', '\\project\\', '\\project\\'],
  ]) {
    const ranges = genContentMatchFn(value)(keyword);
    assert.equal(ranges.map(range => value.slice(range.start, range.end + 1)).join(''), expected);
  }
});

test('content preserves fuzzy and Chinese pinyin search alongside direct matches', async () => {
  const { genContentMatchFn, genChineseMatchFn } = await import('../src/utils/stringMatch.ts');
  const value = '/Users/demo/project/项目管理.ts:12';
  const contentMatch = genContentMatchFn(value)('xmgl');
  assert.equal(contentMatch.map(range => value.slice(range.start, range.end + 1)).join(''), '项目管理');
  assert.deepEqual(genContentMatchFn('/project/src/MyComponent.tsx')('mc'), genChineseMatchFn('/project/src/MyComponent.tsx')('mc'));
  assert.deepEqual(genChineseMatchFn('工作台')('gzt'), [{ start: 0, end: 0 }, { start: 1, end: 1 }, { start: 2, end: 2 }]);
});
