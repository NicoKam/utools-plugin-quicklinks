import { useMemoizedFn, useUpdateEffect } from 'ahooks';
import { useState } from 'react';

/**
 * 快捷链接数据
 */
export interface IQuickLinksItem {
  id: string;
  name: string;
  value: string;
  type?: 'link' | 'snippet';
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

export const QUICK_LINKS_STORAGE_KEY = 'quickLinks';
export const QUICK_LINKS_ACCESS_DATA_STORAGE_KEY = 'quickLinksAccessData';

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
