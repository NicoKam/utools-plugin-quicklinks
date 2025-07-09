import React, { useMemo } from 'react';
import styles from './HighlightName.module.less';
import { MatchStatus } from '../../utils/stringMatch';

export interface HighlightNameProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  value?: string;
  match?: MatchStatus[] | boolean;
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
            {value.substring(m.start, m.end + 1)}
          </span>,
        );
        lastIndex = m.end + 1;
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
