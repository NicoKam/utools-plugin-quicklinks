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
var location_exports = {};
__export(location_exports, {
  encodeFilePath: () => encodeFilePath,
  parseLocation: () => parseLocation
});
module.exports = __toCommonJS(location_exports);
const suffix = /(?<!\\):(-?\d+)(?::(-?\d+))?$/;
function parseLocation(value) {
  if (typeof value !== "string" || !value.trim())
    throw new Error("\u8BF7\u8F93\u5165\u6587\u4EF6\u7EDD\u5BF9\u8DEF\u5F84\u3002");
  if (Array.from(value).some((character) => character.charCodeAt(0) < 32))
    throw new Error("\u6587\u4EF6\u8DEF\u5F84\u4E0D\u80FD\u5305\u542B\u6362\u884C\u6216\u63A7\u5236\u5B57\u7B26\u3002");
  const content = value.trim();
  const match = content.match(suffix);
  const path = (match ? content.slice(0, match.index) : content).replace(/\\:/g, ":");
  if (!path)
    throw new Error("\u8BF7\u8F93\u5165\u6587\u4EF6\u7EDD\u5BF9\u8DEF\u5F84\u3002");
  if (!match)
    return { path, position: "file" };
  const line = Number(match[1]);
  const column = match[2] === void 0 ? 1 : Number(match[2]);
  if (!Number.isSafeInteger(line) || line < 1 || !Number.isSafeInteger(column) || column < 1)
    throw new Error("\u884C\u53F7\u548C\u5217\u53F7\u5FC5\u987B\u662F\u5927\u4E8E\u96F6\u7684\u6574\u6570\u3002");
  return { path, position: "line", line, column };
}
function encodeFilePath(path) {
  const match = path.match(suffix);
  return match ? path.slice(0, match.index) + match[0].replace(/:/g, "\\:") : path;
}
