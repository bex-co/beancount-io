import { describe, it, expect } from "vitest";
import {
  SIDEBAR_MIN_WIDTH_PX,
  SIDEBAR_MAX_WIDTH_PX,
  SIDEBAR_DEFAULT_WIDTH_PX,
  clampSidebarWidth,
  serializeSidebarWidth,
  deserializeSidebarWidth,
} from "../sidebar-state";

describe("clampSidebarWidth", () => {
  it("clamps values below the minimum up to the minimum", () => {
    expect(clampSidebarWidth(SIDEBAR_MIN_WIDTH_PX - 100)).toBe(
      SIDEBAR_MIN_WIDTH_PX,
    );
    expect(clampSidebarWidth(0)).toBe(SIDEBAR_MIN_WIDTH_PX);
    expect(clampSidebarWidth(-50)).toBe(SIDEBAR_MIN_WIDTH_PX);
  });

  it("clamps values above the maximum down to the maximum", () => {
    expect(clampSidebarWidth(SIDEBAR_MAX_WIDTH_PX + 100)).toBe(
      SIDEBAR_MAX_WIDTH_PX,
    );
    expect(clampSidebarWidth(10_000)).toBe(SIDEBAR_MAX_WIDTH_PX);
  });

  it("passes through and rounds in-range values", () => {
    expect(clampSidebarWidth(256)).toBe(256);
    expect(clampSidebarWidth(256.4)).toBe(256);
    expect(clampSidebarWidth(256.6)).toBe(257);
  });

  it("falls back to the default width for non-finite input", () => {
    expect(clampSidebarWidth(NaN)).toBe(SIDEBAR_DEFAULT_WIDTH_PX);
    expect(clampSidebarWidth(Infinity)).toBe(SIDEBAR_DEFAULT_WIDTH_PX);
  });
});

describe("sidebar width cookie codec", () => {
  it("round-trips a valid width", () => {
    expect(deserializeSidebarWidth(serializeSidebarWidth(300))).toBe(300);
  });

  it("serializes as a bare integer string (no JSON quotes)", () => {
    expect(serializeSidebarWidth(300)).toBe("300");
  });

  it("clamps on serialize and deserialize", () => {
    expect(serializeSidebarWidth(9999)).toBe(String(SIDEBAR_MAX_WIDTH_PX));
    expect(deserializeSidebarWidth("10")).toBe(SIDEBAR_MIN_WIDTH_PX);
  });

  it("recovers the default width from a garbage cookie value", () => {
    expect(deserializeSidebarWidth("not-a-number")).toBe(
      SIDEBAR_DEFAULT_WIDTH_PX,
    );
  });
});
