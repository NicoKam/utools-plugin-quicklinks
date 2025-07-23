import { useDocumentVisibility, useMemoizedFn } from 'ahooks';
import { useEffect, useState } from 'react';

export interface UseSubInputOptions {
  placeholder?: string;
  isFocus?: boolean;
}

export default function useSubInput(options: UseSubInputOptions = {}) {
  const { placeholder = '搜索', isFocus = true } = options;
  const [subInput, setSubInput] = useState('');

  const isVisible = useDocumentVisibility();

  const connectSubInput = useMemoizedFn((clear = false) => {
    if (clear) {
      setSubInput('');
    }
    window.utools?.setSubInput(({ text }) => {
      setSubInput(text);
    }, placeholder, isFocus);
    if (!clear) {
      window.utools?.setSubInputValue(subInput);
    }
  });

  const disconnectSubInput = useMemoizedFn(() => {
    setSubInput('');
  });

  useEffect(() => {
    connectSubInput(true);
    window.utools.onPluginEnter(() => {
      connectSubInput(true);
    });
    window.utools.onPluginOut(() => {
      disconnectSubInput();
    });
  }, []);

  useEffect(() => {
    if (isVisible) {
      connectSubInput(true);
    }
  }, [isVisible]);

  return [subInput, { connectSubInput, disconnectSubInput }] as const;
}
