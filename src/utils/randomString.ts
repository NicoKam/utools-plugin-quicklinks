export function randomString(length = 12): string {
  if (length <= 0) {
    return '';
  }
  const str = Math.random()
    .toString(36)
    .substring(2, 2 + length);

  if (str.length >= length) {
    return str;
  }
  return str + randomString(length - str.length);
}