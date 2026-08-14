import {
  RELEASE_PROJECTION_SECONDS,
  clampProgress,
  settleTarget,
} from "../components/ledger-drawer/drawer-motion";

test("clampProgress keeps the drawer between closed and fully open", () => {
  expect(clampProgress(-0.4)).toBe(0);
  expect(clampProgress(0)).toBe(0);
  expect(clampProgress(0.42)).toBe(0.42);
  expect(clampProgress(1)).toBe(1);
  expect(clampProgress(1.6)).toBe(1);
});

test("a slow drag is decided by position alone", () => {
  expect(settleTarget(0.6, 0)).toBe(1);
  expect(settleTarget(0.4, 0)).toBe(0);
});

test("resting exactly at the midpoint falls closed", () => {
  expect(settleTarget(0.5, 0)).toBe(0);
});

test("a rightward flick opens from well below the midpoint", () => {
  // 0.1 + 3 * 0.15 = 0.55, past the midpoint.
  expect(settleTarget(0.1, 3)).toBe(1);
});

test("a leftward flick closes from well above the midpoint", () => {
  expect(settleTarget(0.9, -3)).toBe(0);
});

test("a flick too weak to cross the midpoint does not flip the drawer", () => {
  // 0.2 + 1 * 0.15 = 0.35, still short.
  expect(settleTarget(0.2, 1)).toBe(0);
  expect(settleTarget(0.8, -1)).toBe(1);
});

test("velocity is projected over the documented window", () => {
  // Sitting one projection-window short of the midpoint: the velocity needed to
  // cross is exactly 1 / RELEASE_PROJECTION_SECONDS per unit of distance.
  const distance = 0.2;
  const justEnough = distance / RELEASE_PROJECTION_SECONDS;
  expect(settleTarget(0.5 - distance, justEnough * 1.01)).toBe(1);
  expect(settleTarget(0.5 - distance, justEnough * 0.99)).toBe(0);
});
