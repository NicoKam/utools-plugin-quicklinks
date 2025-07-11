import { useEffect, useState } from 'react';

export interface UseSubInputOptions {
  placeholder?: string;
  isFocus?: boolean;
}

export default function useSubInput(options: UseSubInputOptions = {}) {
  const { placeholder = '搜索', isFocus = true } = options;
  const [subInput, setSubInput] = useState('');

  useEffect(() => {
    window.utools.onPluginEnter(() => {
      window.utools?.setSubInput(({ text }) => {
        setSubInput(text);
      }, placeholder, isFocus);
    });
  }, []);

  return subInput;
}
