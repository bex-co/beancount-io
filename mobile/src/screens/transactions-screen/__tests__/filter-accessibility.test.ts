import fs from "fs";
import path from "path";
import { en } from "../../../translations/en";
import { translationLocales } from "../../../translations/__tests__/locale-parity";

// w21/305: VoiceOver could not tell the Transactions filters were on (the only
// cue was a dot), and the filter sheet's account ✕ was announced as a second
// "Reset". The components use hooks this runner cannot execute, so the wiring is
// checked on their source.
describe("the Transactions filters' accessibility", () => {
  const read = (...parts: string[]) =>
    fs
      .readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8")
      .replace(/\s+/g, "");

  it("says how many filters are active on the Filters button", () => {
    const header = read("transactions-screen", "transactions-header.tsx");
    expect(
      header.includes(
        'accessibilityValue={activeFilterCount>0?{text:t("filtersActive",{count:activeFilterCount})}:undefined}',
      ),
    ).toBe(true);
    expect(en.filtersActive).toBe("Active: {{count}}");
  });

  it("names the account ✕ for what it clears, not Reset", () => {
    const sheet = read(
      "transaction-filters-screen",
      "transaction-filters-screen.tsx",
    );
    const clear = sheet.slice(sheet.indexOf("style={styles.clearAccount}"));
    expect(
      clear
        .slice(0, clear.indexOf("</TouchableOpacity>"))
        .includes('accessibilityLabel={t("clearAccount")}'),
    ).toBe(true);
    expect(en.clearAccount).toBe("Clear account");
    expect(en.clearAccount === en.reset).toBe(false);
  });

  it("is worded in every shipped language", () => {
    for (const locale of translationLocales()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const catalog = require(`../../../translations/${locale}`)[locale];
      expect(catalog.filtersActive.includes("{{count}}")).toBe(true);
      expect(typeof catalog.clearAccount).toBe("string");
    }
  });
});

// w21/999: the Filters button was about 32 pt with a slop that covered the gap
// to the search field's ✕.
describe("the Filters button's target", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "transactions-header.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("is a 44 pt wide box with vertical slop, not a slop all round", () => {
    expect(source.includes("filterButton:{minWidth:iconActionSize,")).toBe(
      true,
    );
    expect(
      source.includes(
        "constFILTER_HIT_SLOP={top:(iconActionSize-FILTER_ICON_SIZE)/2,bottom:(iconActionSize-FILTER_ICON_SIZE)/2,};",
      ),
    ).toBe(true);
    expect(
      source.includes(
        "style={styles.filterButton}onPress={onOpenFilters}hitSlop={FILTER_HIT_SLOP}",
      ),
    ).toBe(true);
    expect(source.includes("hitSlop={8}")).toBe(false);
  });
});
