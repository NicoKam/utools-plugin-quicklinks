import { buildCommand, validateTemplate } from '../shared/command-template.mjs';
import { parseLocation } from '../shared/location.mjs';

export interface EditorTool {
  id: string;
  name: string;
  command: string;
  appMatch?: string;
}

export interface ForegroundApp {
  name: string;
  bundleId?: string;
  appPath?: string;
}

export interface EditorSettings {
  defaultEditor: string;
  editors: EditorTool[];
  followFrontEditor?: boolean;
}

export const EDITOR_SETTINGS_STORAGE_KEY = 'quickLinksEditorSettings';

export function defaultEditorSettings(): EditorSettings {
  return {
    defaultEditor: 'vscode',
    followFrontEditor: true,
    editors: [
      { id: 'vscode', name: 'VS Code', command: 'code -r [-g] "{location}"', appMatch: 'Visual Studio Code, Code, com.microsoft.VSCode, com.microsoft.VSCodeInsiders' },
      { id: 'webstorm', name: 'WebStorm', command: 'webstorm [--line {line} --column {column}] "{path}"', appMatch: 'WebStorm, com.jetbrains.WebStorm' },
      { id: 'zed', name: 'Zed', command: 'zed -e "{location}"', appMatch: 'Zed, Zed Preview, dev.zed.Zed, dev.zed.Zed-Preview' },
      { id: 'sublime', name: 'Sublime Text', command: 'subl "{location}"', appMatch: 'Sublime Text, sublime_text, com.sublimetext.4, com.sublimetext.3' },
      { id: 'trae', name: 'Trae', command: 'trae -r [-g] "{location}"', appMatch: 'Trae, Trae CN, cn.trae.app, com.trae.app' },
    ],
  };
}

export function validateEditorSettings(value: unknown): asserts value is EditorSettings {
  if (!value || typeof value !== 'object')
    throw new Error('编辑器设置格式无效');
  const settings = value as EditorSettings;
  if (settings.followFrontEditor !== undefined && typeof settings.followFrontEditor !== 'boolean')
    throw new Error('跟随前台编辑器设置无效');
  if (!Array.isArray(settings.editors) || !settings.editors.length)
    throw new Error('请至少保留一个编辑器');
  const ids = new Set<string>();
  for (const tool of settings.editors) {
    if (!tool || typeof tool.id !== 'string' || !tool.id || tool.id === 'default' || ids.has(tool.id)) {
      throw new Error('编辑器标识无效或重复');
    }
    ids.add(tool.id);
    if (typeof tool.name !== 'string' || !tool.name.trim())
      throw new Error('请输入编辑器名称');
    if (tool.appMatch !== undefined && typeof tool.appMatch !== 'string')
      throw new Error('应用标识格式无效');
    validateTemplate(tool.command);
  }
  if (!ids.has(settings.defaultEditor))
    throw new Error('请选择全局默认编辑器');
}

export function getEditorSettings(): EditorSettings {
  const data: unknown = window.utools?.dbStorage.getItem(EDITOR_SETTINGS_STORAGE_KEY);
  try {
    validateEditorSettings(data);
    return data;
  } catch {
    return defaultEditorSettings();
  }
}

export function setEditorSettings(settings: EditorSettings) {
  validateEditorSettings(settings);
  window.utools?.dbStorage.setItem(EDITOR_SETTINGS_STORAGE_KEY, settings);
}

const editorApplications: Record<string, string[]> = {
  vscode: ['com.microsoft.VSCode', 'com.microsoft.VSCodeInsiders', 'Visual Studio Code', 'Code', 'Code - Insiders'],
  zed: ['dev.zed.Zed', 'dev.zed.Zed-Preview', 'Zed', 'Zed Preview'],
  webstorm: ['com.jetbrains.WebStorm', 'WebStorm', 'webstorm64'],
  sublime: ['com.sublimetext.4', 'com.sublimetext.3', 'Sublime Text', 'sublime_text'],
  trae: ['cn.trae.app', 'com.trae.app', 'Trae', 'Trae CN'],
};

function normalizeApplication(value: string) {
  return value.replace(/\\/g, '/').split('/').at(-1)?.replace(/\.(?:app|exe)$/i, '').trim().toLowerCase() ?? '';
}

export function matchForegroundEditor(app: ForegroundApp | null | undefined, settings: EditorSettings) {
  if (!app)
    return undefined;
  const identities = [app.name, app.bundleId ?? '', app.appPath ?? ''].map(normalizeApplication).filter(Boolean);
  return settings.editors.find((tool) => {
    const names = [...(editorApplications[tool.id] ?? []), tool.name, ...(tool.appMatch ?? '').split(/[,，\n]/)];
    try {
      names.push(buildCommand(tool.command, { path: '/example/file.ts', line: 1 }).executable);
    } catch { /* Invalid commands cannot contribute an application identity. */ }
    return names.map(normalizeApplication).filter(Boolean).some(name => identities.includes(name));
  });
}

export function resolveEditor(editorId: string | undefined, settings: EditorSettings, app?: ForegroundApp | null): EditorTool {
  return settings.editors.find(tool => tool.id === editorId)
    ?? (settings.followFrontEditor !== false ? matchForegroundEditor(app, settings) : undefined)
    ?? settings.editors.find(tool => tool.id === settings.defaultEditor)!;
}

export function validateCodeLocation(value: string) {
  const location = parseLocation(value);
  if (!(location.path.startsWith('/') || /^[a-z]:[\\/]/i.test(location.path) || /^\\\\[^\\]+\\[^\\]+/.test(location.path))) {
    throw new Error('请输入文件的完整绝对路径，例如 /Users/you/project/file.ts:12');
  }
  return location;
}
