// Generated from shared modules by scripts/sync-preload.mjs.
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var command_template_exports = {};
__export(command_template_exports, {
  buildCommand: () => buildCommand,
  validateTemplate: () => validateTemplate
});
module.exports = __toCommonJS(command_template_exports);
const placeholderNames = /* @__PURE__ */ new Set(["path", "location", "line", "column", "label", "dir", "filename"]);
function optionalParts(template, hasPosition) {
  let result = "";
  for (let index = 0; index < template.length; index++) {
    const character = template[index];
    if (character === "\\" && ["[", "]"].includes(template[index + 1])) {
      result += character + template[++index];
      continue;
    }
    if (character === "]")
      throw new Error("\u547D\u4EE4\u4E2D\u7684\u65B9\u62EC\u53F7\u6CA1\u6709\u914D\u5BF9\u3002");
    if (character !== "[") {
      result += character;
      continue;
    }
    let content = "";
    let closed = false;
    while (++index < template.length) {
      const next = template[index];
      if (next === "\\" && ["[", "]"].includes(template[index + 1])) {
        content += next + template[++index];
        continue;
      }
      if (next === "[")
        throw new Error("\u53EF\u9009\u547D\u4EE4\u7247\u6BB5\u4E0D\u652F\u6301\u5D4C\u5957\u65B9\u62EC\u53F7\u3002");
      if (next === "]") {
        closed = true;
        break;
      }
      content += next;
    }
    if (!closed)
      throw new Error("\u547D\u4EE4\u4E2D\u7684\u65B9\u62EC\u53F7\u6CA1\u6709\u914D\u5BF9\u3002");
    if (hasPosition)
      result += content;
  }
  return result;
}
function tokenize(command) {
  const tokens = [];
  let token = "";
  let quote = "";
  let started = false;
  for (let index = 0; index < command.length; index++) {
    const character = command[index];
    if (character === "\\" && quote !== "'") {
      const next = command[index + 1];
      const escapable = quote === '"' ? ['"', "\\", "[", "]"].includes(next) : next !== void 0 && (/\s/.test(next) || ['"', "'", "\\", "[", "]"].includes(next));
      if (escapable) {
        token += next;
        index++;
      } else {
        token += character;
      }
      started = true;
    } else if (quote) {
      if (character === quote)
        quote = "";
      else token += character;
    } else if (character === '"' || character === "'") {
      quote = character;
      started = true;
    } else if (/\s/.test(character)) {
      if (started) {
        tokens.push(token);
        token = "";
        started = false;
      }
    } else {
      if (/[;&|<>]/.test(character))
        throw new Error("\u591A\u6761\u547D\u4EE4\u8BF7\u653E\u5165\u811A\u672C\uFF0C\u7136\u540E\u586B\u5199\u811A\u672C\u8DEF\u5F84\u548C\u53C2\u6570\u3002");
      token += character;
      started = true;
    }
  }
  if (quote)
    throw new Error("\u547D\u4EE4\u4E2D\u7684\u5F15\u53F7\u6CA1\u6709\u914D\u5BF9\u3002");
  if (started)
    tokens.push(token);
  if (!tokens.length || !tokens[0])
    throw new Error("\u8BF7\u8F93\u5165\u542F\u52A8\u7A0B\u5E8F\u548C\u53C2\u6570\u3002");
  return tokens;
}
function buildCommand(template, context) {
  if (typeof template !== "string" || !template.trim())
    throw new Error("\u8BF7\u8F93\u5165\u542F\u52A8\u547D\u4EE4\u3002");
  if (Array.from(template).some((character) => character.charCodeAt(0) < 32 && character !== "	"))
    throw new Error("\u542F\u52A8\u547D\u4EE4\u8BF7\u586B\u5199\u4E3A\u4E00\u884C\u3002");
  for (const match of template.matchAll(/\{([a-z_]\w*)\}/gi)) {
    if (!placeholderNames.has(match[1]))
      throw new Error(`\u4E0D\u652F\u6301\u5360\u4F4D\u7B26 {${match[1]}}\u3002`);
  }
  const hasPosition = context.line !== void 0 && context.line !== null;
  const slash = Math.max(context.path.lastIndexOf("/"), context.path.lastIndexOf("\\"));
  let dir = context.path.slice(0, slash) || "/";
  if (/^[a-z]:$/i.test(dir))
    dir += context.path[slash];
  const values = {
    path: context.path,
    location: hasPosition ? `${context.path}:${context.line}:${context.column ?? 1}` : context.path,
    line: hasPosition ? String(context.line) : void 0,
    column: hasPosition ? String(context.column ?? 1) : void 0,
    label: context.label ?? context.path.slice(slash + 1),
    dir,
    filename: context.path.slice(slash + 1)
  };
  const tokens = tokenize(optionalParts(template, hasPosition)).map((token) => token.replace(/\{([a-z_]\w*)\}/gi, (_, name) => {
    if (values[name] === void 0)
      throw new Error(`\u6B64\u4E66\u7B7E\u6CA1\u6709\u884C\u53F7\uFF0C\u8BF7\u5C06 {${name}} \u653E\u5728 [ ] \u4E2D\uFF0C\u6216\u4F7F\u7528 {location}\u3002`);
    return values[name];
  }));
  return { executable: tokens[0], args: tokens.slice(1) };
}
function validateTemplate(template) {
  buildCommand(template, { path: "/example/file.ts", line: 20, column: 1, label: "\u793A\u4F8B\u4E66\u7B7E" });
}
