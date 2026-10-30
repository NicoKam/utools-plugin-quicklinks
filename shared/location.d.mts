export type FileLocation = { path: string; position: 'file'; line?: undefined; column?: undefined }
  | { path: string; position: 'line'; line: number; column: number };
export function parseLocation(value: string): FileLocation;
export function encodeFilePath(path: string): string;
