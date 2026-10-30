import type { IQuickLinksAccessData, IQuickLinksItem } from '../../storage';
import * as React from 'react';
import DateTimeDisplay from '../../components/DateTimeDisplay';
import EmptyHolder from '../../components/EmptyHolder';
import EnumDisplay from '../../components/EnumDisplay';
import { getQuickLinkDisplayName } from '../utils';
import styles from './QuickLinksDetailInfo.module.less';

export interface QuickLinksDetailInfoProps extends
  Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  data?: IQuickLinksItem;
  accessData?: IQuickLinksAccessData;
  editorName?: string;
  editorSource?: string;
}

function QuickLinksDetailInfo(props: QuickLinksDetailInfoProps) {
  const { className = '', data, accessData, editorName, editorSource, ...otherProps } = props;
  const displayName = data && getQuickLinkDisplayName(data);
  return (
    <div className={`${styles.root} ${className}`} {...otherProps}>
      <div className={styles.row}>
        <div className={styles.rowTitle}>名称</div>
        <div className={styles.rowValue} title={displayName}>{displayName}</div>
      </div>
      <div className={styles.row}>
        <div className={styles.rowTitle}>类型</div>
        <div className={styles.rowValue}>
          <EnumDisplay
            value={data?.type ?? 'link'}
            enums={[
              { value: 'link', text: '链接' },
              { value: 'snippet', text: '文本片段' },
              { value: 'code', text: '代码书签' },
            ]}
            emptyHolder={<EmptyHolder />}
          />
        </div>
      </div>
      {data?.type === 'code' && (
        <div className={styles.row}>
          <div className={styles.rowTitle}>打开编辑器</div>
          <div className={styles.rowValue} title={editorSource ? `${editorName}（${editorSource}）` : editorName}>
            {editorName}
            {editorSource && `（${editorSource}）`}
          </div>
        </div>
      )}
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
