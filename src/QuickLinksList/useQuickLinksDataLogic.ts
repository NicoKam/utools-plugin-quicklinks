import { get } from 'lodash-es';
import { useEffect, useMemo } from 'react';
import {
  IQuickLinksItem,
  useQuickLinksAccessDataItem,
  useQuickLinksDataState,
} from '../storage';
import { randomString } from '../utils/randomString';
import { useSelectIndexWithKeyboard } from '../utils/useSelectIndex';
import useSecondaryConfirm from '../utils/useSencondaryConfirm';
import useSubInput from '../utils/useSubInput';
import { matchesFuzzy2 } from '../utils/vscode-utils/filters';
import { CmdKey } from './const';

const newId = () => `quick_${randomString(12)}`;

/**
 * 快捷链接数据逻辑
 */
export default function useQuickLinksDataLogic() {
  const subInput = useSubInput({ placeholder: `搜索(${CmdKey}+F)` });

  const [data, setData] = useQuickLinksDataState();
  const [accessData, setAccessData, { clearAccessData }] =
    useQuickLinksAccessDataItem();

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
  finalData = useMemo(
    () =>
      finalData.slice().sort((a, b) => {
        const dateA = get(
          accessData,
          [a.id, 'lastAccessTime'],
          get(accessData, [a.id, 'updateTime'], 0),
        );
        const dateB = get(
          accessData,
          [b.id, 'lastAccessTime'],
          get(accessData, [b.id, 'updateTime'], 0),
        );

        return dateB - dateA;
      }),
    [finalData, accessData],
  );

  const [selectedIndex, actions] = useSelectIndexWithKeyboard({
    maxLength: finalData.length,
  });

  const { set: setSelectIndex } = actions;

  const currentItem = finalData.at(selectedIndex);

  const { isConfirm, confirm, cancelConfirm } = useSecondaryConfirm();

  useEffect(() => {
    cancelConfirm();
  }, [currentItem]);

  // 一些基础操作

  /**
   * 添加新项
   * @returns 是否添加成功
   */
  const addItem = (item: Omit<IQuickLinksItem, 'id'>) => {
    const id = newId();

    setData(data => [
      ...data,
      {
        ...item,
        id,
      },
    ]);

    setAccessData(id, {
      accessCount: 0,
      createTime: Date.now(),
      updateTime: Date.now(),
    });

    return true;
  };

  /**
   * 编辑项
   * @returns 是否编辑成功
   */
  const editItem = (id: string, newItem: Omit<IQuickLinksItem, 'id'>) => {
    setData(data =>
      data.map(item =>
        item.id === id
          ? {
            ...item,
            ...newItem,
          }
          : item,
      ),
    );

    setAccessData(id, {
      updateTime: Date.now(),
    });
    return true;
  };

  /**
   * 删除当前项
   * @returns 是否删除成功
   */
  const removeCurrentItem = () => {
    if (currentItem) {
      if (confirm()) {
        setData(data.filter(item => item.id !== currentItem.id));
        setAccessData(currentItem.id, undefined);
        return true;
      }
    }
    return false;
  };

  /**
   * 导入数据
   */
  const importData = (
    newData: IQuickLinksItem[],
    mode: 'replace' | 'merge',
  ) => {
    if (mode === 'replace') {
      clearAccessData();
      const newDataWithId = newData.map(item => ({
        ...item,
        id: newId(),
      }));
      setData(newDataWithId);
      newDataWithId.forEach((item) => {
        setAccessData(item.id, {
          accessCount: 0,
          createTime: Date.now(),
          updateTime: Date.now(),
        });
      });
    } else {
      const getKey = (item: IQuickLinksItem) => `${item.name}___${item.value}`;
      const exists = new Set(data.map(item => getKey(item)));
      const newDataWithId = newData
        // 合并模式，需要过滤已存在的内容
        .filter(item => !exists.has(getKey(item)))
        .map(item => ({
          ...item,
          id: `quick_${randomString(12)}`,
        }));
      setData([...newDataWithId, ...data]);
      newDataWithId.forEach((item) => {
        setAccessData(item.id, {
          accessCount: 0,
          createTime: Date.now(),
          updateTime: Date.now(),
        });
      });
    }

    return true;
  };

  /**
   * 记录快捷链接访问次数
   */
  const accessQuickLink = (id: string) => {
    setAccessData(id, currentItemAccessData => ({
      lastAccessTime: Date.now(),
      accessCount: (currentItemAccessData.accessCount || 0) + 1,
    }));
  };

  return {
    accessQuickLink,
    finalData,
    accessData,
    selectedIndex,
    setSelectIndex,
    currentItem,
    removeCurrentItem,
    isDeleteConfirm: isConfirm,
    addItem,
    editItem,
    importData,
  };
}
