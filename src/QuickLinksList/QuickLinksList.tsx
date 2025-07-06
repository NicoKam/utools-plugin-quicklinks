/* eslint-disable @typescript-eslint/no-explicit-any */
import { EnterOutlined, ImportOutlined } from '@ant-design/icons';
import { usePromisifyModal } from '@orca-fe/hooks';
import { useMemoizedFn, useUpdateEffect } from 'ahooks';
import { Form, Input, message, Radio, Space } from 'antd';
import React, { useRef, useState } from 'react';
import ButtonWithIcon from '../components/ButtonWithIcon';
import FormModal from '../components/FormModal';
import { IQuickLinksItem } from '../storage';
import { useShortCutListener } from '../utils/shortcut';
import { CmdKey } from './const';
import QuickLinksDetailInfo from './QuickLinksDetailInfo';
import styles from './QuickLinksList.module.less';
import { hasParams, QuickLinksParamEditModal, replaceParams } from './QuickLinksParamEdit';
import useQuickLinksDataLogic from './useQuickLinksDataLogic';
import useShortcutLogic from './useShortcutLogic';
import FooterLayout from './FooterLayout';

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

  const [_this] = useState({
    params: {} as Record<string, string>,
  });

  const detailRef = useRef<HTMLDivElement>(null);


  const modal = usePromisifyModal();

  const modalOpen = modal.isOpen;

  // 记录访问过了
  const markAccessAndExit = (id: string) => {
    accessQuickLink(id);
    window.utools.outPlugin();
    window.utools.hideMainWindow();
  };

  // 默认行为
  const mainAction = useMemoizedFn(async (currentIndex = selectedIndex) => {
    const currentItem = finalData.at(currentIndex);
    if (currentIndex !== selectedIndex) {
      setSelectIndex(currentIndex);
    }

    if (modal.isOpen) return;

    if (currentItem) {
      if (currentItem.type === 'snippet') {
        // snippet 执行粘贴
        window.utools.hideMainWindowPasteText(currentItem.value);
        markAccessAndExit(currentItem.id);
      } else {
        const linkHasParams = hasParams(currentItem.value);

        if (linkHasParams) {
          window.utools.subInputBlur();
          const link = await modal.open<string>(
            <QuickLinksParamEditModal
              open={Boolean(modalOpen)}
              template={currentItem.value}
            />
          );
          if (link) {
            window.utools.shellOpenExternal(link);
            markAccessAndExit(currentItem.id); // 注意，这里在上面设置了 selectIndex，所以才没问题，否则可能会出问题
          }
        } else {
          // links 打开浏览器
          window.utools.shellOpenExternal(currentItem.value);
          markAccessAndExit(currentItem.id);
        }
      }
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
    // 如果当前聚焦的元素在 detail 内，且有选中内容，则不进行额外的复制操作
    if (
      detailRef.current?.contains(document.activeElement as Node) &&
      window.getSelection()?.toString()
        .trim()) return;
    if (currentItem) {
      window.utools.copyText(currentItem.value);
      message.success(`已复制【${currentItem.name}】的值`, 1);
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
          value: JSON.stringify(finalData.map(item => ({
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
    onFind: () => {
      window.utools.subInputFocus();
    },
    enable: !modalOpen,
  });


  return (
    <FooterLayout className={`${styles.root} ${className}`} footerClassName={styles.footer} {...otherProps}>
      <div className={styles.center}>
        <div className={styles.list}>
          {finalData.length === 0 && (
            <div className={styles.empty}>
              没有找到内容，请调整关键字
            </div>
          )}
          {
            finalData.map((item, index) => (
              <React.Fragment key={index}>
                {item.timeRange && (
                  <div className={styles.timeRange}>
                    {item.timeRange}
                  </div>
                )}
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
              </React.Fragment>

            ))
          }
        </div>

        {currentItem && (
          <div className={styles.detail} ref={detailRef} tabIndex={-1}>
            <div className={styles.preview}>
              {currentItem.value}
            </div>

            <QuickLinksDetailInfo className={styles.info} data={currentItem} accessData={accessData[currentItem.id]} />
          </div>
        )}


      </div>


      <FooterLayout.Footer position="left">
        {!modalOpen && (
          <>
            <ButtonWithIcon shortcuts={`${CmdKey}+N`} onClick={() => addOrEditItem()}>添加</ButtonWithIcon>
            <ButtonWithIcon icon={<ImportOutlined />} onClick={importExportData}>导入/导出</ButtonWithIcon>
          </>
        )}
      </FooterLayout.Footer>
      <FooterLayout.Footer position="right">
        {
          !modalOpen && (
            <>
              {currentItem && <ButtonWithIcon color={isDeleteConfirm ? 'red' : 'default'} shortcuts={`${CmdKey}+R`} onClick={removeCurrentItem}>{isDeleteConfirm ? '再次确认删除' : '删除'}</ButtonWithIcon>}
              {currentItem && <ButtonWithIcon shortcuts={`${CmdKey}+E`} onClick={() => addOrEditItem(true)}>编辑</ButtonWithIcon>}
              {currentItem && <ButtonWithIcon shortcuts={`${CmdKey}+C`} onClick={() => { copyItem(); }}>复制内容</ButtonWithIcon>}
              {currentItem && <ButtonWithIcon icon={<EnterOutlined />} shortcuts="Enter" onClick={() => { mainAction(); }}>{mainActionText}</ButtonWithIcon>}
            </>
          )
        }
      </FooterLayout.Footer>
      {modal.instance}
    </FooterLayout>
  );
};

export default QuickLinksList;
