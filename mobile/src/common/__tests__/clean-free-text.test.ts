import { cleanFreeText, withoutInvisibleMarks } from "../clean-free-text";
import { merchantKey } from "../merchant-key";
import {
  composeAccountName,
  validateAccountName,
} from "../../screens/open-account-screen/account-name";
import { matchSuggestions } from "../../components/text-input-screen/match-suggestions";

// w21/965: invisible format characters survived trimming, so one merchant split
// in two and Open Account refused a name that looked fine.
describe("cleanFreeText", () => {
  const unseen = ["\u200b", "\u2060", "\u2066", "\u2069", "\u202a", "\ufeff"];

  it("takes off the unseen marks, at the ends and inside", () => {
    for (const mark of unseen) {
      expect(cleanFreeText(`Costco${mark}`)).toBe("Costco");
      expect(cleanFreeText(`${mark}Cost${mark}co `)).toBe("Costco");
    }
    expect(cleanFreeText("\u200b")).toBe("");
  });

  // w21/986: a deliberate RLM keeps trailing punctuation on the right side of
  // Arabic or Hebrew text.
  it("keeps the direction marks and the soft hyphen in saved text", () => {
    const text = "فاتورة \u200f(INV-12)\u200f";
    expect(cleanFreeText(text)).toBe(text);
    expect(cleanFreeText("a\u061cb\u00adc")).toBe("a\u061cb\u00adc");
    expect(cleanFreeText("Costco\u200e")).toBe("Costco\u200e");
  });

  it("keeps the joiners Persian and Indic words need", () => {
    expect(cleanFreeText("خانه\u200cها")).toBe("خانه\u200cها");
    expect(cleanFreeText("क\u200dष")).toBe("क\u200dष");
  });

  it("is removed whole by withoutInvisibleMarks, for keys, search and names", () => {
    for (const mark of ["\u200e", "\u200f", "\u061c", "\u00ad", ...unseen]) {
      expect(withoutInvisibleMarks(`a${mark}b`)).toBe("ab");
    }
  });
});

describe("where the marks used to split a name", () => {
  it("is one merchant", () => {
    for (const mark of ["‎", "‏", "​", "⁠", "؜"]) {
      expect(merchantKey(`Costco${mark}`)).toBe(merchantKey("Costco"));
    }
  });

  it("is one suggestion", () => {
    expect(matchSuggestions(["Costco", "Costco‎"], "costco", 5)).toEqual([
      "Costco",
    ]);
    expect(matchSuggestions(["Costco"], "costco‏", 5)).toEqual(["Costco"]);
  });

  it("is a name Open Account accepts", () => {
    expect(composeAccountName("Assets", "‏Bank‎")).toBe("Assets:Bank");
    expect(validateAccountName("Assets:Bank")).toEqual({ ok: true });
  });
});

describe("the text input saves cleaned text", () => {
  it("commits through cleanFreeText", () => {
    const source = require("fs")
      .readFileSync(
        require("path").join(
          __dirname,
          "..",
          "..",
          "components",
          "text-input-screen",
          "index.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(source.includes("onSave?.(cleanFreeText(selected));")).toBe(true);
  });
});
