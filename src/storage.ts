import { useMemoizedFn, useUpdateEffect } from 'ahooks';
import { createGlobalStore } from 'hox';
import { useState } from 'react';

/**
 * 快捷链接数据
 */
export interface IQuickLinksItem {
  id: string;
  name: string;
  value: string;
  type?: 'link' | 'snippet';
  groupId?: string;
}

/**
 * 快捷链接访问数据（内部用）
 */
export interface IQuickLinksAccessData {
  lastAccessTime?: number;
  accessCount?: number;
  createTime?: number;
  updateTime?: number;
}

/**
 * 分组类型
 */
export type GroupType = 'default' | 'remote';

/**
 * 分组数据
 */
export interface IQuickLinksGroup {
  id: string;
  name: string;
  color: string;
  type: GroupType;
  remoteUrl?: string;
  createTime: number;
  updateTime: number;
}

export const QUICK_LINKS_STORAGE_KEY = 'quickLinks';
export const QUICK_LINKS_ACCESS_DATA_STORAGE_KEY = 'quickLinksAccessData';
export const QUICK_LINKS_GROUPS_STORAGE_KEY = 'quickLinksGroups';
export const QUICK_LINKS_SELECTED_GROUP_STORAGE_KEY = 'quickLinksSelectedGroup';
export const QUICK_LINKS_REMOTE_CACHE_STORAGE_KEY = 'quickLinksRemoteCache';

/**
 * 校验快捷链接数据
 * @param quickLinks 快捷链接数据
 * @returns 是否校验通过
 */
export function validateQuickLinks(
  quickLinks: unknown,
): quickLinks is IQuickLinksItem[] {
  if (!Array.isArray(quickLinks)) {
    return false;
  }

  for (const item of quickLinks) {
    if (typeof item.name !== 'string' || typeof item.value !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * 获取快捷链接数据
 * @returns 快捷链接数据
 */
export function getQuickLinksData(): IQuickLinksItem[] {
  const data = window.utools.dbStorage.getItem(QUICK_LINKS_STORAGE_KEY);
  if (validateQuickLinks(data)) {
    return data;
  }
  return [];
}

/**
 * 设置快捷链接数据
 * @param quickLinks 快捷链接数据
 */
export function setQuickLinksData(quickLinks: IQuickLinksItem[]) {
  window.utools.dbStorage.setItem(QUICK_LINKS_STORAGE_KEY, quickLinks);
}

export function useQuickLinksDataState() {
  const [quickLinks, setQuickLinks] =
    useState<IQuickLinksItem[]>(getQuickLinksData);

  useUpdateEffect(() => {
    setQuickLinksData(quickLinks);
  }, [quickLinks]);

  return [quickLinks, setQuickLinks] as const;
}

export function getQuickLinksAccessData(): Record<
  string,
  IQuickLinksAccessData
  > {
  const data = window.utools.dbStorage.getItem(
    QUICK_LINKS_ACCESS_DATA_STORAGE_KEY,
  );
  if (data && typeof data === 'object') {
    return data;
  }
  return {};
}

export function setQuickLinksAccessData(
  accessData: Record<string, IQuickLinksAccessData>,
) {
  window.utools.dbStorage.setItem(
    QUICK_LINKS_ACCESS_DATA_STORAGE_KEY,
    accessData,
  );
}

export function useQuickLinksAccessDataItem() {
  const [accessData, _setAccessData] = useState(getQuickLinksAccessData);

  const getAccessData = useMemoizedFn((id: string) => accessData[id]);

  const setAccessData = useMemoizedFn(
    (
      id: string,
      data?:
        | IQuickLinksAccessData
        | ((prev: IQuickLinksAccessData) => IQuickLinksAccessData),
    ) => {
      if (data) {
        _setAccessData(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            ...(typeof data === 'function' ? data(prev[id]) : data),
          },
        }));
      } else {
        _setAccessData((prev) => {
          const newAccessData = { ...prev };
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete newAccessData[id];
          return newAccessData;
        });
      }
    },
  );

  const clearAccessData = useMemoizedFn(() => {
    _setAccessData({});
  });

  useUpdateEffect(() => {
    setQuickLinksAccessData(accessData);
  }, [accessData]);

  return [
    accessData,
    setAccessData,
    { getAccessData, clearAccessData },
  ] as const;
}

