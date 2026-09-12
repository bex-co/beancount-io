import {
  ITEM_HEIGHT,
  selectedIndexForValue,
  wheelIndexAtOffset,
  wheelOffsetForValue,
  wheelTextMaxFontSizeMultiplier,
} from "../wheel-position";

const THEMES = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

describe("picker wheel position", () => {
  it("confirms the displayed selection when the wheel is never scrolled", () => {
    // The regression: the picker seeded its scroll offset at 0 instead of the
    // selection's offset, so confirming an untouched wheel returned items[0]
    // ("Light") even though "System" was centered and highlighted.
    for (const item of THEMES) {
      const offset = wheelOffsetForValue(THEMES, item.value);
      expect(THEMES[wheelIndexAtOffset(offset, THEMES.length)]).toEqual(item);
    }
  });

  it("centers the selected value", () => {
    expect(wheelOffsetForValue(THEMES, "light")).toBe(0);
    expect(wheelOffsetForValue(THEMES, "dark")).toBe(ITEM_HEIGHT);
    expect(wheelOffsetForValue(THEMES, "system")).toBe(ITEM_HEIGHT * 2);
  });

  it("falls back to the first item for a missing or absent selection", () => {
    expect(selectedIndexForValue(THEMES, undefined)).toBe(0);
    expect(selectedIndexForValue(THEMES, "")).toBe(0);
    expect(selectedIndexForValue(THEMES, "sepia")).toBe(0);
  });

  it("resolves a scrolled offset to the nearest item", () => {
    expect(wheelIndexAtOffset(ITEM_HEIGHT * 1.4, THEMES.length)).toBe(1);
    expect(wheelIndexAtOffset(ITEM_HEIGHT * 1.6, THEMES.length)).toBe(2);
  });

  it("clamps offsets outside the item range", () => {
    expect(wheelIndexAtOffset(-500, THEMES.length)).toBe(0);
    expect(wheelIndexAtOffset(ITEM_HEIGHT * 99, THEMES.length)).toBe(2);
  });

  it("re-seeds against a new item set instead of carrying a stale offset", () => {
    // A reused picker (Settings theme, then Settings language) must position
    // from the new list's selection, not the previous list's offset.
    const languages = [
      { label: "English", value: "en" },
      { label: "Français", value: "fr" },
    ];
    const staleOffset = wheelOffsetForValue(THEMES, "system");
    expect(wheelIndexAtOffset(staleOffset, languages.length)).toBe(1);
    expect(wheelOffsetForValue(languages, "en")).toBe(0);
  });
});

/** React Native lays a text line out at roughly 1.2x its font size. */
const LINE_HEIGHT_RATIO = 1.2;
/** The wheel's two label sizes (unselected, selected). */
const WHEEL_FONT_SIZES = [18, 20];

describe("wheelTextMaxFontSizeMultiplier", () => {
  it("keeps the label's line box inside the fixed row height", () => {
    // ITEM_HEIGHT is the single source of truth for snapping (spacers, the
    // selection indicator and snapToInterval all read it), so a label that
    // outgrows the row cannot be fixed by making the row taller.
    for (const fontSize of WHEEL_FONT_SIZES) {
      const capped =
        fontSize * wheelTextMaxFontSizeMultiplier(fontSize) * LINE_HEIGHT_RATIO;
      expect(capped <= ITEM_HEIGHT).toBeTruthy();
    }
  });

  it("still lets labels grow well past their designed size", () => {
    // A cap is an accommodation, not a freeze: anything at or below 1 would
    // pin the wheel to the default text size.
    for (const fontSize of WHEEL_FONT_SIZES) {
      expect(wheelTextMaxFontSizeMultiplier(fontSize) > 1.5).toBeTruthy();
    }
  });

  it("caps the larger selected label more tightly than the smaller one", () => {
    const [unselected, selected] = WHEEL_FONT_SIZES;
    expect(
      wheelTextMaxFontSizeMultiplier(selected!) <
        wheelTextMaxFontSizeMultiplier(unselected!),
    ).toBeTruthy();
  });

  it("never returns a multiplier below 1, which would shrink the label", () => {
    expect(wheelTextMaxFontSizeMultiplier(ITEM_HEIGHT * 10)).toBe(1);
  });
});
