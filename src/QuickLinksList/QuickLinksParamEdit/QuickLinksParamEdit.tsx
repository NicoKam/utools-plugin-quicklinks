import { useControllableValue, useDebounce, useSafeState } from 'ahooks';
import React, { forwardRef, useState } from 'react';
import { EnterOutlined } from '@ant-design/icons';
import EditableDiv from '../../components/EditableDiv';
import QuickLinksModal, { QuickLinksModalProps } from '../../components/QuickLinksModal';
import styles from './QuickLinksParamEdit.module.less';
import FooterLayout from '../FooterLayout';
import ButtonWithIcon from '../../components/ButtonWithIcon';

const emptyObj = {} as never;

export interface QuickLinksParamEditProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'onChange'> {
  template?: string;
  value?: Record<string, string>;
  onChange?: (params: Record<string, string>, value: string) => void;
}

export const PARAM_REGEX = /\{([^}]+)\}/g;

export const hasParams = (template: string) => /\{[^}]+\}/g.test(template);

export const replaceParams = (template: string, params: Record<string, string>) => template.replace(PARAM_REGEX, (match, name) => params[name] || '');


const QuickLinksParamEdit = (props: QuickLinksParamEditProps) => {
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
              onChange={(newValue) => { handleParamChange(paramName, newValue); }}
              triggerOnInput
            />
          );
        }

        // 返回字符串本身
        return part;
      })}
    </span>
  );
};

export default QuickLinksParamEdit;

export interface QuickLinksParamEditModalProps extends Omit<QuickLinksModalProps, 'onOk'> {
  template?: string;
  onOk?: (value: string) => void;
}


export const QuickLinksParamEditModal = (props: QuickLinksParamEditModalProps) => {
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
    <QuickLinksModal {...otherProps} open={open} onOk={handleOk}>
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
      <FooterLayout.Footer position="right">
        <ButtonWithIcon icon={<EnterOutlined />} shortcuts="Enter" onClick={handleOk}>打开链接</ButtonWithIcon>
      </FooterLayout.Footer>
    </QuickLinksModal>
  );
};
