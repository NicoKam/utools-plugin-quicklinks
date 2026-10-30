/// <reference types="vite/client" />

interface Window {
  services: {
    captureInvocationApp?: (action?: unknown) => void;
    getInvocationApp?: () => Promise<import('./editorSettings').ForegroundApp | null>;
    getInvocationAppDebugLogPath?: () => string | null;
    logInvocationAppDebug?: (event: string, data?: Record<string, unknown>) => void;
    readPreview: (location: string) => Promise<{ content: string; truncated: boolean }>;
    open: (request: {
      path: string;
      label: string;
      tool: import('./editorSettings').EditorTool;
    }) => Promise<void>;
  };
}

declare module '*.module.less' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.less' {
  const content: { [key: string]: string };
  export default content;
}
