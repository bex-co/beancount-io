import fs from "fs";
import path from "path";
import { en } from "../../../../translations/en";
import { translationLocales } from "../../../../translations/__tests__/locale-parity";

// w21/293: a guest was told to "Choose a ledger you can edit", and Budget's
// "Set a spending target" opened sign-in without saying so. These components
// use hooks this runner cannot execute, so the wiring is checked on source.
describe("guest copy", () => {
  const read = (...parts: string[]) =>
    fs
      .readFileSync(path.join(__dirname, "..", "..", "..", ...parts), "utf8")
      .replace(/\s+/g, "");

  it("tells a guest in the editor to sign in, not to choose another ledger", () => {
    const editor = read("ledger-file-editor-screen", "index.tsx");
    expect(
      editor.includes('guest?"guestReadOnlyEditor":"ledgerReadOnly"'),
    ).toBe(true);
    expect(en.guestReadOnlyEditor).toBe(
      "Read-only example. Sign in to edit your own ledger.",
    );
  });

  it("labels every sign-in action on the Budget card", () => {
    const card = read("home-screen", "components", "budget-card.tsx");
    expect(
      card.includes("t(budgetPanelEmptyKey(Boolean(guest),canWrite))"),
    ).toBe(true);
    // The empty row and each budget row carry the hint, and a guest gets no
    // unlabelled "See all".
    expect(
      card.split('accessibilityHint={guest?t("guestSignInHint"):undefined}')
        .length - 1,
    ).toBe(2);
    expect(card.includes("onSeeAll={guest?undefined:openBudget}")).toBe(true);
    expect(en.budgetPanelEmptyGuest).toBe("Sign in to set spending targets");
    expect(en.guestSignInHint).toBe("Opens sign in");
  });

  it("is worded in every shipped language", () => {
    for (const locale of translationLocales()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const catalog = require(`../../../../translations/${locale}`)[locale];
      for (const key of [
        "guestReadOnlyEditor",
        "budgetPanelEmptyGuest",
        "guestSignInHint",
      ]) {
        expect(typeof catalog[key]).toBe("string");
      }
    }
  });
});
