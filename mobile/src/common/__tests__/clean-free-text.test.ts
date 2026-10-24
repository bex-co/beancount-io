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
  const marks = ["​", "‎", "‏", "؜", "⁠", "⁦", "⁩", "‪", "﻿", "­"];

  it("takes off every invisible mark, at the ends and inside", () => {
    for (const mark of marks) {
      expect(cleanFreeText(`Costco${mark}`)).toBe("Costco");
      expect(cleanFreeText(`${mark}Cost${mark}co `)).toBe("Costco");
    }
    expect(cleanFreeText("​")).toBe("");
    expect(withoutInvisibleMarks("a‎b")).toBe("ab");
  });

  it("keeps the joiners Persian and Indic words need", () => {
    expect(cleanFreeText("خانه‌ها")).toBe("خانه‌ها");
    expect(cleanFreeText("क‍ष")).toBe("क‍ष");
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
