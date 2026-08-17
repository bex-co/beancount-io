/**
 * Shared constants and helpers for the resizable sidebar.
 *
 * Kept in a standalone module (no React imports) so the width math can be
 * unit-tested in isolation and reused by both the provider and the drag rail.
 */

/** Cookie holding the sidebar open/collapsed state (boolean, JSON-encoded). */
export const SIDEBAR_STATE_COOKIE = "sidebar_state";
/** Cookie holding the persisted sidebar width in pixels. */
export const SIDEBAR_WIDTH_COOKIE = "sidebar_width";

/** Narrowest the sidebar may be dragged (px). */
export const SIDEBAR_MIN_WIDTH_PX = 192;
/** Default / first-run sidebar width (px) — matches the previous `16rem`. */
export const SIDEBAR_DEFAULT_WIDTH_PX = 256;
/** Widest the sidebar may be dragged (px). */
export const SIDEBAR_MAX_WIDTH_PX = 384;
/**
 * Dragging the rail narrower than this snaps the sidebar collapsed to the icon
 * rail instead of clamping at the minimum width; dragging back past it
 * re-expands. Kept below the min so there's a clear pull-in gesture.
 */
export const SIDEBAR_COLLAPSE_AT_PX = 140;
/** Keyboard arrow-key resize increment (px). */
export const SIDEBAR_WIDTH_STEP_PX = 16;

/** Shared cookie options — module-level so the reference stays stable across renders. */
export const SIDEBAR_COOKIE_OPTIONS: Cookies.CookieAttributes = {
  expires: 7,
  path: "/",
};

/**
 * Round and clamp a candidate width into [min, max]. Non-finite input
 * (NaN from a malformed cookie, etc.) falls back to the default width.
 */
export function clampSidebarWidth(px: number): number {
  if (!Number.isFinite(px)) {
    return SIDEBAR_DEFAULT_WIDTH_PX;
  }
  return Math.min(
    SIDEBAR_MAX_WIDTH_PX,
    Math.max(SIDEBAR_MIN_WIDTH_PX, Math.round(px)),
  );
}

/** Serialize a width for cookie storage (plain integer string, no JSON quotes). */
export function serializeSidebarWidth(px: number): string {
  return String(clampSidebarWidth(px));
}

/** Read a width back from its cookie string, clamping defensively. */
export function deserializeSidebarWidth(raw: string): number {
  return clampSidebarWidth(Number(raw));
}
