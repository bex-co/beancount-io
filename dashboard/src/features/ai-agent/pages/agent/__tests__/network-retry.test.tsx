import { describe, expect, it } from "vitest";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";

describe("agent network retry eligibility", () => {
  it("treats browser fetch TypeErrors as retryable network failures", () => {
    expect(getErrorMessageKey(new TypeError("Failed to fetch"))).toBe(
      "common.errors.network",
    );
    expect(
      getErrorMessageKey(
        new TypeError("NetworkError when attempting to fetch resource."),
      ),
    ).toBe("common.errors.network");
  });

  it("does not treat generic Errors as network failures", () => {
    expect(getErrorMessageKey(new Error("HTTP 500"))).toBe(
      "common.errors.generic",
    );
  });
});
