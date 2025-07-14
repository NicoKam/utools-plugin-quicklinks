/* eslint-disable @typescript-eslint/no-explicit-any */
import { useShortCutListener } from '../utils/shortcut';
import { CmdKey } from './const';

export interface UseShortcutLogicOptions {
  onMainAction?: (index?: number) => any;
  onFind?: () => any;
  onTabSwitch?: (prev: boolean) => any;
  enable?: boolean;
  onNextItem?: () => void;
}

const quickOpenShort = new Array(9)
  .fill(0)
  .map((_, index) => [`Ctrl+${index + 1}`, `Cmd+${index + 1}`])
  .flat();

export default function useShortcutLogic(
  options: UseShortcutLogicOptions = {},
) {
  const { onMainAction, onFind, onTabSwitch, onNextItem, enable = true } = options;
  // 快速打开的快捷键
  useShortCutListener(
    quickOpenShort,
    (e) => {
      const index = Number(e.key);
      if (index > 0 && index < 10) {
        onMainAction?.(index - 1);
      }
    },
    { enable },
  );

  useShortCutListener(`${CmdKey}+F`, (e) => {
    if (e.target === document.body) {
      onFind?.();
    }
  }, { enable });

  // Ctrl + Tab 切换分组
  useShortCutListener('Ctrl+Tab', (e) => {
    if (e.target === document.body) {
      e.preventDefault();
      onTabSwitch?.(false);
    }
  }, { enable });

  // Shift + Ctrl + Tab 向前切换分组
  useShortCutListener('Ctrl+Shift+Tab', (e) => {
    if (e.target === document.body) {
      e.preventDefault();
      onTabSwitch?.(true);
    }
  }, { enable });

  useShortCutListener('Tab', (e) => {
    if (e.target === document.body) {
      e.preventDefault();
      onNextItem?.();
    }
  }, { enable });
}
