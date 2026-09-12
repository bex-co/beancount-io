import {
  selectAnimatedAmountValue,
  shouldSettleAnimatedAmount,
} from "../select-animated-amount";

describe("selectAnimatedAmountValue", () => {
  // Note 171: the counting frames are rounded to cents, and `animate` stays true
  // after the tween ends — so the rounded intermediate became the resting value
  // (-367.985 settling at -367.98 while the table cell showed -367.99).
  it("renders the cent-rounded frame while the tween is running", () => {
    expect(
      selectAnimatedAmountValue({
        value: -367.985,
        shown: -320.12,
        animate: true,
        settled: false,
      }),
    ).toBe(-320.12);
  });

  it("renders the exact value once the tween has settled", () => {
    expect(
      selectAnimatedAmountValue({
        value: -367.985,
        shown: -367.98,
        animate: true,
        settled: true,
      }),
    ).toBe(-367.985);
  });

  it("renders the exact value when the animation is bypassed", () => {
    // A scrubbed figure must track the finger exactly; so must reduce-motion.
    for (const settled of [false, true]) {
      expect(
        selectAnimatedAmountValue({
          value: -367.985,
          shown: -367.98,
          animate: false,
          settled,
        }),
      ).toBe(-367.985);
    }
  });
});

describe("shouldSettleAnimatedAmount", () => {
  it("settles when the finished tween is the live one", () => {
    expect(shouldSettleAnimatedAmount(true, 42.5, 42.5)).toBe(true);
  });

  it("ignores a completion for a superseded target", () => {
    // Rapid target replacement leaves earlier callbacks in flight; one of them
    // must not restore an old exact figure over the live tween.
    expect(shouldSettleAnimatedAmount(true, 42.5, 99.25)).toBe(false);
  });

  it("ignores an interrupted tween", () => {
    expect(shouldSettleAnimatedAmount(false, 42.5, 42.5)).toBe(false);
    expect(shouldSettleAnimatedAmount(undefined, 42.5, 42.5)).toBe(false);
  });

  it("settles on a zero target and distinguishes -0 from 0", () => {
    expect(shouldSettleAnimatedAmount(true, 0, 0)).toBe(true);
    // Object.is keeps -0 and 0 apart, which is the conservative direction: the
    // worst case is one extra rounded frame, never a stale resting figure.
    expect(shouldSettleAnimatedAmount(true, -0, 0)).toBe(false);
  });
});
