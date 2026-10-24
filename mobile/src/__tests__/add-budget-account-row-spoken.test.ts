import fs from "fs";
import path from "path";
import { en } from "../translations/en";

// w21/925: VoiceOver read the example "Expenses:Groceries" as the chosen account.
describe("Add Budget's empty Account row", () => {
  const source = fs
    .readFileSync(
      path.join(
        __dirname,
        "../screens/add-budget-screen/add-budget-screen.tsx",
      ),
      "utf8",
    )
    .replace(/\s+/g, "");

  it("speaks that no account is chosen, not the example", () => {
    expect(en.budgetAccountNotSelected).toBe("No account chosen");
    expect(
      source.includes('spokenValue={account||t("budgetAccountNotSelected")}'),
    ).toBe(true);
    expect(
      source.includes("accessibilityValue={{text:spokenValue??value}}"),
    ).toBe(true);
  });
});
