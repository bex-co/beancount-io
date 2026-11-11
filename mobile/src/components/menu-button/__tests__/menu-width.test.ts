import fs from "fs";
import path from "path";
import { menuWidth } from "../menu-width";

// w22/035: the popover was 260 pt at every text size, so at AX2 the one word
// "Сканировать" in Russian "Сканировать чек" was wider than the row's text area
// and iOS broke it by character ("Сканироват" / "ь чек"). From the accessibility
// sizes the menu takes the width the screen allows; ordinary sizes are untouched.
const ORDINARY = [0.823, 0.882, 0.941, 1, 1.118, 1.235, 1.353];
const ACCESSIBILITY = [1.786, 2.143, 2.643, 3.143, 3.571];
const IPHONE = 390;

describe("menuWidth", () => {
  it("keeps the fixed widths at every ordinary text size", () => {
    for (const fontScale of ORDINARY) {
      expect(
        menuWidth({ hasTitle: false, screenWidth: IPHONE, fontScale }),
      ).toBe(260);
      expect(
        menuWidth({ hasTitle: true, screenWidth: IPHONE, fontScale }),
      ).toBe(300);
    }
  });

  it("takes the whole width minus the margins at every accessibility size", () => {
    for (const fontScale of ACCESSIBILITY) {
      for (const hasTitle of [false, true]) {
        expect(menuWidth({ hasTitle, screenWidth: IPHONE, fontScale })).toBe(
          IPHONE - 32,
        );
      }
    }
  });

  it("never exceeds the screen, ordinary size or not", () => {
    // A narrow phone: the fixed 300 pt is itself capped.
    expect(menuWidth({ hasTitle: true, screenWidth: 320, fontScale: 1 })).toBe(
      288,
    );
    expect(
      menuWidth({ hasTitle: true, screenWidth: 320, fontScale: 2.143 }),
    ).toBe(288);
  });

  it("is wider at AX2 than the fixed width it had", () => {
    expect(
      menuWidth({ hasTitle: false, screenWidth: IPHONE, fontScale: 2.143 }) >
        260,
    ).toBe(true);
  });

  it("reads an unknown font scale as an ordinary size", () => {
    expect(
      menuWidth({ hasTitle: false, screenWidth: IPHONE, fontScale: undefined }),
    ).toBe(260);
  });
});

describe("the menu opens at that width", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("measures it from the live font scale when it opens", () => {
    expect(
      source.includes(
        "constpopoverWidth=menuWidth({hasTitle:Boolean(title),screenWidth:screen.width,fontScale:screen.fontScale,});",
      ),
    ).toBe(true);
    expect(source.includes("width:popoverWidth,")).toBe(true);
  });
});
