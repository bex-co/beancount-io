import { describe, expect, it } from "vitest";
import { eventTypeLabel } from "../event-type-label";

const label = (type: string) => eventTypeLabel(type, "All Types", "(no type)");

describe("eventTypeLabel (w4/1016)", () => {
  it("reads ordinary types as written, and empty as (no type)", () => {
    expect(label("location")).toBe("location");
    expect(label("qa control")).toBe("qa control");
    expect(label("")).toBe("(no type)");
  });

  it("quotes a type that would read like the filter's own choices", () => {
    expect(label("All Types")).toBe('"All Types"');
    expect(label("(no type)")).toBe('"(no type)"');
  });

  it("spells out blank and invisible types so each reads differently", () => {
    const shown = [" ", "  ", "\t", " x", "a​b", 'say "hi"\t'].map(label);
    expect(shown).toEqual([
      '"\\u0020"',
      '"\\u0020\\u0020"',
      '"\\t"',
      '"\\u0020x"',
      '"a\\u200Bb"',
      // Its trailing tab spells out every whitespace character in it.
      '"say\\u0020\\"hi\\"\\t"',
    ]);
    expect(new Set(shown).size).toBe(shown.length);
  });
});
