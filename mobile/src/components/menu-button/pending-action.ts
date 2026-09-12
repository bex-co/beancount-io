/**
 * The menu's "run this after the sheet is gone" slot.
 *
 * A menu row's callback cannot run while the menu's `Modal` is still on screen:
 * iOS refuses to present a second view controller (the share sheet, a photo
 * picker, an alert) from one that is dismissing, so the action silently never
 * appears. The row therefore only *remembers* its callback, and the modal's own
 * dismissal fires it.
 *
 * Pure and RN-free so the lifecycle is unit-testable: select → dismiss fires it
 * exactly once; cancel (backdrop tap, hardware back) fires nothing.
 */
export type PendingMenuAction = {
  /** Remember the tapped row's callback. */
  select: (action: () => void) => void;
  /** Run the remembered callback, at most once per selection. */
  flush: () => void;
  /** Forget it — a cancelled menu must not act. */
  cancel: () => void;
  /** Whether a callback is still waiting for a dismissal. */
  isPending: () => boolean;
};

export function createPendingMenuAction(): PendingMenuAction {
  let pending: (() => void) | null = null;
  return {
    select(action) {
      pending = action;
    },
    flush() {
      const action = pending;
      // Cleared before invoking: a second dismissal event — or a callback that
      // re-enters this menu — must not run the same action twice.
      pending = null;
      action?.();
    },
    cancel() {
      pending = null;
    },
    isPending() {
      return pending !== null;
    },
  };
}
