import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useMemoizedFn } from 'ahooks';
import { Dropdown, Form, Input, Modal, Radio, Select, message } from 'antd';
import React from 'react';
import FormModal from '../../components/FormModal';
import { IQuickLinksGroup, useQuickLinksGroupsState } from '../../storage';
import { randomString } from '../../utils/randomString';
import { useGlobalModal } from '../store';
import { GROUP_COLORS, GROUP_COLOR_LABELS } from './const';
import styles from './QuickLinksGroup.module.less';

export interface QuickLinksGroupProps {
  selectedGroupId: string;
  onGroupChange: (groupId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  className?: string;
}

const QuickLinksGroup: React.FC<QuickLinksGroupProps> = ({
  selectedGroupId,
  onGroupChange,
  onDeleteGroup,
  className = '',
}) => {
  const [groups, setGroups] = useQuickLinksGroupsState();
  const modal = useGlobalModal();
  const [antdModal, modalContextHolder] = Modal.useModal();

  const newId = () => `group_${randomString(12)}`;

  // 渲染表单字段
  const renderFormFields = (isEdit: boolean, group?: IQuickLinksGroup) => (
    <>
      <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入分组名称' }]}>
        <Input placeholder="请输入分组名称" autoFocus={!isEdit} />
      </Form.Item>
      <Form.Item name="color" label="颜色" rules={[{ required: true, message: '请选择颜色' }]}>
        <Select placeholder="请选择颜色">
          {GROUP_COLORS.map((color, index) => (
            <Select.Option key={color} value={color}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    backgroundColor: color,
                  }}
                />
                {GROUP_COLOR_LABELS[index]}
              </div>
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="type" label="类型" rules={isEdit ? [] : [{ required: true, message: '请选择类型' }]}>
        <Radio.Group disabled={isEdit}>
          <Radio.Button value="default">默认</Radio.Button>
          <Radio.Button value="remote">远程</Radio.Button>
        </Radio.Group>
      </Form.Item>
      {!isEdit && (
        <Form.Item noStyle dependencies={['type']}>
          {({ getFieldValue }) => {
            const type = getFieldValue('type');
            return type === 'remote' ? (
              <Form.Item name="remoteUrl" label="远程URL" rules={[{ required: true, message: '请输入远程URL' }]}>
                <Input placeholder="请输入远程URL" />
              </Form.Item>
            ) : null;
          }}
        </Form.Item>
      )}
      {isEdit && group?.type === 'remote' && (
        <Form.Item name="remoteUrl" label="远程URL" rules={[{ required: true, message: '请输入远程URL' }]}>
          <Input placeholder="请输入远程URL" />
        </Form.Item>
      )}
    </>
  );

  // 处理分组（添加或编辑）
  const handleGroup = useMemoizedFn(async (isEdit: boolean, group?: IQuickLinksGroup) => {
    const title = isEdit ? '编辑分组' : '添加分组';
    const okText = isEdit ? '保存' : '添加';
    const cancelText = '取消';


    // 根据已有分组数量自动选择默认颜色
    const getDefaultColor = () => {
      const usedColors = groups.map(g => g.color);
      const availableColor = GROUP_COLORS.find(color => !usedColors.includes(color));
      return availableColor || GROUP_COLORS[0];
    };

    const initialValues = isEdit ? group : {
      name: `分组${groups.length + 1}`,
      color: getDefaultColor(),
      type: 'default',
      remoteUrl: '',
    };

    const result = await modal.open<IQuickLinksGroup>(
      <FormModal
        title={title}
        okText={okText}
        cancelText={cancelText}
        initialValues={initialValues}
        formProps={{
          labelCol: { span: 4 },
        }}
      >
        {renderFormFields(isEdit, group)}
      </FormModal>
    );

    if (result) {
      // 检查名称是否重复
      const nameExists = isEdit
        ? groups.some(g => g.id !== group!.id && g.name === result.name)
        : groups.some(g => g.name === result.name);

      if (nameExists) {
        message.error('分组名称已存在');
        return;
      }

      if (isEdit && group) {
        // 编辑模式
        setGroups(prev => prev.map(g =>
          g.id === group.id
            ? { ...g, name: result.name, color: result.color, remoteUrl: result.remoteUrl, updateTime: Date.now() }
            : g
        ));
        message.success('分组更新成功');
      } else {
        // 添加模式
        const newGroup: IQuickLinksGroup = {
          id: newId(),
          name: result.name,
          color: result.color,
          type: result.type,
          remoteUrl: result.remoteUrl,
          createTime: Date.now(),
          updateTime: Date.now(),
        };
        setGroups(prev => [...prev, newGroup]);
        message.success('分组添加成功');
      }
    }
  });

  // 添加分组
  const addGroup = useMemoizedFn(() => handleGroup(false));

  // 编辑分组
  const editGroup = useMemoizedFn((group: IQuickLinksGroup) => handleGroup(true, group));

  // 删除分组
  const deleteGroup = useMemoizedFn(async (group: IQuickLinksGroup) => {
    antdModal.confirm({
      title: '确认删除',
      content: `确定要删除分组"${group.name}"吗？删除后该分组下的数据将归为"全部"分组。`,
      onOk: () => {
        setGroups(prev => prev.filter(g => g.id !== group.id));
        // 清空该分组下的数据分组标识
        onDeleteGroup?.(group.id);
        message.success('分组删除成功');
      },
    });
  });

  return (
    <div className={`${styles.root} ${className}`}>
      {/* 全部分组 */}
      <div
        className={`${styles.tag} ${selectedGroupId === 'all' ? styles.selected : ''}`}
        onClick={() => { onGroupChange('all'); }}
        style={{ '--group-color': '#999999' } as React.CSSProperties}
      >
        全部
      </div>

      {/* 用户分组 */}
      {groups.map(group => (
        <Dropdown
          key={group.id}
          trigger={['contextMenu']}
          menu={{
            items: [
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: '编辑',
                onClick: () => editGroup(group),
              },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: '删除',
                onClick: () => deleteGroup(group),
                danger: true,
              },
            ],
          }}
        >
          <div
            className={`${styles.tag} ${selectedGroupId === group.id ? styles.selected : ''}`}
            style={{ '--group-color': group.color } as React.CSSProperties}
            onClick={() => { onGroupChange(group.id); }}
          >
            <span className={styles.groupName}>{group.name}</span>
            {group.type === 'remote' && <span className={styles.remoteIcon}>🌐</span>}

          </div>
        </Dropdown>

      ))}

      {/* 添加分组按钮 */}
      <div
        className={`${styles.tag} ${styles.addTag}`}
        onClick={addGroup}
      >
        <PlusOutlined />
      </div>
      {modalContextHolder}
    </div>
  );
};

export default QuickLinksGroup;
