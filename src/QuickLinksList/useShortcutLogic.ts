/* eslint-disable @typescript-eslint/no-explicit-any */
import { useShortCutListener } from '../utils/shortcut';
import { CmdKey } from './const';

export interface UseShortcutLogicOptions {
  onMainAction?: (index?: number) => any;
  onFind?: () => any;
  enable?: boolean;
}

const quickOpenShort = new Array(9)
  .fill(0)
  .map((_, index) => [`Ctrl+${index + 1}`, `Cmd+${index + 1}`])
  .flat();

export default function useShortcutLogic(
  options: UseShortcutLogicOptions = {},
) {
  const { onMainAction, onFind, enable = true } = options;
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
}
