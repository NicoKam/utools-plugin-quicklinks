import React, { useState, useEffect } from 'react';
import styles from './QuickLinksParamEdit.module.less';
import EditableDiv from '../../components/EditableDiv';

export interface QuickLinksParamEditProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'onChange'> {
  template?: string;
  value?: Record<string, string>;
  onChange?: (value: string, params: Record<string, string>) => void;
}

const PARAM_REGEX = /\{([^}]+)\}/g;

const QuickLinksParamEdit = (props: QuickLinksParamEditProps) => {
  const { template = '', value: propsValue, onChange, className, ...otherProps } = props;
  const [params, setParams] = useState<Record<string, string>>(propsValue || {});

  useEffect(() => {
    setParams(propsValue || {});
  }, [propsValue]);

  const handleParamChange = (paramName: string, newValue: string) => {
    const newParams = { ...params, [paramName]: newValue };
    setParams(newParams);

    if (onChange) {
      const newString = template.replace(PARAM_REGEX, (match, name) => newParams[name] || match);
      onChange(newString, newParams);
    }
  };

  const parts = template.split(PARAM_REGEX);
  console.log('wkn-parts', parts);

  return (
    <span className={`${styles.root} ${className}`} {...otherProps}>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const paramName = part;
          const paramValue = params[paramName];
          return (
            <EditableDiv
              key={i}
              editing
              placeholder={`{${paramName}}`}
              className={`${styles.param}`}
              value={paramValue}
              onChange={(newValue) => { handleParamChange(paramName, newValue); }}
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
