/**
 * Retry policy for bringing the caller's current account into view.
 *
 * `SectionList.scrollToLocation` can only reach a row the list has already
 * measured. On a chart of accounts of any size the target is usually still
 * unmeasured on the first frame, so the scroll silently does nothing and the
 * screen's contract ("the current account is scrolled into view") is broken.
 * The list's own `onScrollToIndexFailed` is the only failure signal there is, so
 * recovery is driven from it — bounded, because a list that will never measure
 * the row must not be re-scrolled forever, and because the user may have started
 * scrolling themselves.
 *
 * Pure and import-free so the jest-lite runner can require it.
 */

/** Hard ceiling on re-issued scrolls, whatever the list reports. */
export const SCROLL_RETRY_LIMIT = 5;

/**
 * Consecutive failures with no newly measured cells before giving up. One stall
 * is expected — a retry can land between two measurement passes — but a list
 * that measures nothing across two is not going to reach the row.
 */
export const SCROLL_RETRY_STALL_LIMIT = 1;

/** How long to wait before re-issuing, giving the list a frame to measure. */
export const SCROLL_RETRY_DELAY_MS = 120;

/**
 * How long a scroll is given to fail before it counts as landed. There is no
 * success callback; `onScrollToIndexFailed` is raised during the attempt, so a
 * quiet window after it means the row was reached.
 */
export const SCROLL_SETTLE_MS = 64;

export type ScrollRetryState = {
  /** Scrolls issued that came back as failures. */
  attempts: number;
  /** Consecutive failures that measured nothing new. */
  stalls: number;
  /** The furthest cell the list has reported measuring. */
  highestMeasuredFrameIndex: number;
};

export const initialScrollRetryState: ScrollRetryState = {
  attempts: 0,
  stalls: 0,
  highestMeasuredFrameIndex: -1,
};

/**
 * Fold one `onScrollToIndexFailed` into the policy: the next state, and whether
 * the scroll is worth re-issuing.
 */
export function scrollRetryAfterFailure(
  state: ScrollRetryState,
  info: { highestMeasuredFrameIndex: number },
): { retry: boolean; state: ScrollRetryState } {
  const measured = Math.max(info.highestMeasuredFrameIndex, -1);
  const progressed = measured > state.highestMeasuredFrameIndex;
  const next: ScrollRetryState = {
    attempts: state.attempts + 1,
    stalls: progressed ? 0 : state.stalls + 1,
    highestMeasuredFrameIndex: Math.max(
      measured,
      state.highestMeasuredFrameIndex,
    ),
  };
  return {
    retry:
      next.attempts < SCROLL_RETRY_LIMIT &&
      next.stalls <= SCROLL_RETRY_STALL_LIMIT,
    state: next,
  };
}
