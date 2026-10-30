export interface VisibilitySource {
  readonly visibilityState: string;
  addEventListener: (type: 'visibilitychange', listener: () => void) => void;
  removeEventListener: (type: 'visibilitychange', listener: () => void) => void;
}

export function watchDocumentVisible(source: VisibilitySource, onVisible: () => void) {
  const handleVisibilityChange = () => {
    if (source.visibilityState === 'visible')
      onVisible();
  };
  source.addEventListener('visibilitychange', handleVisibilityChange);
  return () => source.removeEventListener('visibilitychange', handleVisibilityChange);
}
