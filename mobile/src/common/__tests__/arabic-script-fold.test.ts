import { foldArabicLetters, foldArabicScript } from "../arabic-script-fold";

// w21/835, w21/836: one spelling for the letters a Persian keyboard types
// another way.
describe("foldArabicScript", () => {
  it("folds yeh, alef maksura, kaf, teh marbuta and the alef forms", () => {
    expect(foldArabicScript("ي ى ك ة أ إ آ")).toBe("ی ی ک ه ا ا ا");
  });

  it("writes digits in ASCII and drops harakat and tatweel", () => {
    expect(foldArabicScript("۱۰٤۲")).toBe("1042");
    expect(foldArabicScript("كَـتَب")).toBe("کتب");
  });

  it("leaves text without Arabic script as it is", () => {
    const text = "Assets:Cash";
    expect(foldArabicScript(text)).toBe(text);
  });
});

describe("foldArabicLetters", () => {
  it("keeps every character in its place, for matching that reports positions", () => {
    const text = "بانك-ملي ۱\u200cx";
    expect(foldArabicLetters(text).length).toBe(text.length);
    expect(foldArabicLetters(text)).toBe("بانک-ملی 1 x");
  });
});
