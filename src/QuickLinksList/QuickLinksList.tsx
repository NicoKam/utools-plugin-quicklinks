import type { ForegroundApp } from '../editorSettings';
import type { IQuickLinksItem } from '../storage';
import { CodeOutlined, EnterOutlined, ImportOutlined, SettingOutlined } from '@ant-design/icons';
import { useMemoizedFn, useUpdateEffect } from 'ahooks';
import { Alert, Form, Input, message, Radio, Select } from 'antd';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import BaseLayoutFormModal from '../components/BaseLayoutFormModal';
import ButtonWithIcon from '../components/ButtonWithIcon';
import { getEditorSettings, matchForegroundEditor, resolveEditor, setEditorSettings as saveEditorSettings, validateCodeLocation } from '../editorSettings';
import { watchDocumentVisible } from '../utils/watchDocumentVisible';
import BaseLayout from './BaseLayout';
import CodePreview from './CodePreview';
import { CmdKey } from './const';
import EditorSettings from './EditorSettings';
import HighlightName from './HighlightName';
import QuickLinksDetailInfo from './QuickLinksDetailInfo';
import QuickLinksGroup from './QuickLinksGroup';
import styles from './QuickLinksList.module.less';
import { hasParams, QuickLinksParamEditModal } from './QuickLinksParamEdit';
import { GlobalModalInstance, useGlobalModal } from './store';
import useQuickLinksDataLogic from './useQuickLinksDataLogic';
import useShortcutLogic from './useShortcutLogic';

export interface QuickLinksListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {

}

