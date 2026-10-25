/**
 * Whether a router transition only changes the `lang` search value while
 * keeping the same route, path and params. Changing language is an
 * in-place preference transition (the URL sync is a replace), so departure
 * guards must not treat it as leaving the current draft (w4/1088).
 */
export interface TransitionSide {
  routeId?: unknown;
  pathname?: string;
  params?: unknown;
  search?: unknown;
}

function withoutLang(search: unknown) {
  const rest = { ...((search ?? {}) as Record<string, unknown>) };
  delete rest.lang;
  return rest;
}

export function isLanguageOnlyTransition(
  current: TransitionSide | undefined,
  next: TransitionSide | undefined,
): boolean {
  if (!current || !next) return false;
  if (current.routeId !== next.routeId) return false;
  if (current.pathname !== next.pathname) return false;
  if (
    JSON.stringify(current.params ?? null) !==
    JSON.stringify(next.params ?? null)
  ) {
    return false;
  }
  return (
    JSON.stringify(withoutLang(current.search)) ===
    JSON.stringify(withoutLang(next.search))
  );
}
