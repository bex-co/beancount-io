import fs from "fs";
import path from "path";
import {
  localeModules,
  translationLocales,
} from "../../../translations/__tests__/locale-parity";

// w22/033: German "Zahlungsempfänger" is one 17-letter word, and at AX2 the New
// Transaction caption "ZAHLUNGSEMPFÄNGER" broke by character, leaving a lone
// "R" above the row's value. The caption is a label: one line that shrinks to fit.
const source = fs
  .readFileSync(path.join(__dirname, "..", "list-item.tsx"), "utf8")
  .replace(/\s+/g, "");

describe("the ListItem caption", () => {
  it("is one line that shrinks to fit rather than breaking a word", () => {
    expect(
      source.includes(
        "<Textkey={`title-${fontScale}`}style={styles.title}numberOfLines={1}adjustsFontSizeToFit",
      ),
    ).toBe(true);
    expect(source.includes("minimumFontScale={0.7}")).toBe(true);
  });

  // The shrink floor was checked natively against the longest caption word. A
  // longer one has not been, so it has to be looked at before this passes again.
  it("has no caption word longer than German's, the longest it was checked with", () => {
    const longest = (key: "date" | "payee" | "narration") =>
      Math.max(
        ...translationLocales().flatMap((locale) =>
          String(localeModules[locale]![key])
            .toUpperCase()
            .split(/\s+/u)
            .map((word) => [...word].length),
        ),
      );
    for (const key of ["date", "payee", "narration"] as const) {
      expect(longest(key) <= 17).toBe(true);
    }
  });
});
