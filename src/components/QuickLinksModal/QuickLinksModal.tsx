import { CloseOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import cn from 'classnames';
import React, { ReactNode, useRef } from 'react';
import { useShortCutListener } from '../../utils/shortcut';
import styles from './QuickLinksModal.module.less';

const ef = () => undefined;

export interface QuickLinksModalProps extends
  Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'title'> {
  open?: boolean;
  title?: ReactNode;
  onOk?: () => void;
  onCancel?: () => void;
}

const QuickLinksModal = (props: QuickLinksModalProps) => {
  const { className = '', open, title, onOk = ef, onCancel = ef, children, ...otherProps } = props;

  const rootRef = useRef<HTMLDivElement>(null);
  useShortCutListener('Escape', (e) => {
    e.stopPropagation();
    onCancel();
  }, {
    target: rootRef,
  });

  return (
    <>
      <div className={cn(styles.backdrop, { [styles.open]: open })} onClick={() => { onCancel(); }} />
      <div tabIndex={-1} ref={rootRef} className={cn(styles.root, className, { [styles.open]: open })} {...otherProps}>
        <div className={styles.header}>
          <div className={styles.title}>
            {title}
          </div>
          <div className={styles.close} onClick={() => { onCancel(); }}>
            <Button color="default" variant="text" icon={<CloseOutlined />} />
          </div>
        </div>
        <div className={styles.body}>
          {children}
        </div>
      </div>
    </>
  );
};

export default QuickLinksModal;
