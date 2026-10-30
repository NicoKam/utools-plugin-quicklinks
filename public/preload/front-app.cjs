const { execFile } = require('node:child_process');
const { chmodSync, closeSync, constants, fchmodSync, fstatSync, ftruncateSync, mkdirSync, openSync, readFileSync, writeSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const process = require('node:process');

const MAX_DEBUG_LOG_SIZE = 512 * 1024;

function getInvocationDebugLogPath(utools) {
  const applicationData = utools?.getPath?.('userData');
  return path.join(typeof applicationData === 'string' && applicationData ? applicationData : os.tmpdir(), 'quicklinks', 'front-app.log');
}

function redactLocalPath(value) {
  const home = os.homedir();
  return typeof value === 'string' && home ? value.split(home).join('~') : value;
}

function sanitizeDebugData(value) {
  if (Array.isArray(value))
    return value.map(sanitizeDebugData);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, sanitizeDebugData(entry)]));
  return redactLocalPath(value);
}

function createInvocationDebugLogger(logPath, options = {}) {
  if (!(options.enabled ?? Boolean(logPath)) || !logPath)
    return () => {};

  return (event, data = {}) => {
    let descriptor;
    try {
      mkdirSync(path.dirname(logPath), { recursive: true, mode: 0o700 });
      chmodSync(path.dirname(logPath), 0o700);
      descriptor = openSync(logPath, constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | (constants.O_NOFOLLOW ?? 0), 0o600);
      fchmodSync(descriptor, 0o600);
      if (fstatSync(descriptor).size > MAX_DEBUG_LOG_SIZE)
        ftruncateSync(descriptor, 0);
      const entry = { time: new Date().toISOString(), pid: process.pid, event, data: sanitizeDebugData(data) };
      writeSync(descriptor, `${JSON.stringify(entry)}\n`, undefined, 'utf8');
    } catch { /* Diagnostics must never break the plugin. */ } finally {
      if (descriptor !== undefined) {
        try {
          closeSync(descriptor);
        } catch { /* Ignore close errors from optional diagnostics. */ }
      }
    }
  };
}

function createInvocationAppService(options = {}) {
  const platform = options.platform ?? process.platform;
  const run = options.execFile ?? execFile;
  const utools = options.utools;
  const emit = (event, data) => {
    try {
      options.log?.(event, data);
    } catch { /* Diagnostics must never break foreground detection. */ }
  };
  let context;
  let generation = 0;
  const nativeScriptPath = platform === 'darwin'
    ? path.join(__dirname, 'front-app.jxa')
    : path.join(__dirname, 'front-app.ps1');
  let nativeScriptSource;

  emit('service-created', { platform, hasUTools: Boolean(utools) });

  function readApplication() {
    if (!['darwin', 'win32'].includes(platform)) {
      emit('native-unsupported', { platform });
      return Promise.resolve(null);
    }
    const executable = platform === 'darwin' ? '/usr/bin/osascript' : 'powershell.exe';
    try {
      nativeScriptSource ??= readFileSync(nativeScriptPath, 'utf8');
    } catch (error) {
      emit('native-script-error', { script: nativeScriptPath, message: error.message, code: error.code });
      return Promise.resolve(null);
    }
    const args = platform === 'darwin'
      ? ['-l', 'JavaScript', '-e', nativeScriptSource]
      : ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', nativeScriptSource];
    emit('native-start', { platform, executable, script: nativeScriptPath, transport: 'inline' });
    return new Promise((resolve) => {
      run(executable, args, { shell: false, windowsHide: true, timeout: 3000, maxBuffer: 16 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          emit('native-error', {
            message: error.message,
            code: error.code,
            signal: error.signal,
            killed: error.killed,
            stdout: String(stdout ?? '').trim(),
            stderr: String(stderr ?? '').trim(),
          });
          return resolve(null);
        }
        try {
          const info = JSON.parse(stdout.trim().replace(/^\uFEFF/, ''));
          const app = info && typeof info.name === 'string'
            ? { name: info.name, bundleId: typeof info.bundleId === 'string' ? info.bundleId : '', appPath: typeof info.appPath === 'string' ? info.appPath : '' }
            : null;
          emit('native-result', { app, stderr: String(stderr ?? '').trim() });
          resolve(app);
        } catch (error) {
          emit('native-parse-error', { message: error.message, stdout: String(stdout ?? '').trim(), stderr: String(stderr ?? '').trim() });
          resolve(null);
        }
      });
    });
  }

  function capture(action) {
    generation++;
    // Window-match entries can provide the source application directly.
    const payload = action?.type === 'window' ? action.payload : undefined;
    context = payload && typeof payload.app === 'string'
      ? Promise.resolve({ name: payload.app, appPath: payload.appPath || '', bundleId: '' })
      : readApplication();
    emit('capture-start', {
      generation,
      actionType: action?.type,
      actionCode: action?.code,
      payloadApp: payload?.app,
      payloadAppPath: payload?.appPath,
      source: payload && typeof payload.app === 'string' ? 'window-payload' : 'native',
    });
  }

  utools?.onPluginEnter?.(capture);
  utools?.onPluginOut?.(() => {
    generation++;
    context = undefined;
    emit('plugin-out', { generation });
  });

  return {
    captureInvocationApp: capture,
    getInvocationApp: async () => {
      emit('get-start', { generation, hasContext: Boolean(context) });
      if (!context)
        context = utools ? readApplication() : Promise.resolve(null);
      const currentContext = context;
      const currentGeneration = generation;
      const app = await currentContext;
      if (currentGeneration !== generation) {
        emit('get-stale', { requestedGeneration: currentGeneration, currentGeneration: generation });
        return null;
      }
      // Do not keep a transient startup failure for the whole plugin session.
      if (!app && context === currentContext) {
        context = undefined;
        emit('empty-context-cleared', { generation });
      }
      emit('get-result', { generation, app });
      return app;
    },
  };
}

module.exports = { createInvocationAppService, createInvocationDebugLogger, getInvocationDebugLogPath };
