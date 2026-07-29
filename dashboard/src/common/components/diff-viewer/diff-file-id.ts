export function getDiffFileId(filename: string): string {
  return `diff-file-${encodeURIComponent(filename)}`;
}
