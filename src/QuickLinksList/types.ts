export interface IQuickLinksItem {
  name: string;
  value: string;
  createTime?: number;
  updateTime?: number;
  lastAccessTime?: number;
  accessCount?: number;
  type?: 'link' | 'snippet';
}