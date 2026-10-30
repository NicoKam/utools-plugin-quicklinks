const suffix = /(?<!\\):(-?\d+)(?::(-?\d+))?$/;

export function parseLocation(value) {
  if (typeof value !== 'string' || !value.trim())
    throw new Error('请输入文件绝对路径。');
  if (Array.from(value).some(character => character.charCodeAt(0) < 32))
    throw new Error('文件路径不能包含换行或控制字符。');
  const content = value.trim();
  const match = content.match(suffix);
  const path = (match ? content.slice(0, match.index) : content).replace(/\\:/g, ':');
  if (!path)
    throw new Error('请输入文件绝对路径。');
  if (!match)
    return { path, position: 'file' };
  const line = Number(match[1]);
  const column = match[2] === undefined ? 1 : Number(match[2]);
  if (!Number.isSafeInteger(line) || line < 1 || !Number.isSafeInteger(column) || column < 1)
    throw new Error('行号和列号必须是大于零的整数。');
  return { path, position: 'line', line, column };
}

export function encodeFilePath(path) {
  // A picked filename may itself end in :20. Escape its suffix so selecting
  // that file still creates a bookmark without a line number.
  const match = path.match(suffix);
  return match ? path.slice(0, match.index) + match[0].replace(/:/g, '\\:') : path;
}
