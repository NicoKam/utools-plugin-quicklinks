import React, { useMemo } from 'react';
import { useSelectIndexWithKeyboard } from '../utils/useSelectIndex';
import useSubInput from '../utils/useSubInput';
import { matchesFuzzy2 } from '../utils/vscode-utils/filters';
import styles from './QuickLinksList.module.less';
import { useUpdateEffect } from 'ahooks';
import { IQuickLinksItem } from './types';

// TODO data的获取
const data: IQuickLinksItem[] = [];

export interface QuickLinksListProps extends
  Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {

}

const QuickLinksList = (props: QuickLinksListProps) => {
  const { className = '', ...otherProps } = props;

  const subInput = useSubInput();

  const filteredData = useMemo(() => {
    if (subInput) {
      return data.filter(({ name }) => {
        // return name.includes(subInput);
        const match = matchesFuzzy2(subInput, name);
        if (match) {
          return true;
        }
        return false;
      })
    }
    return data;
  }, [subInput]);

  const [selectedIndex, actions] = useSelectIndexWithKeyboard({ maxLength: filteredData.length });

  useUpdateEffect(() => {
    if (selectedIndex >= 0) {
      const dom = document.querySelector(`.${styles.item}_${selectedIndex}`);
      if (dom) {
        dom.scrollIntoView({
          block: 'nearest',
        })
      }
    }
  }, [selectedIndex]);

  return (
    <div className={`${styles.root} ${className}`} {...otherProps}>
      <div className={styles.list}>
        {filteredData.length === 0 && (
          <div className={styles.empty}>
            没有找到内容，请调整关键字
          </div>
        )}
        {
          filteredData.map((item, index) => {
            return (
              <div
                className={`${styles.item} ${styles.item}_${index} ${selectedIndex === index ? styles.selected : ''}`}
                key={item.name}
                onClick={() => actions.set(index)}
              >
                <div className={styles.name}>{item.name}</div>
                <div className={styles.tips} title={item.link}>{item.link}</div>
              </div>
            );
          })
        }
      </div>

      <div className={styles.detail}>
        <div className={styles.preview}>

        </div>
        
        <div className={styles.info}>

        </div>
      </div>
    </div>
  );
};

export default QuickLinksList;
