import { usePromisifyModal } from '@orca-fe/hooks';
import { createGlobalStore } from 'hox';

export const [useGlobalModal] = createGlobalStore(() => usePromisifyModal());

export const GlobalModalInstance = () => {
  const modal = useGlobalModal();
  // eslint-disable-next-line react/react-in-jsx-scope
  return <>{modal.instance}</>;
};
