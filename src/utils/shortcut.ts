import { useEventListener } from 'ahooks';
import { Target } from 'ahooks/lib/useEventListener';

type Options<T extends Target = Target> = {
  target?: T;
  capture?: boolean;
  once?: boolean;
  passive?: boolean;
  enable?: boolean;
};

// Define the allowed key mappings for shortcuts
const allowKeyMap: Record<string, string> = {
  KeyA: 'A',
  KeyB: 'B',
  KeyC: 'C',
  KeyD: 'D',
  KeyE: 'E',
  KeyF: 'F',
  KeyG: 'G',
  KeyH: 'H',
  KeyI: 'I',
  KeyJ: 'J',
  KeyK: 'K',
  KeyL: 'L',
  KeyM: 'M',
  KeyN: 'N',
  KeyO: 'O',
  KeyP: 'P',
  KeyQ: 'Q',
  KeyR: 'R',
  KeyS: 'S',
  KeyT: 'T',
  KeyU: 'U',
  KeyV: 'V',
  KeyW: 'W',
  KeyX: 'X',
  KeyY: 'Y',
  KeyZ: 'Z',
  Digit0: '0',
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',
  Enter: 'Enter',
  Escape: 'Escape',
  Backspace: 'Backspace',
  Tab: 'Tab',
  Space: 'Space',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: '\'',
  Backquote: '`',
  Comma: ',',
  Period: '.',
  Slash: '/',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Insert: 'Insert',
  Delete: 'Delete',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  NumLock: 'NumLock',
  CapsLock: 'CapsLock',
  ScrollLock: 'ScrollLock',
  Pause: 'Pause',
  PrintScreen: 'PrintScreen',
  F1: 'F1',
  F2: 'F2',
  F3: 'F3',
  F4: 'F4',
  F5: 'F5',
  F6: 'F6',
  F7: 'F7',
  F8: 'F8',
  F9: 'F9',
  F10: 'F10',
  F11: 'F11',
  F12: 'F12',
  Numpad0: '0',
  Numpad1: '1',
  Numpad2: '2',
  Numpad3: '3',
  Numpad4: '4',
  Numpad5: '5',
  Numpad6: '6',
  Numpad7: '7',
  Numpad8: '8',
  Numpad9: '9',
};

/**
 * 根据键盘事件，返回一个标准化的快捷键字符串 e.g. 'ctrl+shift+a'
 */
export function normalizeHotkey(event: KeyboardEvent) {
  const keys = [];
  if (event.ctrlKey) {
    keys.push('Ctrl');
  }
  if (event.shiftKey) {
    keys.push('Shift');
  }
  if (event.altKey) {
    keys.push('Alt');
  }
  if (event.metaKey) {
    // 暂不考虑 Win 的展示
    keys.push('Cmd');
  }

  const keyStr = allowKeyMap[event.code];

  if (keyStr) keys.push(keyStr);

  if (keyStr) {
    return keys;
  }
  return null;
}

export function useShortCutListener<T extends Target = Target>(
  eventName: string | string[],
  callback: (e: KeyboardEvent, event: string) => void,
  options?: Options<T>,
) {
  const eventNames = Array.isArray(eventName) ? eventName : [eventName];

  const handleKeyDown = (e: KeyboardEvent) => {
    const keyStr = normalizeHotkey(e)?.join('+');
    if (keyStr && eventNames.includes(keyStr)) {
      callback(e, keyStr);
    }
  };

  useEventListener('keydown', handleKeyDown, options as Options<Target>);
}
