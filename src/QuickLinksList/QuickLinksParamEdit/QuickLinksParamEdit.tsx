import type { BaseLayoutModalProps } from '../../components/BaseLayoutModal';
import { EnterOutlined } from '@ant-design/icons';
import { useControllableValue, useDebounce } from 'ahooks';
import * as React from 'react';
import { useState } from 'react';
import BaseLayoutModal from '../../components/BaseLayoutModal';
import EditableDiv from '../../components/EditableDiv';
import styles from './QuickLinksParamEdit.module.less';

const emptyObj = {} as never;

export interface QuickLinksParamEditProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'onChange'> {
  template?: string;
  value?: Record<string, string>;
  onChange?: (params: Record<string, string>, value: string) => void;
}

export const PARAM_REGEX = /\{([^}]+)\}/g;

export const hasParams = (template: string) => /\{[^}]+\}/.test(template);

export const replaceParams = (template: string, params: Record<string, string>) => template.replace(PARAM_REGEX, (match, name) => params[name] || '');

function QuickLinksParamEdit(props: QuickLinksParamEditProps) {
  const { template = '', value: propsValue, className, onChange, ...otherProps } = props;

  const [value = emptyObj, setValue] = useControllableValue<Record<string, string>>(props);

  const handleParamChange = (paramName: string, newValue: string) => {
    const newParams = { ...value, [paramName]: newValue };
    const newString = replaceParams(template, newParams);
    setValue(newParams, newString);
  };

  const parts = template.split(PARAM_REGEX);

  return (
    <span className={`${styles.root} ${className}`} {...otherProps}>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const paramName = part;
          const paramValue = value[paramName];
          return (
            <EditableDiv
              key={i}
              editing
              placeholder={`{${paramName}}`}
              className={`${styles.param}`}
              value={paramValue}
              stopPropagationWhenEditing={false}
              onChange={(newValue) => {
                handleParamChange(paramName, newValue);
              }}
              triggerOnInput
            />
          );
        }

        // 返回字符串本身
        return part;
      })}
    </span>
  );
}

export default QuickLinksParamEdit;

export interface QuickLinksParamEditModalProps extends Omit<BaseLayoutModalProps, 'onOk'> {
  template?: string;
  onOk?: (value: string) => void;
}

export function QuickLinksParamEditModal(props: QuickLinksParamEditModalProps) {
  const { template, open, onOk, ...otherProps } = props;

  const delayOpen = useDebounce(open);

  const [params, setParams] = useState({});
  const handleOk = () => {
    if (template) {
      const links = replaceParams(template, params);
      onOk?.(links);
    } else {
      onOk?.('');
    }
  };

  return (
    <BaseLayoutModal
      {...otherProps}
      open={open}
      onOk={handleOk}
      okText="打开链接"
      okIcon={<EnterOutlined />}
      okShortcuts="Enter"
    >
      <div className={styles.modalContent}>
        <div className={styles.quickLinkParamEdit}>
          {template && (open || delayOpen) && (
            <QuickLinksParamEdit
              key={`${template}_${open}`}
              template={template}
              autoFocus={false}
              onChange={setParams}
            />
          )}
        </div>

        <span className={styles.tips}>请补充链接参数，使用 Tab 切换多个参数。按下 Enter 打开链接</span>
      </div>
    </BaseLayoutModal>
  );
}
