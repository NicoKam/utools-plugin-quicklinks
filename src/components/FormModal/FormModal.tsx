/* eslint-disable @typescript-eslint/no-explicit-any */
import { Form, FormProps, Modal, ModalProps } from 'antd';
import { Store } from 'antd/es/form/interface';
import { CmdKey } from '../../QuickLinksList/const';
import { normalizeHotkey } from '../../utils/shortcut';

export interface FormModalProps<T> extends Omit<ModalProps, 'onOk'> {
  formProps?: FormProps;
  form?: FormProps['form'];
  onOk?: (values: T) => void;
  initialValues?: T;
}

const FormModal = <T extends Store = any>(props: FormModalProps<T>) => {
  const { onOk, formProps, children, form: formFromProps, initialValues, ...otherProps } = props;

  const [form] = Form.useForm<T>(formFromProps);

  const handleOk = () => {
    form.validateFields().then((result) => {
      onOk?.(result);
    });
  };

  return (
    <Modal {...otherProps} onOk={handleOk}>
      <Form form={form} initialValues={initialValues} labelCol={{ span: 3 }} {...formProps} onKeyDown={(e) => {
        switch (normalizeHotkey(e.nativeEvent)?.join('+')) {
          case CmdKey + '+Enter':
            handleOk();
            break;
          default:
            break;
        }
      }}>
        {children}
      </Form>
    </Modal>
  );
};

export default FormModal;
