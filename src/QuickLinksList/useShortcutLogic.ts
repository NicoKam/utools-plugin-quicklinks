/* eslint-disable @typescript-eslint/no-explicit-any */
import { useShortCutListener } from '../utils/shortcut';
import { CmdKey } from './const';

export interface UseShortcutLogicOptions {
  onMainAction?: (index?: number) => any;
  onCopy?: () => any;
  onAdd?: () => any;
  onEdit?: () => any;
  onRemove?: () => any;
  onFind?: () => any;
}


const quickOpenShort = new Array(9).fill(0)
  .map((_, index) => [`Ctrl+${index + 1}`, `Cmd+${index + 1}`])
  .flat();


export default function useShortcutLogic(
  options: UseShortcutLogicOptions = {},
) {
  const { onMainAction, onCopy, onAdd, onEdit, onRemove, onFind } = options;
  // 快速打开的快捷键
  useShortCutListener(quickOpenShort, (e) => {
    const index = Number(e.key);
    if (index > 0 && index < 10) {
      onMainAction?.(index - 1);
    }
  });

  useShortCutListener('Enter', (e) => {
    if (e.target === document.body) onMainAction?.();
  });

  useShortCutListener(`${CmdKey}+C`, (e) => {
    if (e.target === document.body) onCopy?.();
  });

  useShortCutListener(`${CmdKey}+N`, (e) => {
    if (e.target === document.body) onAdd?.();
  });

  useShortCutListener(`${CmdKey}+E`, (e) => {
    if (e.target === document.body) onEdit?.();
  });

  useShortCutListener(`${CmdKey}+R`, (e) => {
    if (e.target === document.body) onRemove?.();
  });

  useShortCutListener(`${CmdKey}+F`, (e) => {
    if (e.target === document.body) {
      onFind?.();
    }
  });
}
