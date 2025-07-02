import { useState, useEffect } from 'react';

export default function useDarkThemeMode() {
  // 状态管理当前主题
  const [darkMode, setDarkMode] = useState(false);

  // 检测系统主题偏好
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // 设置初始主题
    setDarkMode(mediaQuery.matches);

    // 监听系统主题变化
    const handleThemeChange = (e) => {
      setDarkMode(e.matches);
    };

    // 添加监听器
    mediaQuery.addEventListener('change', handleThemeChange);

    // 清理监听器
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, []);

  return darkMode;
}
