import { ConfigProvider, theme } from 'antd';
import { HoxRoot } from 'hox';
import { useEffect, useState } from 'react';
import QuickLinksList from './QuickLinksList';
import useDarkThemeMode from './utils/useDarkThemeMode';

const { darkAlgorithm } = theme;

export function AppContent() {
  const [route, setRoute] = useState('quicklinks');

  useEffect(() => {
    window.utools?.onPluginEnter((action) => {
      setRoute(action.code);
    });
    window.utools?.onPluginOut(() => {
      setRoute('');
    });
  }, []);

  if (route === 'quicklinks') {
    return <QuickLinksList />;
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
