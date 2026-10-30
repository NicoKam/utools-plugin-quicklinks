import type { IQuickLinksItem } from '../storage';
import { parseLocation } from '../../shared/location.mjs';

export function getQuickLinkDisplayName(item: IQuickLinksItem): string {
  if (item.type !== 'code' || item.name.trim())
    return item.name;
  try {
    const { path } = parseLocation(item.value);
    return path.split(/[\\/]/).at(-1) || path;
  } catch {
    return item.value;
  }
}
