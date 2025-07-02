import { useState, useMemo, useEffect } from 'react';
import { useMemoizedFn, useUpdateEffect } from 'ahooks';
import { useEventListener } from 'ahooks';

/**
 * @description `useSelectIndex` 的选项
 */
export interface UseSelectIndexOptions {
  /**
   * @description 默认选中的索引
   * @default 0
   */
  defaultSelectIndex?: number;
  /**
   * @description 最大长度
   * @default 0
   */
  maxLength?: number;
  /**
   * @description 是否循环
   * @default false
   */
  loop?: boolean;

  /**
   * @description 当 `maxLength` 变化时，是否重置选中索引
   * @default true
   */
  resetOnMaxLengthChange?: boolean;
}

/**
 * @description 管理选中项的 Hook
 * @param options `UseSelectIndexOptions`
 * @returns `[selectedIndex, actions]`
 */
export default function useSelectIndex(options: UseSelectIndexOptions) {
  const { defaultSelectIndex = 0, maxLength = 0, loop = true, resetOnMaxLengthChange = true } = options;

  const getConstrainedIndex = useMemoizedFn((index: number) => {
    if (maxLength < 0) {
      return 0;
    }
    return Math.max(0, Math.min(index, maxLength - 1));
  });

  const [selectedIndex, setSelectedIndex] = useState(() => getConstrainedIndex(defaultSelectIndex));

  const constrainedSelectedIndex = getConstrainedIndex(selectedIndex);

  useUpdateEffect(() => {
    if(resetOnMaxLengthChange) {
      setSelectedIndex(getConstrainedIndex(defaultSelectIndex));
    }
  }, [maxLength]);

  /**
   * @description 索引加一
   */
  const increment = useMemoizedFn(() => {
    if (maxLength <= 0) return;
    setSelectedIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      if (nextIndex >= maxLength && loop) {
        return 0;
      }
      return getConstrainedIndex(nextIndex);
    });
  });

  /**
   * @description 索引减一
   */
  const decrement = useMemoizedFn(() => {
    if (maxLength <= 0) return;
    setSelectedIndex((prevIndex) => {
      const nextIndex = prevIndex - 1;
      if (nextIndex < 0 && loop) {
        return getConstrainedIndex(maxLength - 1);
      }
      return getConstrainedIndex(nextIndex);
    });
  });

  /**
   * @description 设置索引
   * @param index 要设置的索引
   */
  const set = useMemoizedFn((index: number) => {
    setSelectedIndex(getConstrainedIndex(index));
  });

  const actions = useMemo(() => ({ increment, decrement, set }), []);

  return [constrainedSelectedIndex, actions] as const;
}

export function useSelectIndexWithKeyboard(options: UseSelectIndexOptions) {
  const [selectedIndex, actions] = useSelectIndex(options);

  // 监听键盘事件，根据上下箭头键来增减索引
  useEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      actions.increment();
    } else if (e.key === 'ArrowUp') {
      actions.decrement();
    }
  });

  return [selectedIndex, actions] as const;
}
