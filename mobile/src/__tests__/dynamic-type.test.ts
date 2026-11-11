// Value imports must be relative: the jest-lite runner resolves "@/" only for
// type imports. dynamic-type.ts is deliberately react-native-free so it loads
// under plain Node.
import {
  STACKED_LAYOUT_FONT_SCALE,
  prefersStackedLayout,
} from "../common/theme/dynamic-type";

// The iOS Dynamic Type ladder, as React Native reports `fontScale`
// (React/CoreModules/RCTAccessibilityManager.mm): seven ordinary sizes, then
// the five accessibility sizes AX1 to AX5.
const IOS_NON_ACCESSIBILITY_SCALES = [
  0.823, // xSmall
  0.882, // Small
  0.941, // Medium
  1, // Large (the default)
  1.118, // xLarge
  1.235, // xxLarge
  1.353, // xxxLarge, the largest ordinary size
];
const IOS_ACCESSIBILITY_SCALES = [
  1.786, // AX1
  2.143, // AX2
  2.643, // AX3
  3.143, // AX4
  3.571, // AX5
];

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

  it("keeps the largest ordinary size side by side and stacks the first accessibility size", () => {
    // 1.353 (xxxLarge) must not stack and 1.786 (AX1) must: the rule the module
    // documents, which the threshold broke while the ladder here had xxxLarge as
    // a second 1.235 (w22/032).
    expect(prefersStackedLayout(1.353)).toBe(false);
    expect(prefersStackedLayout(1.786)).toBe(true);
  });

  it("sits between the largest ordinary size and the first accessibility size", () => {
    // Otherwise an ordinary "larger text" setting would restyle rows that fit,
    // or an accessibility size would keep rows that do not.
    expect(STACKED_LAYOUT_FONT_SCALE > 1.353).toBeTruthy();
    expect(STACKED_LAYOUT_FONT_SCALE < 1.786).toBeTruthy();
  });

  it("reads an unknown scale as the default size", () => {
    expect(prefersStackedLayout(undefined)).toBe(false);
    expect(prefersStackedLayout(Number.NaN)).toBe(false);
    expect(prefersStackedLayout(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
