// Value imports must be relative: the jest-lite runner resolves "@/" only for
// type imports. dynamic-type.ts is deliberately react-native-free so it loads
// under plain Node.
import {
  STACKED_LAYOUT_FONT_SCALE,
  prefersStackedLayout,
} from "../common/theme/dynamic-type";

// The iOS Dynamic Type ladder, as `fontScale` reports it.
const IOS_NON_ACCESSIBILITY_SCALES = [
  0.824, // xSmall
  0.882, // Small
  0.941, // Medium
  1, // Large (the default)
  1.118, // xLarge
  1.235, // xxLarge
  1.235, // xxxLarge
];
const IOS_ACCESSIBILITY_SCALES = [1.35, 1.643, 1.941, 2.35, 2.76, 3.117];

describe("prefersStackedLayout", () => {
  it("keeps the side-by-side row at the default text size", () => {
    expect(prefersStackedLayout(1)).toBe(false);
  });

  it("keeps the side-by-side row at every ordinary larger size", () => {
    // The contract the nine Dynamic Type fixes are built on: geometry below the
    // threshold must be untouched, so nothing here may stack.
    for (const scale of IOS_NON_ACCESSIBILITY_SCALES) {
      expect(prefersStackedLayout(scale)).toBe(false);
    }
  });

  it("stacks at every accessibility text size", () => {
    for (const scale of IOS_ACCESSIBILITY_SCALES) {
      expect(prefersStackedLayout(scale)).toBe(true);
    }
  });

  it("switches exactly at the threshold", () => {
    expect(prefersStackedLayout(STACKED_LAYOUT_FONT_SCALE)).toBe(true);
    expect(prefersStackedLayout(STACKED_LAYOUT_FONT_SCALE - 0.001)).toBe(false);
  });

  it("sits above the largest non-accessibility size", () => {
    // Otherwise an ordinary "larger text" setting would restyle rows that fit.
    expect(STACKED_LAYOUT_FONT_SCALE > 1.235).toBeTruthy();
  });

  it("reads an unknown scale as the default size", () => {
    expect(prefersStackedLayout(undefined)).toBe(false);
    expect(prefersStackedLayout(Number.NaN)).toBe(false);
    expect(prefersStackedLayout(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
