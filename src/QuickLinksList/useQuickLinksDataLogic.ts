import { get } from 'lodash-es';
import { pinyin } from 'pinyin-pro';
import { useEffect, useMemo } from 'react';
import { useMemoizedFn } from 'ahooks';
import {
  IQuickLinksItem,
  IQuickLinksGroup,
  useQuickLinksAccessDataItem,
  useQuickLinksDataState,
  useQuickLinksGroupsState,
  useSelectedGroupState,
  useRemoteGroupCacheState,
} from '../storage';
import { randomString } from '../utils/randomString';
import useSecondaryConfirm from '../utils/useSecondaryConfirm';
import { useSelectIndexWithKeyboard } from '../utils/useSelectIndex';
import useSubInput from '../utils/useSubInput';
import { matchesFuzzy2 } from '../utils/vscode-utils/filters';
import { CmdKey } from './const';

const newId = () => `quick_${randomString(12)}`;

const genRemoteId = (groupId: string, item: IQuickLinksItem) => `remote_${groupId}____${item.name}____${item.value}`;

function addPinyin(data: IQuickLinksItem[]) {
  return data.map((item) => {
    const pinyinStr = pinyin(item.name, {
      toneType: 'none',
      nonZh: 'consecutive',
      separator: '-',
    });
    return {
      ...item,
      pinyin: pinyinStr === item.name ? '' : pinyinStr,
    };
  });
}

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
  // 分组数据
  const [groups] = useQuickLinksGroupsState();
  // 当前选中的分组
  const [selectedGroupId, setSelectedGroupId] = useSelectedGroupState();
  // 分组数据缓存
  const [remoteCache, setRemoteCache] = useRemoteGroupCacheState();

  const pinyinData = useMemo(
    () =>
      addPinyin(data),
    [data],
  );

  const remoteData = useMemo(() => Object.values(remoteCache)
    .map(item => item.data)
    .flat(), [remoteCache]);

  console.log('wkn-remoteData', remoteData);

  // TODO 加载远程数据

  // 合并本地数据和远程数据
  const allData = useMemo(() => [...pinyinData, ...remoteData], [pinyinData, remoteData]);

  // 按分组过滤数据
  const groupFilteredData = useMemo(() => {
    if (!selectedGroupId || selectedGroupId === 'all') {
      return allData;
    }
    return allData.filter(item => item.groupId === selectedGroupId);
  }, [allData, selectedGroupId]);

  // 过滤关键字
  const filteredData = useMemo(() => {
    if (subInput) {
      return groupFilteredData.map((item) => {
        const { pinyin, name } = item;
        const match = matchesFuzzy2(subInput, name);
        if (match) {
          return {
            ...item,
            match,
          };
        }
        if (pinyin) {
          const matchPinyin = matchesFuzzy2(subInput, pinyin);
          if (matchPinyin) {
            return {
              ...item,
              match: true,
            };
          }
        }
        return {
          ...item,
          match: false,
        };
      })
        .filter(item => Boolean(item.match));
    }
    return groupFilteredData.map(item => ({
      ...item,
      match: false,
    }));
  }, [subInput, groupFilteredData]);

  // 排序
  const finalData = useMemo(() => {
    const sortedData = filteredData.slice()
      .sort((a, b) => {
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
        return {
          ...item,
          timeRange: currentRange,
        };
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

  const {
    isConfirm,
    confirm,
    cancelConfirm,
  } = useSecondaryConfirm();

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
      accessCount: (currentItemAccessData?.accessCount || 0) + 1,
    }));
  };

  // 分组相关操作
  const clearGroupData = (groupId: string) => {
    setData(data => data.map(item =>
      item.groupId === groupId ? {
        ...item,
        groupId: undefined,
      } : item,
    ));
  };

  const fetchRemoteGroupData = useMemoizedFn(async (group: IQuickLinksGroup) => {
    if (group.type !== 'remote' || !group.remoteUrl) return;

    try {
      const response = await fetch(group.remoteUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const remoteData = await response.json();

      // 验证远程数据格式
      if (Array.isArray(remoteData) && remoteData.every(item =>
        typeof item.name === 'string' && typeof item.value === 'string',
      )) {
        // 为远程数据添加ID
        const processedData = remoteData.map(item => ({
          ...item,
          id: genRemoteId(group.id, item),
          type: item.type || 'link',
          groupId: group.id,
        }));

        setRemoteCache(prev => ({
          ...prev,
          [group.id]: {
            data: processedData,
            timestamp: Date.now(),
          },
        }));
      } else {
        console.error('Invalid remote data format');
      }
    } catch (error) {
      console.error('Failed to fetch remote group data:', error);
    }
  });

  // 获取远程分组数据
  useEffect(() => {
    const remoteGroups = groups.filter(group => group.type === 'remote');
    remoteGroups.forEach((group) => {
      fetchRemoteGroupData(group);
    });
  }, [groups]);

  const clearRemoteGroupCache = (groupId: string) => {
    setRemoteCache((prev) => {
      const newCache = { ...prev };
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete newCache[groupId];
      return newCache;
    });
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
    // 分组相关
    groups,
    selectedGroupId,
    setSelectedGroupId,
    clearGroupData,
    fetchRemoteGroupData,
    clearRemoteGroupCache,
  };
}
