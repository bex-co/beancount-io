/**
 * For the flex row that holds a `Sidebar` and its content. The desktop pane is
 * fixed to the physical left, but its in-flow gap follows the row's inline
 * direction, so under `dir="rtl"` (Persian) the gap moved to the right and the
 * content slid underneath the pane. Reversing the row in RTL keeps the gap on
 * the pane's side while everything inside stays right-to-left.
 */
export const SIDEBAR_ROW_DIRECTION = "rtl:flex-row-reverse";