/**
 * 校验分组数据
 * @param groups 分组数据
 * @returns 是否校验通过
 */
export function validateQuickLinksGroups(
  groups: unknown,
): groups is IQuickLinksGroup[] {
  if (!Array.isArray(groups)) {
    return false;
  }

  for (const group of groups) {
    if (
      typeof group.id !== 'string' ||
      typeof group.name !== 'string' ||
      typeof group.color !== 'string' ||
      !['default', 'remote'].includes(group.type) ||
      typeof group.createTime !== 'number' ||
      typeof group.updateTime !== 'number'
    ) {
      return false;
    }
  }

  return true;
}

/**
 * 获取分组数据
 * @returns 分组数据
 */
export function getQuickLinksGroupsData(): IQuickLinksGroup[] {
  const data = window.utools.dbStorage.getItem(QUICK_LINKS_GROUPS_STORAGE_KEY);
  if (validateQuickLinksGroups(data)) {
    return data;
  }
  return [];
}

/**
 * 设置分组数据
 * @param groups 分组数据
 */
export function setQuickLinksGroupsData(groups: IQuickLinksGroup[]) {
  window.utools.dbStorage.setItem(QUICK_LINKS_GROUPS_STORAGE_KEY, groups);
}

/**
 * 获取选中的分组ID
 * @returns 选中的分组ID，默认为 'all'
 */
export function getSelectedGroupId(): string {
  return window.utools.dbStorage.getItem(QUICK_LINKS_SELECTED_GROUP_STORAGE_KEY) || 'all';
}

/**
 * 设置选中的分组ID
 * @param groupId 分组ID
 */
export function setSelectedGroupId(groupId: string) {
  window.utools.dbStorage.setItem(QUICK_LINKS_SELECTED_GROUP_STORAGE_KEY, groupId);
}

/**
 * 获取远程分组缓存
 * @returns 远程分组缓存数据
 */
export function getRemoteGroupCache(): Record<string, { data: IQuickLinksItem[]; timestamp: number }> {
  const data = window.utools.dbStorage.getItem(QUICK_LINKS_REMOTE_CACHE_STORAGE_KEY);
  if (data && typeof data === 'object') {
    return data;
  }
  return {};
}

/**
 * 设置远程分组缓存
 * @param cache 缓存数据
 */
export function setRemoteGroupCache(cache: Record<string, { data: IQuickLinksItem[]; timestamp: number }>) {
  window.utools.dbStorage.setItem(QUICK_LINKS_REMOTE_CACHE_STORAGE_KEY, cache);
}

export const [useQuickLinksGroupsState] = createGlobalStore(() => {
  const [groups, setGroups] = useState<IQuickLinksGroup[]>(getQuickLinksGroupsData);

  useUpdateEffect(() => {
    setQuickLinksGroupsData(groups);
  }, [groups]);

  return [groups, setGroups] as const;
});

export function useSelectedGroupState() {
  const [selectedGroupId, setSelectedGroupIdState] = useState<string>(getSelectedGroupId);

  useUpdateEffect(() => {
    setSelectedGroupId(selectedGroupId);
  }, [selectedGroupId]);

  return [selectedGroupId, setSelectedGroupIdState] as const;
}

type RemoteGroupCacheType = Record<string, {
    data: (IQuickLinksItem & {
      matchFn?: (keyword: string) => unknown;
    })[];
    timestamp: number;
  }>;

export function useRemoteGroupCacheState() {
  const [cache, setCache] = useState<RemoteGroupCacheType>(getRemoteGroupCache);

  useUpdateEffect(() => {
    setRemoteGroupCache(cache);
  }, [cache]);

  return [cache, setCache] as const;
}
