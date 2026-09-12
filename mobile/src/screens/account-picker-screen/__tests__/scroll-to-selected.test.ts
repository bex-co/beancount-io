import {
  SCROLL_RETRY_LIMIT,
  SCROLL_RETRY_STALL_LIMIT,
  initialScrollRetryState,
  scrollRetryAfterFailure,
  type ScrollRetryState,
} from "../scroll-to-selected";

/** Replay a run of failures, returning each decision. */
function replay(measured: number[]): {
  retries: boolean[];
  state: ScrollRetryState;
} {
  let state = initialScrollRetryState;
  const retries: boolean[] = [];
  for (const highestMeasuredFrameIndex of measured) {
    const step = scrollRetryAfterFailure(state, {
      highestMeasuredFrameIndex,
    });
    retries.push(step.retry);
    state = step.state;
  }
  return { retries, state };
}

describe("account picker scroll retry policy", () => {
  it("retries a first failure, which is the common case on a cold list", () => {
    // The regression: the screen marked the scroll done before issuing it, so an
    // unmeasured target meant the selected account was never revealed.
    const { retries } = replay([4]);
    expect(retries).toEqual([true]);
  });

  it("keeps retrying while the list measures more cells", () => {
    const { retries, state } = replay([4, 9, 15, 22]);
    expect(retries).toEqual([true, true, true, true]);
    expect(state.stalls).toBe(0);
    expect(state.highestMeasuredFrameIndex).toBe(22);
  });

  it("gives up after the attempt budget even while measurement progresses", () => {
    const measured = Array.from(
      { length: SCROLL_RETRY_LIMIT },
      (_, i) => (i + 1) * 5,
    );
    const { retries, state } = replay(measured);
    expect(retries.slice(0, SCROLL_RETRY_LIMIT - 1).every(Boolean)).toBe(true);
    expect(retries[SCROLL_RETRY_LIMIT - 1]).toBe(false);
    expect(state.attempts).toBe(SCROLL_RETRY_LIMIT);
  });

  it("tolerates one stall, since a retry can land between measurement passes", () => {
    const { retries } = replay([6, 6]);
    expect(retries).toEqual([true, true]);
  });

  it("gives up once measurement stalls for good", () => {
    // The first failure always counts as progress (it measures past the initial
    // -1), so a run of give-up length is one longer than the stall budget.
    const stalls = Array.from(
      { length: SCROLL_RETRY_STALL_LIMIT + 2 },
      () => 6,
    );
    const { retries } = replay(stalls);
    expect(retries[retries.length - 1]).toBe(false);
  });

  it("does not count a regressing measurement as progress", () => {
    // A list that re-windows can report a lower high-water mark; that is not a
    // reason to believe another attempt will do better.
    const { retries, state } = replay([10, 3, 2]);
    expect(retries[retries.length - 1]).toBe(false);
    expect(state.highestMeasuredFrameIndex).toBe(10);
  });

  it("treats a list that has measured nothing as a stall, not progress", () => {
    // `highestMeasuredFrameIndex` starts at -1, so a report of -1 (or 0 frames
    // measured at all) must not read as movement.
    const first = scrollRetryAfterFailure(initialScrollRetryState, {
      highestMeasuredFrameIndex: -1,
    });
    expect(first.state.stalls).toBe(1);
    expect(first.retry).toBe(true);
  });

  it("never mutates the state handed to it", () => {
    const state = initialScrollRetryState;
    scrollRetryAfterFailure(state, { highestMeasuredFrameIndex: 7 });
    expect(state).toEqual({
      attempts: 0,
      stalls: 0,
      highestMeasuredFrameIndex: -1,
    });
  });
});
