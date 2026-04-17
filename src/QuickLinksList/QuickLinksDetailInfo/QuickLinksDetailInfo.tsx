import type { IQuickLinksAccessData, IQuickLinksItem } from '../../storage';
import * as React from 'react';
import DateTimeDisplay from '../../components/DateTimeDisplay';
import EmptyHolder from '../../components/EmptyHolder';
import EnumDisplay from '../../components/EnumDisplay';
import styles from './QuickLinksDetailInfo.module.less';

export interface QuickLinksDetailInfoProps extends
  Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  data?: IQuickLinksItem;
  accessData?: IQuickLinksAccessData;
}

function QuickLinksDetailInfo(props: QuickLinksDetailInfoProps) {
  const { className = '', data, accessData, ...otherProps } = props;
  return (
    <div className={`${styles.root} ${className}`} {...otherProps}>
      <div className={styles.row}>
        <div className={styles.rowTitle}>脚本名称</div>
        <div className={styles.rowValue}>{data?.name}</div>
      </div>
      <div className={styles.row}>
        <div className={styles.rowTitle}>类型</div>
        <div className={styles.rowValue}>
          <EnumDisplay
            value={data?.type}
            enums={[
              { value: 'link', text: '链接' },
              { value: 'snippet', text: '文本片段' },
            ]}
            emptyHolder={<EmptyHolder />}
          />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.rowTitle}>最近使用时间</div>
        <div className={styles.rowValue}>
          <DateTimeDisplay value={accessData?.lastAccessTime} emptyHolder={<EmptyHolder />} />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.rowTitle}>使用次数</div>
        <div className={styles.rowValue}>{accessData?.accessCount}</div>
      </div>
      <div className={styles.row}>
        <div className={styles.rowTitle}>更新时间</div>
        <div className={styles.rowValue}>
          <DateTimeDisplay value={accessData?.updateTime} emptyHolder={<EmptyHolder />} />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.rowTitle}>创建时间</div>
        <div className={styles.rowValue}>
          <DateTimeDisplay value={accessData?.createTime} emptyHolder={<EmptyHolder />} />
        </div>
      </div>
    </div>
  );
}

export default QuickLinksDetailInfo;
