import React from 'react';
import styles from './QuickLinksFooter.module.less';

export interface QuickLinksFooterProps extends
  Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {

}

const QuickLinksFooter = (props: QuickLinksFooterProps) => {
  const { className = '', ...otherProps } = props;
  return (
    <div className={`${styles.root} ${className}`} {...otherProps}>

    </div>
  );
};

export default QuickLinksFooter;
