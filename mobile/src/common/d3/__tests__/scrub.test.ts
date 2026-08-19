import {
  SCRUB_IDLE,
  activeScrubIndex,
  scrubIndexForX,
  scrubbedValue,
  shouldTickHaptic,
  shownScrubIndex,
} from "../scrub";

// A 100pt plot with 10pt padding puts five points at x = 10, 30, 50, 70, 90.
const WIDTH = 100;
const PAD = 10;
const COUNT = 5;

const indexAt = (x: number) => scrubIndexForX(x, WIDTH, COUNT, PAD);

test("a touch on a point resolves to that point", () => {
  expect(indexAt(10)).toBe(0);
  expect(indexAt(30)).toBe(1);
  expect(indexAt(50)).toBe(2);
  expect(indexAt(70)).toBe(3);
  expect(indexAt(90)).toBe(4);
});

test("a touch between points takes the nearer one", () => {
  expect(indexAt(19)).toBe(0);
  expect(indexAt(21)).toBe(1);
  expect(indexAt(39)).toBe(1);
  expect(indexAt(41)).toBe(2);
});

test("a touch outside the plot holds the end point", () => {
  // Dragging past the edge keeps scrubbing the last point rather than running
  // off the series — the cursor must never leave the curve.
  expect(indexAt(-500)).toBe(0);
  expect(indexAt(0)).toBe(0);
  expect(indexAt(500)).toBe(4);
  expect(indexAt(WIDTH)).toBe(4);
});

test("a single-point series resolves to its one point wherever it is touched", () => {
  // A one-month ledger: the chart declines to draw a line, but the math must
  // not divide by a zero-length axis.
  expect(scrubIndexForX(0, WIDTH, 1, PAD)).toBe(0);
  expect(scrubIndexForX(50, WIDTH, 1, PAD)).toBe(0);
  expect(scrubIndexForX(500, WIDTH, 1, PAD)).toBe(0);
});

test("an empty series has nothing to scrub", () => {
  // Not index 0 — that would put a cursor on a curve that was never drawn.
  expect(scrubIndexForX(50, WIDTH, 0, PAD)).toBe(SCRUB_IDLE);
});

test("a plot narrower than its own padding does not produce NaN", () => {
  // Reachable on a very small screen before layout settles.
  expect(scrubIndexForX(5, 20, COUNT, PAD)).toBe(0);
  expect(scrubIndexForX(5, 10, COUNT, PAD)).toBe(0);
});

test("the resting chart shows its latest point", () => {
  expect(shownScrubIndex(SCRUB_IDLE, COUNT)).toBe(4);
  expect(scrubbedValue([1, 2, 3], SCRUB_IDLE)).toBe(3);
});

test("a scrubbed index shows that point", () => {
  expect(shownScrubIndex(2, COUNT)).toBe(2);
  expect(scrubbedValue([1, 2, 3], 0)).toBe(1);
  expect(scrubbedValue([1, 2, 3], 1)).toBe(2);
});

test("an index left over from a longer series falls back to the latest point", () => {
  // A range switch can land a shorter array under a finger that is still down.
  expect(shownScrubIndex(9, COUNT)).toBe(4);
  expect(scrubbedValue([1, 2, 3], 9)).toBe(3);
});

test("an empty series has no value to show", () => {
  expect(shownScrubIndex(0, 0)).toBe(SCRUB_IDLE);
  expect(scrubbedValue([], 0)).toBe(0);
  expect(scrubbedValue([], SCRUB_IDLE)).toBe(0);
});

test("the resting plot draws no cursor", () => {
  // Where the header falls back to the latest point, the plot shows nothing —
  // the two differ only here, which is why each asks its own function.
  expect(activeScrubIndex(SCRUB_IDLE, COUNT)).toBe(SCRUB_IDLE);
  expect(shownScrubIndex(SCRUB_IDLE, COUNT)).toBe(4);
});

test("the cursor sits on the scrubbed point", () => {
  expect(activeScrubIndex(0, COUNT)).toBe(0);
  expect(activeScrubIndex(2, COUNT)).toBe(2);
  expect(activeScrubIndex(4, COUNT)).toBe(4);
});

test("a stale index clamps the cursor instead of blinking it off the curve", () => {
  // A range switch under a live finger shortens the series. The header clamps,
  // so the cursor has to clamp with it or the two disagree for a frame.
  expect(activeScrubIndex(9, COUNT)).toBe(4);
  expect(activeScrubIndex(9, COUNT)).toBe(shownScrubIndex(9, COUNT));
});

test("an empty series draws no cursor", () => {
  expect(activeScrubIndex(0, 0)).toBe(SCRUB_IDLE);
  expect(activeScrubIndex(SCRUB_IDLE, 0)).toBe(SCRUB_IDLE);
});

test("crossing to another point ticks", () => {
  expect(shouldTickHaptic(3, 4)).toBeTruthy();
  expect(shouldTickHaptic(4, 3)).toBeTruthy();
});

test("holding still does not tick", () => {
  // The gate that keeps a scrub from buzzing: at frame rate the index is
  // unchanged for most frames, and each one must be silent.
  expect(shouldTickHaptic(3, 3)).toBeFalsy();
});

test("touching in does not tick", () => {
  // Landing a finger gets the impact haptic instead; a tick here would double
  // up on the point the impact just announced.
  expect(shouldTickHaptic(SCRUB_IDLE, 3)).toBeFalsy();
});

test("lifting off does not tick", () => {
  expect(shouldTickHaptic(3, SCRUB_IDLE)).toBeFalsy();
});

test("a reaction's first run does not tick", () => {
  // `useAnimatedReaction` hands `null` as the previous value on its first run,
  // which is not something the user did.
  expect(shouldTickHaptic(null, 3)).toBeFalsy();
  expect(shouldTickHaptic(null, SCRUB_IDLE)).toBeFalsy();
});
