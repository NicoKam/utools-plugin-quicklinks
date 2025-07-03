import React from 'react';
import styles from './EmptyHolder.module.less';

export interface EmptyHolderProps extends
  Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {

}

const EmptyHolder = (props: EmptyHolderProps) => {
  const { className = '', children = '--', ...otherProps } = props;
  return (
    <div className={`${styles.root} ${className}`} {...otherProps}>
      {children}
    </div>
  );
};

export default EmptyHolder;
