/* eslint-disable @typescript-eslint/no-explicit-any */
import { CopyOutlined, DeleteOutlined, EditOutlined, EnterOutlined, ImportOutlined, PlusOutlined } from '@ant-design/icons';
import { usePromisifyModal } from '@orca-fe/hooks';
import { useMemoizedFn, useUpdateEffect } from 'ahooks';
import { Button, ButtonProps, Form, Input, message, Radio, Space } from 'antd';
import { get } from 'lodash-es';
import React, { useEffect, useMemo } from 'react';
import DateTimeDisplay from '../components/DateTimeDisplay';
import EnumDisplay from '../components/EnumDisplay';
import FormModal from '../components/FormModal';
import { IQuickLinksItem, setQuickLinksAccessData, useQuickLinksAccessDataItem, useQuickLinksDataState, validateQuickLinks } from '../storage';
import { randomString } from '../utils/randomString';
import { useSelectIndexWithKeyboard } from '../utils/useSelectIndex';
import useSubInput from '../utils/useSubInput';
import { matchesFuzzy2 } from '../utils/vscode-utils/filters';
import styles from './QuickLinksList.module.less';
import useSecondaryConfirm from '../utils/useSencondaryConfirm';
import { useShortCutListener } from '../utils/shortcut';

const CmdKey = window.utools.isMacOS() ? 'Cmd' : 'Ctrl';

const quickOpenShort = new Array(9).fill(0)
  .map((_, index) => [`Ctrl+${index + 1}`, `Cmd+${index + 1}`])
  .flat();

