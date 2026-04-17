import type { FormProps } from 'antd';
import type { Store } from 'antd/es/form/interface';
import type { BaseLayoutModalProps } from '../BaseLayoutModal';
import { Form } from 'antd';
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

  const handleOk = () => {
    form.validateFields().then((result) => {
      onOk?.(result);
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
