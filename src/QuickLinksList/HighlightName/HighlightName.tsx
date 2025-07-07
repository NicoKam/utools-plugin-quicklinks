import React, { useMemo } from 'react';
import styles from './HighlightName.module.less';
import { IMatch } from '../../utils/vscode-utils/filters';

export interface HighlightNameProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  value?: string;
  match?: (IMatch)[] | boolean;
}

// ... existing code ...
const HighlightName = (props: HighlightNameProps) => {
  const { className = '', value, match, ...otherProps } = props;

  const content = useMemo(() => {
    if (value && Array.isArray(match) && match.length > 0) {
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;

      match.forEach((m, i) => {
        if (m.start > lastIndex) {
          parts.push(value.substring(lastIndex, m.start));
        }
        parts.push(
          <span key={i} className={styles.highlight}>
            {value.substring(m.start, m.end)}
          </span>,
        );
        lastIndex = m.end;
      });

      if (lastIndex < value.length) {
        parts.push(value.substring(lastIndex));
      }
      return parts;
    }
    return value;
  }, [value, match]);


  return (
    <div className={`${styles.root} ${className}`} {...otherProps}>
      {content}
    </div>
  );
};

export default HighlightName;
