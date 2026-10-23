import { describe, expect, it } from "vitest";
import { beancountString } from "../quoted-string";

describe("beancountString", () => {
  it.each([
    ["Coffee", '"Coffee"'],
    ['Bob "Cafe"', '"Bob \\"Cafe\\""'],
    ["C:\\temp\\receipt", '"C:\\\\temp\\\\receipt"'],
    ['a\\"b', '"a\\\\\\"b"'],
    ["Café 日本", '"Café 日本"'],
    ["", '""'],
  ])("quotes %j as %s", (text, quoted) => {
    expect(beancountString(text)).toBe(quoted);
  });
});
