import { get } from 'lodash-es';
import { pinyin } from 'pinyin-pro';
import { useEffect, useMemo } from 'react';
import {
  IQuickLinksItem,
  useQuickLinksAccessDataItem,
  useQuickLinksDataState,
} from '../storage';
import { randomString } from '../utils/randomString';
import useSecondaryConfirm from '../utils/useSecondaryConfirm';
import { useSelectIndexWithKeyboard } from '../utils/useSelectIndex';
import useSubInput from '../utils/useSubInput';
import { matchesFuzzy2 } from '../utils/vscode-utils/filters';
import { CmdKey } from './const';

const newId = () => `quick_${randomString(12)}`;

// 辅助函数：判断时间所属范围
const getTimeRange = (timestamp: number) => {
  if (!timestamp) return '更早';

  const date = new Date(timestamp);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const thisWeekStart = new Date(
    todayStart.getTime() - (now.getDay() || 7 - 1) * 24 * 60 * 60 * 1000,
  );
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  if (date >= todayStart) return '今天';
  if (date >= yesterdayStart) return '昨天';
  if (date >= thisWeekStart) return '本周';
  if (date >= thisMonthStart) return '本月';
  return '更早';
};

/**
 * 快捷链接数据逻辑
 */
export default function useQuickLinksDataLogic() {
  const subInput = useSubInput({ placeholder: `搜索(${CmdKey}+F)` });

  const [data, setData] = useQuickLinksDataState();
  const [accessData, setAccessData, { clearAccessData }] =
    useQuickLinksAccessDataItem();

  const pinyinData = useMemo(
    () =>
      data.map((item) => {
        const pinyinStr = pinyin(item.name, {
          toneType: 'none',
          nonZh: 'consecutive',
          separator: '-',
        });
        return {
          ...item,
          pinyin: pinyinStr === item.name ? '' : pinyinStr,
        };
      }),
    [data],
  );

  // 过滤关键字
  const filteredData = useMemo(() => {
    if (subInput) {
      return pinyinData.filter(({ name, pinyin }) => {
        // return name.includes(subInput);
        if (matchesFuzzy2(subInput, name)) {
          return true;
        }
        if (pinyin && matchesFuzzy2(subInput, pinyin)) {
          return true;
        }
        return false;
      });
    }
    return data;
  }, [subInput, pinyinData]);

  // 排序
  const finalData = useMemo(() => {
    const sortedData = filteredData.slice().sort((a, b) => {
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
    });

    let prevRange: string | null = null;
    return sortedData.map((item, index) => {
      const date = get(
        accessData,
        [item.id, 'lastAccessTime'],
        get(accessData, [item.id, 'updateTime'], 0),
      );
      const currentRange = getTimeRange(date);

      if (index === 0 || currentRange !== prevRange) {
        prevRange = currentRange;
        return { ...item, timeRange: currentRange };
      }
      return {
        ...item,
        timeRange: '',
      };
    });
  }, [filteredData, accessData]);

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
