import { usePromisifyModal } from '@orca-fe/hooks';
import { createGlobalStore } from 'hox';
import { useEffect } from 'react';

export const [useGlobalModal] = createGlobalStore(() => usePromisifyModal());

export function GlobalModalInstance() {
  const modal = useGlobalModal();

  useEffect(() => {
    window.utools?.onPluginOut(() => {
      modal.destroy();
    });
  }, [modal]);
  return <>{modal.instance}</>;
}
