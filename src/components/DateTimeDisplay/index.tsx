import dayjs from 'dayjs';
import React, { ReactNode, useMemo } from 'react';
import { smartDateFromNow } from '@orca-fe/tools';

export interface DateTimeDisplayProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  value?: number;
  format?: string;
  emptyHolder?: ReactNode;
  smart?: boolean;
}

const DateTimeDisplay = (props: DateTimeDisplayProps) => {
  const { value, format = 'YYYY-MM-DD HH:mm:ss', emptyHolder = '-', className = '', smart = true, ...otherProps } = props;


  const text = useMemo(() => value ? (`${dayjs(value).format(format)}(${smartDateFromNow(value)})`) : undefined, [value, format, smart]);

  return (
    <div className={`${className}`} {...otherProps}>
      {text ?? emptyHolder}
    </div>
  );
};

export default DateTimeDisplay;
