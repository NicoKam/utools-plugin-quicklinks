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

  const connectSubInput = useMemoizedFn(() => {
    setSubInput('');
    window.utools?.setSubInput(({ text }) => {
      setSubInput(text);
    }, placeholder, isFocus);
  });

  const disconnectSubInput = useMemoizedFn(() => {
    setSubInput('');
  });

  useEffect(() => {
    connectSubInput();
    window.utools.onPluginEnter(() => {
      connectSubInput();
    });
    window.utools.onPluginOut(() => {
      disconnectSubInput();
    });
  }, []);

  useEffect(() => {
    if (isVisible) {
      connectSubInput();
    }
  }, [isVisible]);

  return subInput;
}
