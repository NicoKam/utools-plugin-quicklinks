import { Button, ButtonProps } from 'antd';
import React, { ReactNode } from 'react';
import { useShortCutListener } from '../../utils/shortcut';
import styles from './ButtonWithIcon.module.less';

export interface ButtonWithIconProps extends Omit<ButtonProps, 'icon'> {

  /** 图标或快捷键文本 */
  icon?: ReactNode;

  /** 快捷键字符串或数组，用于触发按钮点击 */
  shortcuts?: string | string[];

}

const ButtonWithIcon = (props: ButtonWithIconProps) => {
  const {
    icon,
    shortcuts = '',
    className = '',
    onClick,
    ...restProps
  } = props;

  // 快捷键监听
  useShortCutListener(
    shortcuts,
    () => {
      // 直接调用 onClick，不传递事件参数
      onClick?.({} as React.MouseEvent<HTMLElement>);
    },
    { enable: typeof shortcuts === 'string' ? shortcuts.length > 0 : Array.isArray(shortcuts) && shortcuts.length > 0 }
  );

  // 如果没有传入 icon，但有 shortcuts，则显示第一个快捷键
  const displayIcon = icon || (shortcuts.length > 0 ? shortcuts[0] : null);

  return (
    <Button
      className={`${styles.root} ${className}`}
      color="default"
      variant="text"
      iconPosition="end"
      icon={displayIcon ? <div className={styles.icon}>{displayIcon}</div> : null}
      onClick={onClick}
      {...restProps}
    />
  );
};

export default ButtonWithIcon;
