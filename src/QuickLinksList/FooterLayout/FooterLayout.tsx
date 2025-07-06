import React, { createContext, useContext, useRef, ReactNode, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './FooterLayout.module.less';

// Context 类型定义
interface FooterContextType {
  leftElement: HTMLElement | null;
  rightElement: HTMLElement | null;
}

// 创建 Context
const FooterContext = createContext<FooterContextType | null>(null);

// Context Hook
const useFooterContext = () => {
  const context = useContext(FooterContext);
  if (!context) {
    throw new Error('FooterLayout.Footer must be used within FooterLayout');
  }
  return context;
};

export interface FooterLayoutProps extends
  Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  children: ReactNode;

  footerClassName?: string;
}

const FooterLayout = (props: FooterLayoutProps) => {
  const { className = '', children, footerClassName, ...otherProps } = props;
  const [leftElement, setLeftElement] = useState<HTMLElement | null>(null);
  const [rightElement, setRightElement] = useState<HTMLElement | null>(null);


  return (
    <FooterContext.Provider value={{ leftElement, rightElement }}>
      <div className={`${styles.root} ${className}`} {...otherProps}>
        <div className={styles.content}>
          {children}
        </div>
        <div className={`${styles.footer} ${footerClassName}`}>
          <div ref={setLeftElement} className={styles.footerLeft} />
          <div ref={setRightElement} className={styles.footerRight} />
        </div>
      </div>
    </FooterContext.Provider>
  );
};

// Footer 子组件接口
export interface FooterProps {
  children: ReactNode;
  position?: 'left' | 'right';
}

// Footer 子组件
const Footer: React.FC<FooterProps> = ({ children, position = 'left' }) => {
  const { leftElement, rightElement } = useFooterContext();

  const targetElement = position === 'left' ? leftElement : rightElement;

  if (!targetElement) {
    return null;
  }

  return createPortal(children, targetElement);
};

// 将 Footer 作为 FooterLayout 的静态属性
FooterLayout.Footer = Footer;

export default FooterLayout;
