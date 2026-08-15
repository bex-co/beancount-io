import {
  MAX_FEEDBACK_MS,
  MAX_TRANSITION_MS,
  STAGGER_WINDOW,
  clamp01,
  durations,
  easings,
  loopDurations,
  springs,
  staggeredProgress,
} from "../motion";

test("every transition duration stays inside the motion budget", () => {
  // The budget is the whole point of the module: past ~500ms a transition
  // stops reading as motion and starts reading as latency.
  Object.values(durations).forEach((value) => {
    expect(value <= MAX_TRANSITION_MS).toBe(true);
    expect(value >= 0).toBe(true);
  });
});

test("durations ascend from instant to chart", () => {
  const ordered = [
    durations.instant,
    durations.fast,
    durations.base,
    durations.slow,
    durations.chart,
  ];
  ordered.forEach((value, i) => {
    if (i > 0) {
      expect(value > ordered[i - 1]).toBe(true);
    }
  });
});

test("the direct-feedback duration is tighter than the feedback ceiling", () => {
  // `fast` is what press states and the selection indicator use; if it ever
  // drifts past the feedback ceiling those interactions start feeling laggy.
  expect(durations.fast <= MAX_FEEDBACK_MS).toBe(true);
});

test("the skeleton pulse is a loop, exempt from the transition budget", () => {
  // Ambient loops are deliberately slower than any transition — a pulse at
  // transition speed reads as a nervous throb.
  expect(loopDurations.pulse > MAX_TRANSITION_MS).toBe(true);
});

test("easings are well-formed cubic-bezier control points", () => {
  Object.values(easings).forEach((curve) => {
    expect(curve.length).toBe(4);
    // x control points must stay in 0..1 or the curve is not a valid timing
    // function; y may overshoot, which is how a curve gets its bounce.
    expect(curve[0] >= 0 && curve[0] <= 1).toBe(true);
    expect(curve[2] >= 0 && curve[2] <= 1).toBe(true);
  });
});

test("spring presets carry a positive mass, damping and stiffness", () => {
  Object.values(springs).forEach((spring) => {
    expect(spring.damping > 0).toBe(true);
    expect(spring.stiffness > 0).toBe(true);
    expect(spring.mass > 0).toBe(true);
  });
});

test("clamp01 pins values to the unit range", () => {
  expect(clamp01(-2)).toBe(0);
  expect(clamp01(0)).toBe(0);
  expect(clamp01(0.37)).toBe(0.37);
  expect(clamp01(1)).toBe(1);
  expect(clamp01(4)).toBe(1);
});

test("a lone bar ignores the stagger and tracks the sweep directly", () => {
  expect(staggeredProgress(0, 0, 1)).toBe(0);
  expect(staggeredProgress(0.5, 0, 1)).toBe(0.5);
  expect(staggeredProgress(1, 0, 1)).toBe(1);
});

test("the first bar starts immediately and the last one starts last", () => {
  // At the very start of the sweep only the leading bar has begun.
  expect(staggeredProgress(0, 0, 5) === 0).toBe(true);
  expect(staggeredProgress(0.1, 0, 5) > 0).toBe(true);
  expect(staggeredProgress(0.1, 4, 5)).toBe(0);
});

test("every bar is fully grown once the sweep completes", () => {
  // This is what keeps the whole cascade inside one duration token: no bar may
  // still be mid-growth at progress 1, however many there are.
  [2, 5, 12, 36].forEach((count) => {
    for (let i = 0; i < count; i++) {
      expect(staggeredProgress(1, i, count)).toBe(1);
    }
  });
});

test("the last bar's start is exactly the stagger window", () => {
  // Just before its start it has not moved; just after, it has.
  expect(staggeredProgress(STAGGER_WINDOW, 4, 5)).toBe(0);
  expect(staggeredProgress(STAGGER_WINDOW + 0.01, 4, 5) > 0).toBe(true);
});

test("bar progress never leaves the unit range", () => {
  [-0.5, 0, 0.3, 0.9, 1, 1.5].forEach((overall) => {
    for (let i = 0; i < 6; i++) {
      const value = staggeredProgress(overall, i, 6);
      expect(value >= 0 && value <= 1).toBe(true);
    }
  });
});

test("earlier bars are always at least as grown as later ones", () => {
  // The cascade must run in one direction; if this inverts, the chart animates
  // right-to-left against the time axis it is drawing.
  for (let i = 1; i < 8; i++) {
    expect(
      staggeredProgress(0.5, i - 1, 8) >= staggeredProgress(0.5, i, 8),
    ).toBe(true);
  }
});
