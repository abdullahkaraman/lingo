// Turkish locale-aware uppercase. Handles i→İ and ı→I correctly.
export function normalize(str: string): string {
  return str.toLocaleUpperCase('tr-TR')
}
