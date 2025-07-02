/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ReactNode, useMemo } from 'react';

export interface EnumDisplayProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  value?: any;
  enums?: { value: any; text: ReactNode }[];
  emptyHolder?: ReactNode;
}

const EnumDisplay = (props: EnumDisplayProps) => {
  const { value, enums = [], emptyHolder = '-', className = '', ...otherProps } = props;

  const target = useMemo(() => enums.find(item => item.value === value), [enums, value]);

  const text = target ? target.text : emptyHolder;

  return (
    <div className={`${className}`} {...otherProps}>
      {text}
    </div>
  );
};

export default EnumDisplay;
