import {
  accountTokenOffsets,
  renameAccountInText,
  renamedAccounts,
} from "../account-rename";

const FROM = "Assets:Bank:Checking";
const TO = "Assets:Bank:Main";

describe("renameAccountInText (w1/m43)", () => {
  it("renames the account in every directive that names it", () => {
    const source = [
      "2026-01-01 open Assets:Bank:Checking USD",
      '2026-01-02 * "Coffee"',
      "  Expenses:Coffee  3 USD",
      "  Assets:Bank:Checking",
      "2026-01-03 balance Assets:Bank:Checking  100 USD",
      "2026-01-04 pad Assets:Bank:Checking Equity:Opening",
      '2026-01-05 note Assets:Bank:Checking "Called the bank"',
      '2026-01-06 document Assets:Bank:Checking "statements/jan.pdf"',
      '2026-01-07 custom "budget" Assets:Bank:Checking "monthly" 10 USD',
      '2026-01-08 * "Tagged"',
      "  source: Assets:Bank:Checking",
      "  Expenses:Coffee  1 USD",
      "  Assets:Bank:Checking",
      "2026-12-31 close Assets:Bank:Checking",
      "",
    ].join("\n");
    const { text, changes } = renameAccountInText(source, FROM, TO);
    expect(text).not.toContain(FROM);
    expect(changes.map((change) => change.line)).toEqual([
      1, 4, 5, 6, 7, 8, 9, 11, 13, 14,
    ]);
    expect(changes[0]).toEqual({
      line: 1,
      before: "2026-01-01 open Assets:Bank:Checking USD",
      after: "2026-01-01 open Assets:Bank:Main USD",
    });
  });

  it("renames the accounts under it and leaves prefix neighbours alone", () => {
    const source = [
      "2026-01-01 open Assets:Bank:Checking:Joint USD",
      "2026-01-01 open Assets:Bank:CheckingOld USD",
      "2026-01-01 open Assets:Bank:Checking-2 USD",
      "2026-01-01 open Assets:Bank:Checking",
      "2026-01-01 open Other:Assets:Bank:Checking",
    ].join("\n");
    const { text } = renameAccountInText(source, FROM, TO);
    expect(text.split("\n")).toEqual([
      "2026-01-01 open Assets:Bank:Main:Joint USD",
      "2026-01-01 open Assets:Bank:CheckingOld USD",
      "2026-01-01 open Assets:Bank:Checking-2 USD",
      "2026-01-01 open Assets:Bank:Main",
      "2026-01-01 open Other:Assets:Bank:Checking",
    ]);
  });

  it("never touches strings, comments, or org-mode headings", () => {
    const source = [
      "* Assets:Bank:Checking section",
      '2026-01-02 * "Assets:Bank:Checking" "moved \\"Assets:Bank:Checking\\" ; not a comment"',
      '  memo: "Assets:Bank:Checking"',
      "  Assets:Bank:Checking  -3 USD ; was Assets:Bank:Checking",
      "  Expenses:Coffee",
      '2026-01-03 note Assets:Cash "a note that spans',
      'two lines and names Assets:Bank:Checking"',
      'plugin "beancount.plugins.check" "Assets:Bank:Checking"',
    ].join("\n");
    const { text, changes } = renameAccountInText(source, FROM, TO);
    expect(changes).toEqual([
      {
        line: 4,
        before: "  Assets:Bank:Checking  -3 USD ; was Assets:Bank:Checking",
        after: "  Assets:Bank:Main  -3 USD ; was Assets:Bank:Checking",
      },
    ]);
    expect(text.split("\n")[3]).toBe(
      "  Assets:Bank:Main  -3 USD ; was Assets:Bank:Checking",
    );
  });

  it("keeps CRLF line endings and a final line without a newline", () => {
    const source =
      "2026-01-01 open Assets:Bank:Checking\r\n2026-01-02 close Assets:Bank:Checking";
    const { text, changes } = renameAccountInText(source, FROM, TO);
    expect(text).toBe(
      "2026-01-01 open Assets:Bank:Main\r\n2026-01-02 close Assets:Bank:Main",
    );
    expect(changes.map((change) => change.after)).toEqual([
      "2026-01-01 open Assets:Bank:Main",
      "2026-01-02 close Assets:Bank:Main",
    ]);
  });

  it("renames non-ASCII account names on whole components", () => {
    const source =
      "2026-01-01 open Activos:Banco:Cuenta-Única\n2026-01-01 open Activos:Banco:CuentaÚnica\n";
    const { text } = renameAccountInText(
      source,
      "Activos:Banco",
      "Activos:Bancos",
    );
    expect(text).toBe(
      "2026-01-01 open Activos:Bancos:Cuenta-Única\n2026-01-01 open Activos:Bancos:CuentaÚnica\n",
    );
    expect(
      renameAccountInText(source, "Activos:Banco:Cuenta", "X:Y").changes,
    ).toEqual([]);
  });

  it("returns the text unchanged, with no changes, when nothing names the account", () => {
    const source = "2026-01-01 open Assets:Cash\n";
    expect(renameAccountInText(source, FROM, TO)).toEqual({
      text: source,
      changes: [],
    });
    expect(accountTokenOffsets(source, FROM)).toEqual([]);
  });

  it("does not stop scanning at a comment on the last line", () => {
    expect(accountTokenOffsets("; only a comment", FROM)).toEqual([]);
    expect(accountTokenOffsets("Assets:Bank:Checking ; tail", FROM)).toEqual([
      0,
    ]);
  });
});

describe("renamedAccounts (w1/m43)", () => {
  it("lists each account the rename maps once, descendants included", () => {
    const texts = [
      "2026-01-01 open Assets:Bank:Checking\n2026-01-01 open Assets:Bank:Checking:Joint\n",
      "  Assets:Bank:Checking:Joint  1 USD\n  Assets:Bank:Checking\n",
    ];
    expect(renamedAccounts(texts, FROM, TO)).toEqual([
      { from: "Assets:Bank:Checking", to: "Assets:Bank:Main" },
      { from: "Assets:Bank:Checking:Joint", to: "Assets:Bank:Main:Joint" },
    ]);
  });
});
