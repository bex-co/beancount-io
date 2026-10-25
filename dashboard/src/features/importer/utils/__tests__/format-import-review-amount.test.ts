import { describe, expect, it } from "vitest";
import { formatImportReviewAmount } from "../format-import-review-amount";

describe("formatImportReviewAmount", () => {
  it("preserves small crypto fractions instead of rounding to 0.00", () => {
    expect(formatImportReviewAmount(-0.00012345)).toBe("-0.00012345");
    expect(formatImportReviewAmount(0.00000001)).toBe("0.00000001");
  });

  it("keeps ordinary USD amounts readable", () => {
    expect(formatImportReviewAmount(-4.5)).toBe("-4.5");
    expect(formatImportReviewAmount(-45.67)).toBe("-45.67");
  });

  it("keeps very small nonzero amounts distinguishable from zero (w4/1058)", () => {
    expect(formatImportReviewAmount(1e-24)).toBe("1e-24");
    expect(formatImportReviewAmount(-1e-24)).toBe("-1e-24");
    expect(formatImportReviewAmount(1e-20)).toBe("0.00000000000000000001");
  });

  it("renders real zero as 0", () => {
    expect(formatImportReviewAmount(0)).toBe("0");
    expect(formatImportReviewAmount(-0)).toBe("0");
  });
});
