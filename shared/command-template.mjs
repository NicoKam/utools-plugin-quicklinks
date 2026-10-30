const placeholderNames = new Set(['path', 'location', 'line', 'column', 'label', 'dir', 'filename']);

function optionalParts(template, hasPosition) {
  let result = '';
  for (let index = 0; index < template.length; index++) {
    const character = template[index];
    if (character === '\\' && ['[', ']'].includes(template[index + 1])) {
      result += character + template[++index];
      continue;
    }
    if (character === ']')
      throw new Error('命令中的方括号没有配对。');
    if (character !== '[') {
      result += character;
      continue;
    }
    let content = '';
    let closed = false;
    while (++index < template.length) {
      const next = template[index];
      if (next === '\\' && ['[', ']'].includes(template[index + 1])) {
        content += next + template[++index];
        continue;
      }
      if (next === '[')
        throw new Error('可选命令片段不支持嵌套方括号。');
      if (next === ']') {
        closed = true;
        break;
      }
      content += next;
    }
    if (!closed)
      throw new Error('命令中的方括号没有配对。');
    if (hasPosition)
      result += content;
  }
  return result;
}

function tokenize(command) {
  const tokens = [];
  let token = '';
  let quote = '';
  let started = false;
  for (let index = 0; index < command.length; index++) {
    const character = command[index];
    if (character === '\\' && quote !== '\'') {
      const next = command[index + 1];
      const escapable = quote === '"' ? ['"', '\\', '[', ']'].includes(next) : next !== undefined && (/\s/.test(next) || ['"', '\'', '\\', '[', ']'].includes(next));
      if (escapable) {
        token += next;
        index++;
      } else {
        token += character;
      }
      started = true;
    } else if (quote) {
      if (character === quote)
        quote = '';
      else token += character;
    } else if (character === '"' || character === '\'') {
      quote = character;
      started = true;
    } else if (/\s/.test(character)) {
      if (started) {
        tokens.push(token);
        token = '';
        started = false;
      }
    } else {
      if (/[;&|<>]/.test(character))
        throw new Error('多条命令请放入脚本，然后填写脚本路径和参数。');
      token += character;
      started = true;
    }
  }
  if (quote)
    throw new Error('命令中的引号没有配对。');
  if (started)
    tokens.push(token);
  if (!tokens.length || !tokens[0])
    throw new Error('请输入启动程序和参数。');
  return tokens;
}

export function buildCommand(template, context) {
  if (typeof template !== 'string' || !template.trim())
    throw new Error('请输入启动命令。');
  if (Array.from(template).some(character => character.charCodeAt(0) < 32 && character !== '\t'))
    throw new Error('启动命令请填写为一行。');
  for (const match of template.matchAll(/\{([a-z_]\w*)\}/gi)) {
    if (!placeholderNames.has(match[1]))
      throw new Error(`不支持占位符 {${match[1]}}。`);
  }
  const hasPosition = context.line !== undefined && context.line !== null;
  const slash = Math.max(context.path.lastIndexOf('/'), context.path.lastIndexOf('\\'));
  let dir = context.path.slice(0, slash) || '/';
  if (/^[a-z]:$/i.test(dir))
    dir += context.path[slash];
  const values = {
    path: context.path,
    location: hasPosition ? `${context.path}:${context.line}:${context.column ?? 1}` : context.path,
    line: hasPosition ? String(context.line) : undefined,
    column: hasPosition ? String(context.column ?? 1) : undefined,
    label: context.label ?? context.path.slice(slash + 1),
    dir,
    filename: context.path.slice(slash + 1),
  };
  // Tokenize the user's template first. File paths are inserted into existing
  // arguments afterward, so spaces and quotes in a path cannot create commands.
  const tokens = tokenize(optionalParts(template, hasPosition)).map(token => token.replace(/\{([a-z_]\w*)\}/gi, (_, name) => {
    if (values[name] === undefined)
      throw new Error(`此书签没有行号，请将 {${name}} 放在 [ ] 中，或使用 {location}。`);
    return values[name];
  }));
  return { executable: tokens[0], args: tokens.slice(1) };
}

export function validateTemplate(template) {
  buildCommand(template, { path: '/example/file.ts', line: 20, column: 1, label: '示例书签' });
}
