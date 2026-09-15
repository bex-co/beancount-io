import fs from "fs";
import path from "path";

/**
 * Static guardrail: the date picker is not pinned to English. `locale="en_US"`
 * forced English month names (and the library's English "Confirm") inside
 * otherwise translated screens; the picker now takes the app's locale and
 * translated button labels.
 */
describe("DatePickerModal localization", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "date-picker-modal.tsx"),
    "utf8",
  );

  it("passes the app's locale instead of a fixed one", () => {
    expect(source.includes('locale="en_US"')).toBe(false);
    expect(source.includes("useReactiveVar(localeVar)")).toBe(true);
    expect(source.includes("locale={locale || undefined}")).toBe(true);
  });

  it("labels its buttons with the translated strings", () => {
    expect(source.includes('confirmTextIOS={t("confirm")}')).toBe(true);
    expect(source.includes('cancelTextIOS={t("cancel")}')).toBe(true);
  });
});
