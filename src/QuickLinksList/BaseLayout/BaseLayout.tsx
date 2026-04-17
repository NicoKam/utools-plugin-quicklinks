import type { ReactNode } from 'react';
import * as React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { randomString } from '../../utils/randomString';
import styles from './BaseLayout.module.less';

interface FooterInfo {
  id: string;
  zIndex: number;
}

interface BaseLayoutContextType {
  addFooter: (id: string, zIndex: number) => void;
  removeFooter: (id: string) => void;
  currentFooterId: string | null;
  footerElement: HTMLElement | null;
}

const BaseLayoutContext = createContext<BaseLayoutContextType | null>(null);

function useBaseLayoutContext() {
  const context = useContext(BaseLayoutContext);
  if (!context) {
    throw new Error('BaseLayout.Footer must be used within BaseLayout');
  }
  return context;
}

export interface BaseLayoutProps extends
  Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  children: ReactNode;
  footerClassName?: string;
}

interface BaseLayoutComponent extends React.FC<BaseLayoutProps> {
  Footer: React.FC<FooterProps>;
  Splitter: React.FC<SplitterProps>;
}

const BaseLayout: BaseLayoutComponent = (props) => {
  const { className = '', children, footerClassName, ...otherProps } = props;
  const [footerElement, setFooterElement] = useState<HTMLElement | null>(null);
  const [footerInfo, setFooterInfo] = useState<FooterInfo[]>([]);

  const addFooter = useCallback((id: string, zIndex: number) => {
    setFooterInfo((current) => [...current.filter(item => item.id !== id), { id, zIndex }].sort((a, b) => a.zIndex - b.zIndex));
  }, []);

  const removeFooter = useCallback((id: string) => {
    setFooterInfo(current => current.filter(item => item.id !== id));
  }, []);

  const currentFooterId = footerInfo.at(-1)?.id ?? null;

  const contextValue = useMemo(() => ({
    addFooter,
    removeFooter,
    currentFooterId,
    footerElement,
  }), [currentFooterId, footerElement]);

  return (
    <BaseLayoutContext.Provider value={contextValue}>
      <div className={`${styles.root} ${className}`} {...otherProps}>
        <div className={styles.content}>
          {children}
        </div>
        <div ref={setFooterElement} className={`${styles.footer} ${footerClassName}`} />
      </div>
    </BaseLayoutContext.Provider>
  );
};

export interface FooterProps {
  children: ReactNode;
  zIndex?: number;
}

const Footer: React.FC<FooterProps> = ({ children, zIndex = 0 }) => {
  const { addFooter, removeFooter, currentFooterId, footerElement } = useBaseLayoutContext();
  const footerIdRef = useRef(`footer_${randomString(12)}`);

  useEffect(() => {
    const footerId = footerIdRef.current;
    addFooter(footerId, zIndex);

    return () => {
      removeFooter(footerId);
    };
  }, [addFooter, removeFooter, zIndex]);

  if (!footerElement || currentFooterId !== footerIdRef.current) {
    return null;
  }

  return createPortal(
    <div className={styles.footerContent}>
      {children}
    </div>,
    footerElement,
  );
};

export interface SplitterProps extends React.HTMLAttributes<HTMLDivElement> {}

const Splitter: React.FC<SplitterProps> = ({ className = '', ...otherProps }) => {
  return <div className={`${styles.splitter} ${className}`} {...otherProps} />;
};

BaseLayout.Footer = Footer;
BaseLayout.Splitter = Splitter;

export default BaseLayout;
