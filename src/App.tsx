import { ConfigProvider, theme } from 'antd';
import { HoxRoot } from 'hox';
import { useEffect, useState } from 'react';
import QuickLinksList from './QuickLinksList';
import Read from './Read';
import useDarkThemeMode from './utils/useDarkThemeMode';

const { darkAlgorithm } = theme;

export function AppContent() {
  const [enterAction, setEnterAction] = useState({});
  const [route, setRoute] = useState('quicklinks');

  useEffect(() => {
    window.utools?.onPluginEnter((action) => {
      setRoute(action.code);
      setEnterAction(action);
    });
    window.utools?.onPluginOut((isKill) => {
      setRoute('');
    });
  }, []);

  if (route === 'quicklinks') {
    return <QuickLinksList />;
  }

  if (route === 'read') {
    return <Read enterAction={enterAction} />;
  }

  return <>{null}</>;
}

export default function App() {
  const darkMode = useDarkThemeMode();
  return (
    <ConfigProvider
      theme={{
        algorithm: darkMode ? darkAlgorithm : undefined,
      }}
    >
      <HoxRoot>
        <AppContent />
      </HoxRoot>
    </ConfigProvider>
  );
}