const EmptyHolder = () => <div className={styles.empty}>--</div>;

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

  const subInput = useSubInput();

  const [data, setData] = useQuickLinksDataState();
  const [accessData, setAccessData, { clearAccessData }] = useQuickLinksAccessDataItem();

  // 过滤关键字
  let finalData = useMemo(() => {
    if (subInput) {
      return data.filter(({ name }) => {
        // return name.includes(subInput);
        const match = matchesFuzzy2(subInput, name);
        if (match) {
          return true;
        }
        return false;
      });
    }
    return data;
  }, [subInput, data]);

  // 排序
  finalData = useMemo(() => finalData.slice().sort((a, b) => {
    const dateA = get(accessData, [a.id, 'lastAccessTime'], get(accessData, [a.id, 'updateTime'], 0));
    const dateB = get(accessData, [b.id, 'lastAccessTime'], get(accessData, [b.id, 'updateTime'], 0));

    return dateB - dateA;
  }), [finalData, accessData]);


  const [selectedIndex, actions] = useSelectIndexWithKeyboard({ maxLength: finalData.length });

  const currentItem = finalData.at(selectedIndex);

  const currentItemAccessData = useMemo(() => currentItem ? get(accessData, currentItem.id) : undefined, [accessData, currentItem?.id]);

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

  // 默认行为
  const mainAction = useMemoizedFn((currentIndex = selectedIndex) => {
    const currentItem = finalData.at(currentIndex);
    const currentItemAccessData = get(accessData, currentItem?.id || '');
    if (currentItem) {
      if (currentItem.type === 'snippet') {
        // snippet 执行粘贴
        window.utools.hideMainWindowPasteText(currentItem.value);
      } else {
        // links 打开浏览器
        window.services.openUrl(currentItem.value);
        window.utools.outPlugin();
        window.utools.hideMainWindow();
      }
      setAccessData(currentItem.id, {
        lastAccessTime: Date.now(),
        accessCount: (currentItemAccessData.accessCount || 0) + 1,
      });
    }
  });

  const modal = usePromisifyModal();

  const mainActionText = currentItem?.type === 'snippet' ? '粘贴内容' : '打开链接';

  const addOrEditItem = async (isEdit = false) => {
    const currentId = currentItem?.id;
    const initialValue = isEdit ? currentItem : { type: 'links' };
    if (isEdit && !currentId) return;

    window.utools.subInputBlur();
    const okName = isEdit ? '编辑' : '添加';

    const result = await modal.open<IQuickLinksItem>(
      <FormModal title={okName} initialValues={initialValue} okText={okName} cancelText="取消">
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="请输入名称" autoFocus />
        </Form.Item>
        <Form.Item name="type" label="类型">
          <Radio.Group>
            <Radio.Button value="links">链接</Radio.Button>
            <Radio.Button value="snippet">文本片段</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item noStyle dependencies={['type']}>
          {
            ({ getFieldValue }) => {
              const type = getFieldValue('type');
              return (
                <Form.Item name="value" label="内容" rules={[{ required: true, message: type === 'links' ? '请输入链接' : '请输入文本片段' }]}>
                  {type === 'links' ? <Input placeholder="请输入链接" /> : <Input.TextArea rows={5} placeholder="请输入文本片段" style={{ fontFamily: 'monospace' }} />}
                </Form.Item>
              );
            }
          }
        </Form.Item>
      </FormModal>
    );

    if (result) {
      if (isEdit) {
        setData(data => data.map((item) => {
          if (item.id === currentId) {
            return {
              ...item,
              ...result,
            };
          }
          return item;
        }));
        setAccessData(currentId!, {
          updateTime: Date.now(),
        });
        message.success('已修改', 1);
      } else {
        const id = `quick_${randomString(12)}`;
        setData([
          {
            ...result,
            id,
          }, ...data,
        ]);
        setAccessData(id, {
          accessCount: 0,
          createTime: Date.now(),
          updateTime: Date.now(),
        });
        message.success('添加成功', 1);
      }
    } else {
      message.warning('未创建内容');
    }
  };

  const { isConfirm, confirm, cancelConfirm } = useSecondaryConfirm();

  useEffect(() => {
    cancelConfirm();
  }, [currentItem]);

  const removeItem = () => {
    if (currentItem) {
      if (confirm()) {
        setData(data.filter(item => item.id !== currentItem.id));
        setAccessData(currentItem.id, undefined);
        message.success('已删除', 2);
      }
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

    try {
      if (result) {
        const json = JSON.parse(result.value);
        if (validateQuickLinks(json)) {
          if (result.importType === 'replace') {
            clearAccessData();
            setData(json.map(item => ({
              ...item,
              id: `quick_${randomString(12)}`,
            })));
            json.forEach((item) => {
              setAccessData(item.id, {
                accessCount: 0,
                createTime: Date.now(),
                updateTime: Date.now(),
              });
            });
          } else {
            const getKey = (item: IQuickLinksItem) => `${item.name}___${item.value}`;
            const exists = new Set(data.map(item => getKey(item)));
            setData([
              ...json.filter(item => !exists.has(getKey(item))).map(item => ({
                ...item,
                id: `quick_${randomString(12)}`,
              })), ...data,
            ]);
          }
          message.success('导入成功');
        } else {
          message.error('导入失败，数据格式错误');
        }
      }
    } catch (error: any) {
      message.error(`导入失败，数据格式错误: ${error?.message}`);
    }
  };

  // 快速打开的快捷键
  useShortCutListener(quickOpenShort, (e) => {
    const index = Number(e.key);
    if (index > 0 && index < 10) {
      mainAction(index - 1);
    }
  });

  useShortCutListener('Enter', (e) => {
    if (e.target === document.body) mainAction();
  });

  useShortCutListener(`${CmdKey}+C`, (e) => {
    if (e.target === document.body) copyItem();
  });

  useShortCutListener(`${CmdKey}+N`, (e) => {
    if (e.target === document.body) addOrEditItem();
  });

  useShortCutListener(`${CmdKey}+E`, (e) => {
    if (e.target === document.body) addOrEditItem(true);
  });

  useShortCutListener(`${CmdKey}+R`, (e) => {
    if (e.target === document.body) removeItem();
  });

  useShortCutListener('Escape', (e) => {
    e.preventDefault();
    e.stopPropagation();
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
                onClick={() => { actions.set(index); }}
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

            <div className={styles.info}>
              <div className={styles.row}>
                <div className={styles.rowTitle}>脚本名称</div>
                <div className={styles.rowValue}>{currentItem.name}</div>
              </div>
              <div className={styles.row}>
                <div className={styles.rowTitle}>类型</div>
                <div className={styles.rowValue}>
                  <EnumDisplay
                    value={currentItem.type}
                    enums={[
                      { value: 'links', text: '链接' },
                      { value: 'snippet', text: '文本片段' },
                    ]}
                    emptyHolder={<EmptyHolder />}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.rowTitle}>最近使用时间</div>
                <div className={styles.rowValue}>
                  <DateTimeDisplay value={currentItemAccessData?.lastAccessTime} emptyHolder={<EmptyHolder />} />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.rowTitle}>使用次数</div>
                <div className={styles.rowValue}>{currentItemAccessData?.accessCount}</div>
              </div>
              <div className={styles.row}>
                <div className={styles.rowTitle}>更新时间</div>
                <div className={styles.rowValue}>
                  <DateTimeDisplay value={currentItemAccessData?.updateTime} emptyHolder={<EmptyHolder />} />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.rowTitle}>创建时间</div>
                <div className={styles.rowValue}>
                  <DateTimeDisplay value={currentItemAccessData?.createTime} emptyHolder={<EmptyHolder />} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <Space size={2} split={<span className={styles.split} />}>
          <ButtonWithIcon icon={`${CmdKey}+N`} onClick={() => addOrEditItem()}>添加</ButtonWithIcon>
          <ButtonWithIcon icon={<ImportOutlined />} onClick={importExportData}>导入/导出</ButtonWithIcon>
        </Space>
        <div style={{ flex: 1 }} />
        <Space size={2} split={<span className={styles.split} />}>
          {currentItem && <ButtonWithIcon color={isConfirm ? 'red' : 'default'} icon={`${CmdKey}+R`} onClick={removeItem}>{isConfirm ? '再次确认删除' : '删除'}</ButtonWithIcon>}
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
