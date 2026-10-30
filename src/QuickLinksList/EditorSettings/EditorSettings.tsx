import type { BaseLayoutFormModalProps } from '../../components/BaseLayoutFormModal';
import type { ForegroundApp, EditorSettings as Settings } from '../../editorSettings';
import { DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Form, Input, Popconfirm, Select, Typography } from 'antd';
import cn from 'classnames';
import { validateTemplate } from '../../../shared/command-template.mjs';
import BaseLayoutFormModal from '../../components/BaseLayoutFormModal';
import { defaultEditorSettings } from '../../editorSettings';
import { randomString } from '../../utils/randomString';
import styles from './EditorSettings.module.less';

export interface EditorSettingsProps extends Omit<BaseLayoutFormModalProps<Settings>, 'initialValues'> {
  settings: Settings;
  foregroundApp?: ForegroundApp | null;
}

function EditorSettings(props: EditorSettingsProps) {
  const { settings, foregroundApp, className = '', ...otherProps } = props;
  const [form] = Form.useForm<Settings>();
  const editors = Form.useWatch('editors', form) ?? settings.editors;

  return (
    <BaseLayoutFormModal
      {...otherProps}
      className={cn(styles.root, className)}
      title="全局设置"
      okText="保存"
      cancelText="取消"
      form={form}
      initialValues={{ ...settings, followFrontEditor: settings.followFrontEditor ?? true }}
      formProps={{ layout: 'vertical', labelCol: undefined, style: { maxWidth: 800, margin: 'auto' } }}
    >
      <Form.Item
        name="defaultEditor"
        label="全局默认编辑器"
        rules={[{ required: true, message: '请选择全局默认编辑器' }]}
      >
        <Select autoFocus options={editors.map(tool => ({ value: tool.id, label: tool.name || '未命名编辑器' }))} />
      </Form.Item>
      <Form.Item name="followFrontEditor" valuePropName="checked" extra="勾选后，从 Zed、VS Code 等编辑器唤起时，使用该编辑器打开。书签单独指定的编辑器优先；识别不到时使用全局默认编辑器。">
        <Checkbox>根据前台应用自动打开</Checkbox>
      </Form.Item>
      <Alert
        className={styles.detection}
        type={foregroundApp ? 'success' : 'warning'}
        showIcon
        message={foregroundApp
          ? `本次识别：${foregroundApp.name}${foregroundApp.bundleId ? `（${foregroundApp.bundleId}）` : ''}`
          : '本次未识别到前台应用，将使用全局默认编辑器'}
      />
      <Typography.Paragraph type="secondary">
        代码书签选择「使用全局设置」时，按以上规则选择编辑器。可修改预置编辑器的命令，也可添加自定义编辑器。
      </Typography.Paragraph>
      <div className={styles.actions}>
        <Popconfirm
          title="恢复默认编辑器设置？"
          description="当前编辑器配置和自定义编辑器将被默认值替换，点击保存后生效。"
          okText="恢复"
          cancelText="取消"
          onConfirm={() => form.setFieldsValue(defaultEditorSettings())}
        >
          <Button icon={<ReloadOutlined />}>恢复默认</Button>
        </Popconfirm>
      </div>
      <Form.List
        name="editors"
        rules={[{
          validator: async (_, tools) => {
            if (!tools?.length)
              throw new Error('请至少保留一个编辑器');
          },
        }]}
      >
        {(fields, { add, remove }, { errors }) => (
          <>
            {fields.map(({ key, name, ...field }) => (
              <div className={styles.editor} key={key}>
                <Form.Item {...field} name={[name, 'id']} hidden><Input /></Form.Item>
                <div className={styles.heading}>
                  <Form.Item {...field} name={[name, 'name']} label="编辑器名称" rules={[{ required: true, whitespace: true, message: '请输入编辑器名称' }]}>
                    <Input aria-label={`编辑器名称 ${name + 1}`} placeholder="例如 Cursor" />
                  </Form.Item>
                  <Button
                    icon={<DeleteOutlined />}
                    aria-label={`删除编辑器 ${name + 1}`}
                    disabled={fields.length === 1}
                    onClick={() => {
                      const tools = form.getFieldValue('editors') as Settings['editors'];
                      if (form.getFieldValue('defaultEditor') === tools[name].id) {
                        form.setFieldValue('defaultEditor', tools.find((_, index) => index !== name)?.id);
                      }
                      remove(name);
                    }}
                  />
                </div>
                <Form.Item
                  {...field}
                  name={[name, 'command']}
                  label="启动命令"
                  rules={[{
                    validator: async (_, command) => {
                      validateTemplate(command);
                    },
                  }]}
                >
                  <Input aria-label={`启动命令 ${name + 1}`} placeholder={'my-editor "{location}"'} className={styles.command} />
                </Form.Item>
                <Form.Item {...field} name={[name, 'appMatch']} label="前台应用标识（可选）">
                  <Input aria-label={`前台应用标识 ${name + 1}`} placeholder="例如 Cursor, com.todesktop.230313mzl4w4u92，多个标识用逗号分隔" />
                </Form.Item>
              </div>
            ))}
            <Form.ErrorList errors={errors} />
            <Button type="dashed" icon={<PlusOutlined />} block onClick={() => add({ id: `editor_${randomString(12)}`, name: '', command: '' })}>
              添加自定义编辑器
            </Button>
          </>
        )}
      </Form.List>
      <div className={styles.help}>
        <strong>命令占位符</strong>
        <div>
          <code>{'{path}'}</code>
          {' '}
          文件路径；
          <code>{'{location}'}</code>
          {' '}
          文件路径及行列号；
          <code>{'{line}'}</code>
          {' '}
          行号；
          <code>{'{column}'}</code>
          {' '}
          列号（默认 1）。
        </div>
        <div>
          <code>{'{dir}'}</code>
          {' '}
          文件所在目录；
          <code>{'{filename}'}</code>
          {' '}
          文件名；
          <code>{'{label}'}</code>
          {' '}
          书签名称。
        </div>
        <div>
          用
          <code>[ ]</code>
          {' '}
          包裹仅在书签带行号时添加的参数，例如
          <code>{'webstorm [--line {line}] "{path}"'}</code>
          。
        </div>
        <div>程序路径包含空格时请用引号包裹。程序可填写命令名或绝对路径；修改编辑器设置后，点击「保存」生效。</div>
      </div>
    </BaseLayoutFormModal>
  );
}

export default EditorSettings;
