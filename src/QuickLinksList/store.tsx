import { usePromisifyModal } from '@orca-fe/hooks';
import { createGlobalStore } from 'hox';
import { useEffect } from 'react';

export const [useGlobalModal] = createGlobalStore(() => usePromisifyModal());

export const GlobalModalInstance = () => {
  const modal = useGlobalModal();

  useEffect(() => {
    window.utools?.onPluginOut(() => {
      modal.destroy();
    });
  }, [modal]);
  // eslint-disable-next-line react/react-in-jsx-scope
  return <>{modal.instance}</>;
};
