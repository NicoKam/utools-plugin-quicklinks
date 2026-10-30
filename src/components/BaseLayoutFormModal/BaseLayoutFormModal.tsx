import type { FormProps } from 'antd';
import type { Store } from 'antd/es/form/interface';
import type { BaseLayoutModalProps } from '../BaseLayoutModal';
import { Form, message } from 'antd';
import { useRef } from 'react';
import { CmdKey } from '../../QuickLinksList/const';
import { normalizeHotkey } from '../../utils/shortcut';
import BaseLayoutModal from '../BaseLayoutModal';

export interface BaseLayoutFormModalProps<T> extends Omit<BaseLayoutModalProps, 'onOk'> {
  formProps?: FormProps;
  form?: FormProps['form'];
  onOk?: (values: T) => void;
  initialValues?: T;
}

function BaseLayoutFormModal<T extends Store = any>(props: BaseLayoutFormModalProps<T>) {
  const { onOk, formProps, children, form: formFromProps, initialValues, ...otherProps } = props;

  const [form] = Form.useForm<T>(formFromProps);
  const submittingRef = useRef(false);

  const handleOk = () => {
    if (submittingRef.current)
      return;
    submittingRef.current = true;
    form.validateFields().then((result) => {
      onOk?.(result);
    }, (error) => {
      if (error.outOfDate) {
        message.info('内容已更新，请再次保存');
        return;
      }
      const field = error.errorFields?.find((field: { errors: string[] }) => field.errors.length);
      if (field)
        form.scrollToField(field.name, { block: 'nearest', focus: true });
      message.error(field?.errors[0] || '请检查表单内容后重试');
    }).finally(() => {
      submittingRef.current = false;
    });
  };

  return (
    <BaseLayoutModal
      {...otherProps}
      onOk={handleOk}
      cancelShortcuts={otherProps.cancelShortcuts ?? 'Esc'}
      okShortcuts={otherProps.okShortcuts ?? `${CmdKey}+Enter`}
    >
      <Form
        form={form}
        initialValues={initialValues}
        labelCol={{ span: 3 }}
        {...formProps}
        onKeyDown={(e) => {
          switch (normalizeHotkey(e.nativeEvent)?.join('+')) {
            case `${CmdKey}+Enter`:
              e.preventDefault();
              e.stopPropagation();
              handleOk();
              break;
            default:
              break;
          }
        }}
      >
        {children}
      </Form>
    </BaseLayoutModal>
  );
}

export default BaseLayoutFormModal;
