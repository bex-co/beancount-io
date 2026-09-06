export function canWriteLedger(
  permissions?: { push: boolean; admin: boolean } | null,
): boolean {
  return permissions?.push === true || permissions?.admin === true;
}
