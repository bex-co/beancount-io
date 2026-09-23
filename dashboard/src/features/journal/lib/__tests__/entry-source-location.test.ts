import { describe, expect, it } from "vitest";
import { readEntrySourceLocation } from "../entry-source-location";

describe("readEntrySourceLocation", () => {
  it("returns a navigable location when filename and positive lineno are present", () => {
    expect(
      readEntrySourceLocation({
        meta: { filename: "main.bean", lineno: 42 },
      }),
    ).toEqual({ filename: "main.bean", lineno: 42 });
  });

  it("rejects missing, blank, or nonpositive locations", () => {
    expect(readEntrySourceLocation({ meta: null })).toBeNull();
    expect(
      readEntrySourceLocation({ meta: { filename: "", lineno: 1 } }),
    ).toBeNull();
    expect(
      readEntrySourceLocation({ meta: { filename: "main.bean", lineno: 0 } }),
    ).toBeNull();
    expect(
      readEntrySourceLocation({
        meta: { filename: "main.bean", lineno: 1.5 },
      }),
    ).toBeNull();
  });
});
