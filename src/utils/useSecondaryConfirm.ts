import { useDebounceFn, useMemoizedFn } from 'ahooks';
import { useState } from 'react';

export default function useSecondaryConfirm(wait = 2000) {
  const [isConfirm, setIsConfirm] = useState(false);

  const cancelConfirm = useDebounceFn(() => {
    setIsConfirm(false);
  }, { wait });

  const confirm = useMemoizedFn(() => {
    setIsConfirm(v => !v);
    cancelConfirm.run();
    return isConfirm;
  });

  return {
    isConfirm,
    confirm,
    cancelConfirm: cancelConfirm.flush,
  };
}
