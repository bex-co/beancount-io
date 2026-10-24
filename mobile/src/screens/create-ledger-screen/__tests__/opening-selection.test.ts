import fs from "fs";
import path from "path";
import {
  openingAmountOwed,
  openingAmountValue,
  openingSelection,
  SETUP_PRESETS,
} from "../setup-presets";

// w21/106: a typed opening balance was dropped under "Decide later", and an
// account picked under one preset was still sent under another.
const accountsOf = (id: string) =>
  SETUP_PRESETS.find((preset) => preset.id === id)!.accounts;

describe("Create Ledger's opening line", () => {
  it("writes nothing without a chosen account (A)", () => {
    expect(openingSelection(accountsOf("PERSONAL"), "", "2500")).toBe(null);
  });

  it("writes nothing for an account another preset offered (B, C)", () => {
    expect(
      openingSelection(accountsOf("PORTFOLIO"), "Assets:Cash", "1000"),
    ).toBe(null);
    expect(openingSelection(accountsOf("BLANK"), "Assets:Cash", "1000")).toBe(
      null,
    );
  });

  it("writes the account the preset offers, with its amount", () => {
    expect(
      openingSelection(accountsOf("PERSONAL"), "Assets:Cash", "1000"),
    ).toEqual({ name: "Assets:Cash", amount: "1000" });
    expect(openingSelection(accountsOf("PERSONAL"), "Assets:Cash", "")).toBe(
      null,
    );
  });

  it("resets on a preset or start change, hides the amount, and shows it on Review", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "create-ledger-screen.tsx"),
      "utf8",
    );
    expect(source.includes("if (id !== presetId) resetOpening();")).toBe(true);
    expect(source.includes("if (kind !== startKind) resetOpening();")).toBe(
      true,
    );
    expect(source.includes("{openingAccountValue ? (")).toBe(true);
    expect(source.includes('t("createLedgerReviewOpening", {')).toBe(true);
  });

  // w21/326: "12.5." typed, then "Decide later": the field disappeared but its
  // value stayed, and Next's validation kept failing on it with no message.
  it('clears the hidden amount when "Decide later" is picked', () => {
    const source = fs
      .readFileSync(
        path.join(__dirname, "..", "create-ledger-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/gu, "");
    const press = source.indexOf(
      'onPress={()=>{setValue("openingAccount",option.value);',
    );
    expect(press > -1).toBe(true);
    expect(
      source
        .slice(press, press + 400)
        .includes('if(option.value==="")setValue("openingAmount","");'),
    ).toBe(true);
  });

  it("would otherwise refuse the hidden value: it does not parse as an amount", () => {
    // The refine the form runs on `openingAmount` is `openingAmountValue`.
    expect(openingAmountValue("12.5.")).toBe(null);
    expect(openingAmountValue("")).not.toBe(null);
  });
});

// w21/500: a resumed draft keeps the opening account but not the amount, and an
// empty amount passed Next, so Review and Create sent no opening balance.
describe("an opening amount a resumed draft still owes", () => {
  it("is owed once the draft lost it and the account is still chosen", () => {
    expect(openingAmountOwed(true, "Assets:Cash", "")).toBe(true);
    expect(openingAmountOwed(true, "Assets:Cash", "  ")).toBe(true);
  });

  it("is settled by an amount, by Decide later, or by a fresh form", () => {
    expect(openingAmountOwed(true, "Assets:Cash", "2")).toBe(false);
    expect(openingAmountOwed(true, "", "")).toBe(false);
    expect(openingAmountOwed(false, "Assets:Cash", "")).toBe(false);
  });

  it("is checked by the form's schema with its own message", () => {
    const source = fs
      .readFileSync(
        path.join(__dirname, "..", "create-ledger-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      source.includes(
        'path:["openingAmount"],message:t("createLedgerAmountReenter")',
      ),
    ).toBe(true);
    expect(source.includes("setAmountLost(draft.amountLost);")).toBe(true);
  });
});
