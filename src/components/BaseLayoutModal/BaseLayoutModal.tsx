import type { ReactNode } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import cn from 'classnames';
import * as React from 'react';
import { useRef } from 'react';
import BaseLayout from '../../QuickLinksList/BaseLayout';
import { useShortCutListener } from '../../utils/shortcut';
import ButtonWithIcon from '../ButtonWithIcon';
import styles from './BaseLayoutModal.module.less';

const ef = () => undefined;

export interface BaseLayoutModalProps extends
  Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'title'> {
  open?: boolean;
  title?: ReactNode;
  onOk?: () => void;
  onCancel?: () => void;
  okText?: ReactNode;
  okIcon?: ReactNode;
  okShortcuts?: string | string[];
  cancelText?: ReactNode;
  cancelIcon?: ReactNode;
  cancelShortcuts?: string | string[];
  footerZIndex?: number;
  extraLeftFooter?: ReactNode;
  extraRightFooter?: ReactNode;
}

function BaseLayoutModal(props: BaseLayoutModalProps) {
  const {
    className = '',
    open,
    title,
    onOk = ef,
    onCancel = ef,
    okText,
    okIcon,
    okShortcuts,
    cancelText,
    cancelIcon,
    cancelShortcuts,
    footerZIndex = 1,
    extraLeftFooter,
    extraRightFooter,
    children,
    ...otherProps
  } = props;

  const rootRef = useRef<HTMLDivElement>(null);

  useShortCutListener('Escape', (e) => {
    e.stopPropagation();
    onCancel();
  }, {
    target: rootRef,
  });

  const hasFooter = Boolean(extraLeftFooter || extraRightFooter || cancelText || okText);

  return (
    <>
      <div
        className={cn(styles.backdrop, { [styles.open]: open })}
        onClick={() => {
          onCancel();
        }}
      />
      <div tabIndex={-1} ref={rootRef} className={cn(styles.root, className, { [styles.open]: open })} {...otherProps}>
        <div className={styles.header}>
          <div className={styles.title}>
            {title}
          </div>
          <div
            className={styles.close}
            onClick={() => {
              onCancel();
            }}
          >
            <Button color="default" variant="text" icon={<CloseOutlined />} />
          </div>
        </div>
        <div className={styles.body}>
          {children}
        </div>
      </div>
      {open && hasFooter && (
        <BaseLayout.Footer zIndex={footerZIndex}>
          {extraLeftFooter}
          <BaseLayout.Splitter />
          {extraRightFooter}
          {cancelText && (
            <ButtonWithIcon icon={cancelIcon} shortcuts={cancelShortcuts} onClick={onCancel}>
              {cancelText}
            </ButtonWithIcon>
          )}
          {okText && (
            <ButtonWithIcon icon={okIcon} shortcuts={okShortcuts} onClick={onOk}>
              {okText}
            </ButtonWithIcon>
          )}
        </BaseLayout.Footer>
      )}
    </>
  );
}

export default BaseLayoutModal;
