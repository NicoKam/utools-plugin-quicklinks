const { Buffer } = require('node:buffer');
const { execFile, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const process = require('node:process');
const { buildCommand } = require('./command-template.cjs');
const { parseLocation } = require('./location.cjs');

const commands = { zed: 'zed', vscode: 'code', webstorm: 'webstorm', trae: 'trae', sublime: 'subl' };
const aliases = Object.fromEntries(Object.entries(commands).map(([id, command]) => [command, id]));
const macApps = {
  zed: ['Zed.app/Contents/MacOS/cli'],
  vscode: ['Visual Studio Code.app/Contents/Resources/app/bin/code'],
  webstorm: ['WebStorm.app/Contents/MacOS/webstorm'],
  trae: ['Trae CN.app/Contents/Resources/app/bin/marscode', 'Trae.app/Contents/Resources/app/bin/trae', 'Trae.app/Contents/Resources/app/bin/marscode'],
  sublime: ['Sublime Text.app/Contents/SharedSupport/bin/subl'],
};
function assertPath(value, platform) {
  const pathApi = platform === 'win32' ? path.win32 : path.posix;
  // Command arguments may contain spaces, quotes, dollar signs and semicolons.
  if (typeof value !== 'string' || !pathApi.isAbsolute(value) || Array.from(value).some(character => character.charCodeAt(0) < 32)
    || (platform === 'win32' && !/^(?:[a-z]:[\\/]|\\\\)/i.test(value))) {
    throw new Error('请输入文件的完整绝对路径。');
  }
}
function createEditorService(options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const home = options.home ?? os.homedir();
  const run = options.execFile ?? execFile;
  const start = options.spawn ?? spawn;
  const pathApi = platform === 'win32' ? path.win32 : path.posix;

  function candidates(command) {
    if (command.startsWith('~/'))
      command = pathApi.join(home, command.slice(2));
    if (pathApi.isAbsolute(command)) {
      assertPath(command, platform);
      return [command];
    }
    if (/[\\/]/.test(command))
      throw new Error('启动程序请使用命令名或绝对路径。');
    const editor = aliases[command.replace(/\.exe$/i, '')];
    const binary = platform === 'win32' && !/\.exe$/i.test(command) ? `${command}.exe` : command;
    const directories = (env.PATH ?? '').split(platform === 'win32' ? ';' : ':').filter(dir => pathApi.isAbsolute(dir));
    const paths = directories.map(dir => pathApi.join(dir, binary));
    if (platform === 'darwin') {
      paths.push(...['/usr/local/bin', '/opt/homebrew/bin', path.join(home, '.local/bin')].map(dir => path.join(dir, command)));
      if (editor)
        paths.push(...['/Applications', path.join(home, 'Applications')].flatMap(dir => macApps[editor].map(app => path.join(dir, app))));
    } else if (platform === 'win32' && editor) {
      const appNames = { zed: ['Zed/zed.exe'], vscode: ['Microsoft VS Code/Code.exe'], webstorm: [], trae: ['Trae/Trae.exe', 'Trae CN/Trae CN.exe'], sublime: ['Sublime Text/subl.exe'] };
      for (const dir of [env.LOCALAPPDATA && pathApi.join(env.LOCALAPPDATA, 'Programs'), env.ProgramFiles, env['ProgramFiles(x86)']].filter(Boolean)) {
        paths.push(...appNames[editor].map(app => pathApi.join(dir, app)));
      }
    }
    return [...new Set(paths)];
  }
  async function resolveExecutable(command) {
    for (const candidate of candidates(command)) {
      try {
        await fs.promises.access(candidate, platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK);
        if ((await fs.promises.stat(candidate)).isFile())
          return candidate;
      } catch { /* Try the next installed location. */ }
    }
    return '';
  }
  async function inspectFile(filePath) {
    assertPath(filePath, platform);
    try {
      const stat = await fs.promises.stat(filePath);
      return stat.isFile() ? { exists: true, message: '' } : { exists: false, message: '这个路径是目录，请选择一个文件。' };
    } catch (error) {
      return { exists: false, message: error.code === 'ENOENT' ? '文件不存在或已移动，请编辑书签更新路径。' : '无法访问这个文件，请检查路径及访问权限。' };
    }
  }
  return {
    readPreview: async (content) => {
      const filePath = parseLocation(content).path;
      const file = await inspectFile(filePath);
      if (!file.exists)
        throw new Error(file.message);
      const handle = await fs.promises.open(filePath, 'r');
      try {
        const maxBytes = 256 * 1024;
        const buffer = Buffer.alloc(maxBytes + 1);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        const bytes = buffer.subarray(0, Math.min(bytesRead, maxBytes));
        if (bytes.includes(0))
          throw new Error('这是二进制文件，请使用编辑器打开。');
        const decoder = new TextDecoder('utf-8', { fatal: true });
        let content;
        try {
          content = decoder.decode(bytes, { stream: bytesRead > maxBytes });
        } catch {
          throw new Error('此文件不是 UTF-8 文本，请使用编辑器打开。');
        }
        const lines = content.replace(/\r\n?/g, '\n').split('\n');
        return { content: lines.slice(0, 3000).join('\n'), truncated: bytesRead > maxBytes || lines.length > 3000 };
      } finally {
        await handle.close();
      }
    },
    open: async (request) => {
      const tool = request?.tool;
      if (!tool || typeof tool.name !== 'string' || typeof tool.command !== 'string')
        throw new Error('请选择打开工具。');
      const location = parseLocation(request.path);
      const file = await inspectFile(location.path);
      if (!file.exists)
        throw new Error(file.message);
      const line = location.line;
      const command = buildCommand(tool.command, { path: location.path, line, column: location.column ?? 1, label: request.label });
      const executable = await resolveExecutable(command.executable);
      if (!executable)
        throw new Error(`未找到 ${tool.name} 的启动程序，请在设置中检查命令或填写程序绝对路径。`);
      const args = command.args;
      // Native GUI launchers keep running for the lifetime of the editor.
      if (platform === 'win32' || (platform === 'darwin' && /\.app\/Contents\/MacOS\/(?!cli$)[^/]+$/.test(executable))) {
        await new Promise((resolve, reject) => {
          const child = start(executable, args, { detached: true, stdio: 'ignore', shell: false, env });
          child.once('error', () => reject(new Error(`${tool.name} 启动失败，请检查命令。`)));
          child.once('spawn', () => {
            child.unref();
            resolve();
          });
        });
        return;
      }
      await new Promise((resolve, reject) => {
        run(executable, args, { shell: false, windowsHide: true, timeout: 15000, maxBuffer: 256 * 1024, env }, (error) => {
          if (!error)
            return resolve();
          if (error.killed)
            return reject(new Error(`${tool.name} 启动命令超时，请检查工具是否正在等待确认。`));
          reject(new Error(`${tool.name} 打开失败，请检查设置中的启动命令。${error.code === 'EACCES' ? '该程序没有执行权限。' : ''}`));
        });
      });
    },
  };
}
module.exports = { createEditorService, assertPath };