function QuickLinksList(props: QuickLinksListProps) {
  const {
    className = '',
    ...otherProps
  } = props;

  const {
    accessData,
    isDeleteConfirm,
    currentItem,
    currentItemGroup,
    data, // 本地数据
    finalData,
    selectedIndex,
    importData,
    setSelectIndex,
    addItem,
    editItem,
    removeCurrentItem,
    accessQuickLink,
    groups,
    selectedGroupId,
    setSelectedGroupId,
    clearGroupData,
    clearRemoteGroupCache,
    connectSubInput,
  } = useQuickLinksDataLogic();

  // 当前选中的元素是否 remote
  const isRemote = currentItemGroup?.type === 'remote';

  const detailRef = useRef<HTMLDivElement>(null);
  const [editorSettings, setEditorSettings] = useState(getEditorSettings);
  const [foregroundApp, setForegroundApp] = useState<ForegroundApp | null>(null);
  const openingRef = useRef(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let active = true;
    let request = 0;
    const refreshForeground = (action?: unknown) => {
      if (!active)
        return;
      if (action)
        window.services?.captureInvocationApp?.(action);
      const currentRequest = ++request;
      window.services?.getInvocationApp?.().then((app) => {
        if (!active || currentRequest !== request)
          return;
        if (app) {
          setForegroundApp(app);
          return;
        }
        // The native helper can be too early during plugin startup. An empty
        // result is not cached by preload, so retry once before falling back.
        window.services?.getInvocationApp?.().then((retryApp) => {
          if (active && currentRequest === request)
            setForegroundApp(retryApp);
        }).catch(() => {
          if (active && currentRequest === request)
            setForegroundApp(null);
        });
      }).catch(() => {
        if (active && currentRequest === request)
          setForegroundApp(null);
      });
    };
    window.utools?.onPluginEnter(refreshForeground);
    const stopWatchingVisibility = watchDocumentVisible(document, () => {
      window.services?.logInvocationAppDebug?.('frontend-visible', { visibilityState: document.visibilityState });
      refreshForeground({ type: 'visibility', code: 'quicklinks' });
    });
    refreshForeground();
    return () => {
      active = false;
      stopWatchingVisibility();
    };
  }, []);

  useEffect(() => {
    if (currentItem?.type !== 'code')
      return;
    const matchedEditor = editorSettings.followFrontEditor !== false
      ? matchForegroundEditor(foregroundApp, editorSettings)
      : undefined;
    const resolvedEditor = resolveEditor(currentItem.editorId, editorSettings, foregroundApp);
    window.services?.logInvocationAppDebug?.('frontend-resolution', {
      foregroundApp,
      followFrontEditor: editorSettings.followFrontEditor !== false,
      bookmarkEditorId: currentItem.editorId,
      matchedEditorId: matchedEditor?.id,
      resolvedEditorId: resolvedEditor.id,
      fallbackToDefault: !editorSettings.editors.some(tool => tool.id === currentItem.editorId) && !matchedEditor,
    });
  }, [currentItem?.editorId, currentItem?.type, editorSettings, foregroundApp]);

  const modal = useGlobalModal();

  const modalOpen = modal.isOpen;

  // 分组切换处理
  const handleGroupChange = useMemoizedFn((groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectIndex(0); // 重置选中索引
  });

  // 记录访问过了
  const markAccessAndExit = (id: string) => {
    accessQuickLink(id);
    window.utools?.outPlugin();
    window.utools?.hideMainWindow();
  };

  // 默认行为
  const mainAction = useMemoizedFn(async (currentIndex = selectedIndex) => {
    const currentItem = finalData.at(currentIndex);
    if (currentIndex !== selectedIndex) {
      setSelectIndex(currentIndex);
    }

    if (modal.isOpen || openingRef.current)
      return;

    if (currentItem) {
      if (currentItem.type === 'code') {
        openingRef.current = true;
        setOpening(true);
        try {
          validateCodeLocation(currentItem.value);
          if (!window.services?.open)
            throw new Error('请在 uTools 中打开代码书签');
          const app = await window.services.getInvocationApp?.().catch(() => null);
          const tool = resolveEditor(currentItem.editorId, editorSettings, app);
          window.services.logInvocationAppDebug?.('frontend-open', {
            foregroundApp: app,
            followFrontEditor: editorSettings.followFrontEditor !== false,
            bookmarkEditorId: currentItem.editorId,
            matchedEditorId: matchForegroundEditor(app, editorSettings)?.id,
            resolvedEditorId: tool.id,
          });
          await window.services.open({
            path: currentItem.value,
            label: currentItem.displayName,
            tool,
          });
          setSelectIndex(0);
          markAccessAndExit(currentItem.id);
        } catch (error) {
          message.error(error instanceof Error ? error.message : '编辑器打开失败');
        } finally {
          openingRef.current = false;
          setOpening(false);
        }
      } else if (currentItem.type === 'snippet') {
        // snippet 执行粘贴
        window.utools?.hideMainWindowPasteText(currentItem.value);
        markAccessAndExit(currentItem.id);
      } else {
        const linkHasParams = hasParams(currentItem.value);

        if (linkHasParams) {
          window.utools?.subInputBlur();
          const link = await modal.open<string>(
            <QuickLinksParamEditModal
              open={Boolean(modalOpen)}
              template={currentItem.value}
            />,
          );
          if (link) {
            window.utools?.shellOpenExternal(link);
            setSelectIndex(0);
            markAccessAndExit(currentItem.id); // 注意，这里在上面设置了 selectIndex，所以才没问题，否则可能会出问题
          }
        } else {
          // links 打开浏览器
          window.utools?.shellOpenExternal(currentItem.value);
          setSelectIndex(0);
          markAccessAndExit(currentItem.id);
        }
      }
    }
  });

  const addOrEditItem = async (isEdit = false) => {
    const currentId = currentItem?.id;

    if (isEdit && !currentId)
      return;

    const initialValue = isEdit
      ? {
        ...currentItem,
        type: currentItem?.type ?? 'link',
        editorId: editorSettings.editors.some(tool => tool.id === currentItem?.editorId) ? currentItem?.editorId : 'default',
      }
      : {
        type: 'link',
        editorId: 'default',
        groupId: groups.find(group => group.id === selectedGroupId && group.type === 'default')?.id,
      };

    window.utools?.subInputBlur();
    const okName = isEdit ? '编辑' : '添加';

    // 获取可选择的默认分组
    const defaultGroups = groups.filter(group => group.type === 'default');

    const result = await modal.open<IQuickLinksItem & { groupId?: string }>(
      <BaseLayoutFormModal title={okName} initialValues={initialValue} okText={okName} cancelText="取消" formProps={{ style: { maxWidth: 800, margin: 'auto' } }}>
        <Form.Item noStyle dependencies={['type']}>
          {({ getFieldValue }) => (
            <Form.Item
              name="name"
              label="名称"
              rules={[{ required: getFieldValue('type') !== 'code', message: '请输入名称' }]}
            >
              <Input placeholder={getFieldValue('type') === 'code' ? '可选，留空使用文件名' : '请输入名称'} autoFocus />
            </Form.Item>
          )}
        </Form.Item>
        <Form.Item name="type" label="类型">
          <Radio.Group>
            <Radio.Button value="link">链接</Radio.Button>
            <Radio.Button value="snippet">文本片段</Radio.Button>
            <Radio.Button value="code">代码书签</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item noStyle dependencies={['type']}>
          {
            ({ getFieldValue }) => {
              const type = getFieldValue('type');
              return (
                <Form.Item
                  name="value"
                  label="内容"
                  rules={[
                    {
                      required: true,
                      message: type === 'code' ? '请输入文件路径' : type === 'link' ? '请输入链接' : '请输入文本片段',
                    },
                    ...(type === 'code'
                      ? [{ validator: async (_: unknown, value: string) => {
                        validateCodeLocation(value);
                      } }]
                      : []),
                  ]}
                  extra={type === 'code' ? '填写本地文件的绝对路径，可在末尾追加 :行号，例如 /Users/you/project/file.ts:12' : undefined}
                >
                  {type === 'snippet'
                    ? <Input.TextArea rows={5} placeholder="请输入文本片段" style={{ fontFamily: 'monospace' }} />
                    : <Input placeholder={type === 'code' ? '/Users/you/project/file.ts:12' : '请输入链接'} />}
                </Form.Item>
              );
            }
          }
        </Form.Item>
        <Form.Item noStyle dependencies={['type']}>
          {({ getFieldValue }) => getFieldValue('type') === 'code' && (
            <Form.Item name="editorId" label="编辑器">
              <Select options={[
                { value: 'default', label: `使用全局设置（${resolveEditor(undefined, editorSettings, foregroundApp).name}）` },
                ...editorSettings.editors.map(tool => ({ value: tool.id, label: tool.name })),
              ]}
              />
            </Form.Item>
          )}
        </Form.Item>
        {defaultGroups.length > 0 && (
          <Form.Item name="groupId" label="分组">
            <Select placeholder="无分组" allowClear>
              {defaultGroups.map(group => (
                <Select.Option key={group.id} value={group.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '2px',
                        backgroundColor: group.color,
                      }}
                    />
                    {group.name}
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}
      </BaseLayoutFormModal>,
    );

    if (result) {
      try {
        result.editorId = result.type === 'code' ? result.editorId : undefined;
        if (result.type === 'code') {
          result.value = result.value.trim();
          result.name = result.name?.trim() ?? '';
        }
        if (isEdit) {
          editItem(currentId!, result);
          message.success('已修改', 1);
        } else {
          addItem(result);
          message.success('添加成功', 1);
        }
        handleGroupChange(selectedGroupId === 'all' ? 'all' : result.groupId || 'all');
        connectSubInput(true);
      } catch (error) {
        message.error(`${isEdit ? '修改' : '添加'}失败：${error instanceof Error ? error.message : '内容保存失败，请重试'}`);
      }
    } else {
      message.warning('未创建内容');
    }
  };

  const copyItem = () => {
    // 如果当前聚焦的元素在 detail 内，且有选中内容，则不进行额外的复制操作
    if (
      detailRef.current?.contains(document.activeElement as Node)
      && window.getSelection()
        ?.toString()
        .trim()
    ) {
      return;
    }
    if (currentItem) {
      window.utools?.copyText(currentItem.value);
      message.success(`已复制【${currentItem.displayName}】的值`, 1);
    }
  };

  const importExportData = async () => {
    window.utools?.subInputBlur();
    const result = await modal.open<{ value: string; importType: 'replace' | 'merge' }>(
      <BaseLayoutFormModal
        title="导入导出"
        okText="保存"
        cancelText="关闭"
        initialValues={{
          importType: 'replace',
          value: JSON.stringify(data.map(item => ({
            name: item.name,
            type: item.type,
            value: item.value,
            editorId: item.type === 'code' ? item.editorId : undefined,
          })), null, 2),
        }}
      >
        <Alert
          type="warning"
          showIcon
          message="代码书签可能包含本机绝对路径，分享导出内容前请检查或脱敏。"
          style={{ marginBottom: 12 }}
        />
        <Form.Item name="value" noStyle>
          <Input.TextArea placeholder="规则 JSON" rows={10} style={{ fontFamily: 'monospace' }} />
        </Form.Item>
        <Form.Item name="importType">
          <Radio.Group>
            <Radio value="replace">完全使用新数据</Radio>
            <Radio value="merge">与旧数据合并</Radio>
          </Radio.Group>
        </Form.Item>
      </BaseLayoutFormModal>,
    );

    if (result) {
      try {
        const json = JSON.parse(result.value);
        importData(json, result.importType);
        message.success('导入成功');
      } catch (error) {
        console.error(error);
        message.error('导入失败，数据格式错误');
      }
    } else {
      message.warning('未导入内容');
    }
  };

  const openSettings = async () => {
    window.utools?.subInputBlur();
    const detectedApp = await window.services?.getInvocationApp?.().catch(() => null) ?? null;
    setForegroundApp(detectedApp);
    const settings = await modal.open<typeof editorSettings>(<EditorSettings settings={editorSettings} foregroundApp={detectedApp} />);
    if (settings) {
      try {
        saveEditorSettings(settings);
        setEditorSettings(settings);
        message.success('全局设置已保存', 1);
      } catch (error) {
        message.error(error instanceof Error ? error.message : '设置保存失败');
      }
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

  const mainActionText = currentItem?.type === 'snippet' ? '粘贴' : '打开';
  const hasEditorOverride = editorSettings.editors.some(tool => tool.id === currentItem?.editorId);
  const followsForeground = !hasEditorOverride && editorSettings.followFrontEditor !== false && Boolean(matchForegroundEditor(foregroundApp, editorSettings));
  const editorSource = hasEditorOverride ? '书签指定' : followsForeground ? undefined : '全局默认';

  // 分组切换逻辑
  const handleTabSwitch = useMemoizedFn((prev: boolean) => {
    const allGroups = ['all', ...groups.map(g => g.id)];
    const currentIndex = allGroups.indexOf(selectedGroupId);
    let nextIndex = (currentIndex + (prev ? -1 : 1)) % allGroups.length;
    if (nextIndex < 0) {
      nextIndex = allGroups.length - 1;
    }
    handleGroupChange(allGroups[nextIndex]);
  });

  // 快捷键相关逻辑
  useShortcutLogic({
    onMainAction: mainAction,
    onFind: () => {
      connectSubInput();
      window.utools?.subInputFocus();
    },
    onTabSwitch: handleTabSwitch,
    onNextItem: () => {
      setSelectIndex(selectedIndex + 1);
    },
    enable: !modalOpen,
  });

  return (
    <BaseLayout className={`${styles.root} ${className}`} footerClassName={styles.footer} {...otherProps}>
      <div className={styles.container}>
        {/* 列表区域 */}
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
                    onClick={() => {
                      setSelectIndex(index);
                    }}
                    onDoubleClick={() => {
                      mainAction(index);
                    }}
                    style={{
                      '--group-color': item.groupId ? groups.find(g => g.id === item.groupId)?.color : '#999',
                    } as React.CSSProperties}
                  >
                    <div className={styles.itemContent}>
                      <div className={styles.nameRow}>
                        <HighlightName className={styles.name} value={item.displayName} match={item.match} title={item.displayName} />
                        {item.type === 'code' && <CodeOutlined className={styles.codeIcon} title="代码书签" />}
                      </div>
                      <HighlightName className={styles.tips} title={item.value} value={item.value} match={item.valueMatch} />
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
              {currentItem.type === 'code'
                ? <CodePreview value={currentItem.value} />
                : (
                  <div className={styles.preview}>
                    {currentItem.value}
                  </div>
                )}

              <QuickLinksDetailInfo className={styles.info} data={currentItem} accessData={accessData[currentItem.id]} editorName={currentItem.type === 'code' ? resolveEditor(currentItem.editorId, editorSettings, foregroundApp).name : undefined} editorSource={editorSource} />
            </div>
          )}
        </div>

        {/* 分组 */}
        <QuickLinksGroup
          selectedGroupId={selectedGroupId}
          onGroupChange={handleGroupChange}
          onDeleteGroup={(groupId) => {
            clearGroupData(groupId);
            clearRemoteGroupCache(groupId);
          }}
          className={styles.groupBar}
        />
      </div>

      <BaseLayout.Footer>
        {!modalOpen && (
          <>
            <ButtonWithIcon shortcuts={`${CmdKey}+N`} onClick={() => addOrEditItem()}>添加</ButtonWithIcon>
            <ButtonWithIcon icon={<ImportOutlined />} onClick={importExportData}>导入/导出</ButtonWithIcon>
            <ButtonWithIcon icon={<SettingOutlined />} onClick={openSettings}>设置</ButtonWithIcon>
            <BaseLayout.Splitter />
            {currentItem && !isRemote && (
              <ButtonWithIcon
                color={isDeleteConfirm ? 'red' : 'default'}
                title={isDeleteConfirm ? '再次点击确认删除' : '删除当前内容'}
                shortcuts={`${CmdKey}+R`}
                onClick={removeCurrentItem}
              >
                {isDeleteConfirm ? '确认删除？' : '删除'}
              </ButtonWithIcon>
            )}
            {currentItem && !isRemote && <ButtonWithIcon shortcuts={`${CmdKey}+E`} onClick={() => addOrEditItem(true)}>编辑</ButtonWithIcon>}
            {currentItem && (
              <ButtonWithIcon
                shortcuts={`${CmdKey}+C`}
                onClick={() => {
                  copyItem();
                }}
              >
                复制
              </ButtonWithIcon>
            )}
            {currentItem && (
              <ButtonWithIcon
                icon={<EnterOutlined />}
                loading={opening}
                shortcuts="Enter"
                onClick={() => {
                  mainAction();
                }}
              >
                {mainActionText}
              </ButtonWithIcon>
            )}
          </>
        )}
      </BaseLayout.Footer>
      <GlobalModalInstance />
    </BaseLayout>
  );
}

export default QuickLinksList;
