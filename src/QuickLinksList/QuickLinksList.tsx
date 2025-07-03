/* eslint-disable @typescript-eslint/no-explicit-any */
import { EnterOutlined, ImportOutlined } from '@ant-design/icons';
import { usePromisifyModal } from '@orca-fe/hooks';
import { useMemoizedFn, useUpdateEffect } from 'ahooks';
import { Button, ButtonProps, Form, Input, message, Radio, Space } from 'antd';
import React from 'react';
import FormModal from '../components/FormModal';
import { IQuickLinksItem } from '../storage';
import { CmdKey } from './const';
import QuickLinksDetailInfo from './QuickLinksDetailInfo';
import styles from './QuickLinksList.module.less';
import useQuickLinksDataLogic from './useQuickLinksDataLogic';
import useShortcutLogic from './useShortcutLogic';


const ButtonWithIcon = (props: ButtonProps) => {
  const { icon, className = '', ...restProps } = props;
  return (
    <Button
      className={`${styles.iconWithButton} ${className}`}
      color="default"
      variant="text"
      iconPosition="end"
      icon={icon ? <div className={styles.iconWithButtonIcon}>{icon}</div> : null}
      {...restProps}
    />
  );
};

export interface QuickLinksListProps extends
  Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {

}

const QuickLinksList = (props: QuickLinksListProps) => {
  const { className = '', ...otherProps } = props;

  const {
    accessData,
    isDeleteConfirm,
    currentItem,
    finalData,
    selectedIndex,
    importData,
    setSelectIndex,
    addItem,
    editItem,
    removeCurrentItem,
    accessQuickLink,
  } = useQuickLinksDataLogic();


  const modal = usePromisifyModal();

  // 默认行为
  const mainAction = useMemoizedFn((currentIndex = selectedIndex) => {
    const currentItem = finalData.at(currentIndex);
    if (currentItem) {
      if (currentItem.type === 'snippet') {
        // snippet 执行粘贴
        window.utools.hideMainWindowPasteText(currentItem.value);
      } else {
        // links 打开浏览器
        window.utools.shellOpenExternal(currentItem.value);
        window.utools.outPlugin();
        window.utools.hideMainWindow();
      }
      // 记录访问过了
      accessQuickLink(currentItem.id);
    }
  });

  const addOrEditItem = async (isEdit = false) => {
    const currentId = currentItem?.id;

    if (isEdit && !currentId) return;

    const initialValue = isEdit ? currentItem : { type: 'link' };

    window.utools.subInputBlur();
    const okName = isEdit ? '编辑' : '添加';

    const result = await modal.open<IQuickLinksItem>(
      <FormModal title={okName} initialValues={initialValue} okText={okName} cancelText="取消">
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="请输入名称" autoFocus />
        </Form.Item>
        <Form.Item name="type" label="类型">
          <Radio.Group>
            <Radio.Button value="link">链接</Radio.Button>
            <Radio.Button value="snippet">文本片段</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item noStyle dependencies={['type']}>
          {
            ({ getFieldValue }) => {
              const type = getFieldValue('type');
              return (
                <Form.Item name="value" label="内容" rules={[{ required: true, message: type === 'link' ? '请输入链接' : '请输入文本片段' }]}>
                  {type === 'link' ? <Input placeholder="请输入链接" /> : <Input.TextArea rows={5} placeholder="请输入文本片段" style={{ fontFamily: 'monospace' }} />}
                </Form.Item>
              );
            }
          }
        </Form.Item>
      </FormModal>
    );

    if (result) {
      if (isEdit) {
        editItem(currentId!, result);
        message.success('已修改', 1);
      } else {
        addItem(result);
        message.success('添加成功', 1);
      }
    } else {
      message.warning('未创建内容');
    }
  };


  const copyItem = () => {
    if (currentItem) {
      window.utools.copyText(currentItem.value);
      message.success('已复制', 1);
    }
  };


  const importExportData = async () => {
    const result = await modal.open<{ value: string; importType: 'replace' | 'merge' }>(
      <FormModal
        title="导入导出"
        okText="保存"
        cancelText="关闭"
        initialValues={{
          importType: 'replace',
          value: JSON.stringify(data.map(item => ({
            name: item.name,
            type: item.type,
            value: item.value,
          })), null, 2),
        }}
      >
        <Form.Item name="value" noStyle>
          <Input.TextArea placeholder="规则 JSON" rows={10} style={{ fontFamily: 'monospace' }} />
        </Form.Item>
        <Form.Item name="importType">
          <Radio.Group>
            <Radio value="replace">完全使用新数据</Radio>
            <Radio value="merge">与旧数据合并</Radio>
          </Radio.Group>
        </Form.Item>
      </FormModal>
    );

    if (result) {
      try {
        const json = JSON.parse(result.value);
        importData(json, result.importType);
        message.success('导入成功');
      } catch (error) {
        message.error('导入失败，数据格式错误');
      }
    } else {
      message.warning('未导入内容');
    }
  };


  // 当选中的元素变化时，自动滚动当视窗内
  useUpdateEffect(() => {
    if (selectedIndex >= 0) {
      const dom = document.querySelector(`.${styles.item}_${selectedIndex}`);
      if (dom) {
        dom.scrollIntoView({
          block: 'nearest',
        });
      }
    }
  }, [selectedIndex]);


  const mainActionText = currentItem?.type === 'snippet' ? '粘贴内容' : '打开链接';


  // 快捷键相关逻辑
  useShortcutLogic({
    onMainAction: mainAction,
    onCopy: copyItem,
    onAdd: addOrEditItem,
    onEdit: () => addOrEditItem(true),
    onRemove: removeCurrentItem,
    onFind: () => {
      window.utools.subInputFocus();
    },
  });


  return (
    <div className={`${styles.root} ${className}`} {...otherProps}>
      <div className={styles.center}>
        <div className={styles.list}>
          {finalData.length === 0 && (
            <div className={styles.empty}>
              没有找到内容，请调整关键字
            </div>
          )}
          {
            finalData.map((item, index) => (
              <div
                className={` ${styles.row} ${styles.item} ${styles.item}_${index} ${selectedIndex === index ? styles.selected : ''}`}
                key={index}
                onClick={() => { setSelectIndex(index); }}
                onDoubleClick={() => { mainAction(index); }}
              >
                <div className={styles.itemContent}>
                  <div className={styles.name}>{item.name}</div>
                  <div className={styles.tips} title={item.value}>{item.value}</div>
                </div>
                {/* icon */}
                <div className={styles.itemTips}>
                  {index < 9 ? `#${index + 1}` : null}
                </div>
              </div>
            ))
          }
        </div>

        {currentItem && (
          <div className={styles.detail}>
            <div className={styles.preview}>
              {currentItem.value}
            </div>

            <QuickLinksDetailInfo className={styles.info} data={currentItem} accessData={accessData[currentItem.id]} />
          </div>
        )}
      </div>

      <div
        className={styles.footer}
        onFocus={() => {
          document.activeElement?.blur();
        }}
      >
        <Space size={2} split={<span className={styles.split} />}>
          <ButtonWithIcon icon={`${CmdKey}+N`} onClick={() => addOrEditItem()}>添加</ButtonWithIcon>
          <ButtonWithIcon icon={<ImportOutlined />} onClick={importExportData}>导入/导出</ButtonWithIcon>
        </Space>
        <div style={{ flex: 1 }} />
        <Space size={2} split={<span className={styles.split} />}>
          {currentItem && <ButtonWithIcon color={isDeleteConfirm ? 'red' : 'default'} icon={`${CmdKey}+R`} onClick={removeCurrentItem}>{isDeleteConfirm ? '再次确认删除' : '删除'}</ButtonWithIcon>}
          {currentItem && <ButtonWithIcon icon={`${CmdKey}+E`} onClick={() => addOrEditItem(true)}>编辑</ButtonWithIcon>}
          {currentItem && <ButtonWithIcon icon={`${CmdKey}+C`} onClick={() => { copyItem(); }}>复制内容</ButtonWithIcon>}
          {currentItem && <ButtonWithIcon icon={<EnterOutlined />} onClick={mainAction}>{mainActionText}</ButtonWithIcon>}
        </Space>
      </div>
      {modal.instance}
    </div>
  );
};

export default QuickLinksList;
