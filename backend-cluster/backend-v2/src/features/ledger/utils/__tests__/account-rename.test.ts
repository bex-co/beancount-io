import {
  accountTokenOffsets,
  accountsRenamedByCommit,
  renameAccountInMessage,
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

  // w31/099: Beancount skips a whole line starting with any of `*#:!&?%`,
  // and a `"` on it opens no string, so the scanner must read it as a comment.
  it.each(
    ["*", "#", ":", "!", "&", "?", "%"].flatMap((start) => [
      [start, "without a quote", ""],
      [start, "with an unmatched quote", ' 5"'],
    ]),
  )(
    "leaves a %s line %s and the narration after it alone, and renames every posting (w31/099)",
    (start, _case, quote) => {
      const source = [
        "2026-08-30 open Assets:Bank:Checking USD",
        `${start} Assets:Bank:Checking is the petty cash box${quote}`,
        '2026-08-30 * "payee" "top-up"',
        "  Expenses:Coffee    1.00 USD",
        "  Assets:Bank:Checking   -1.00 USD",
        `${start} a ruler${quote}`,
        '2026-08-31 * "payee" "paid from Assets:Bank:Checking"',
        "  Expenses:Coffee    1.00 USD",
        "  Assets:Bank:Checking   -1.00 USD",
        "",
      ].join("\n");
      const { text, changes } = renameAccountInText(source, FROM, TO);
      expect(changes.map((change) => change.line)).toEqual([1, 5, 9]);
      const lines = text.split("\n");
      expect(lines[1]).toBe(
        `${start} Assets:Bank:Checking is the petty cash box${quote}`,
      );
      expect(lines[6]).toBe(
        '2026-08-31 * "payee" "paid from Assets:Bank:Checking"',
      );
      expect(lines[8]).toBe("  Assets:Bank:Main   -1.00 USD");
    },
  );

  it.each(["*", "#", ":", "!", "&", "?", "%"])(
    "reads a %s line inside a multiline string as the string's content (w31/099)",
    (start) => {
      const source = [
        '2026-01-03 note Assets:Cash "first line',
        `${start} Assets:Bank:Checking inside the note"`,
        '2026-01-04 * "Coffee"',
        "  Assets:Bank:Checking  -3 USD",
        "  Expenses:Coffee",
      ].join("\n");
      const { changes } = renameAccountInText(source, FROM, TO);
      expect(changes).toEqual([
        {
          line: 4,
          before: "  Assets:Bank:Checking  -3 USD",
          after: "  Assets:Bank:Main  -3 USD",
        },
      ]);
    },
  );

  // w31/100: the engine reads a file past a leading byte-order mark, so a `#`
  // line 1 behind one is still a comment, and the mark is kept.
  it.each([
    ["without a quote", ""],
    ["with an unmatched quote", ' 5"'],
  ])(
    "leaves a first-line # comment %s behind a byte-order mark alone (w31/100)",
    (_case, quote) => {
      const body = [
        `# Assets:Bank:Checking is the petty cash box${quote}`,
        "2026-08-30 open Assets:Bank:Checking USD",
        '2026-08-31 * "payee" "paid from Assets:Bank:Checking"',
        "  Expenses:Coffee    1.00 USD",
        "  Assets:Bank:Checking   -1.00 USD",
        "",
      ].join("\n");
      const plain = renameAccountInText(body, FROM, TO);
      const { text, changes } = renameAccountInText(`\uFEFF${body}`, FROM, TO);
      expect(changes).toEqual(plain.changes);
      expect(changes.map((change) => change.line)).toEqual([2, 5]);
      expect(text).toBe(`\uFEFF${plain.text}`);
      expect(text.split("\n")[0]).toBe(
        `\uFEFF# Assets:Bank:Checking is the petty cash box${quote}`,
      );
    },
  );

  it("renames on line 1 behind a byte-order mark and reports the line without it (w31/100)", () => {
    const { text, changes } = renameAccountInText(
      "\uFEFF2026-01-01 open Assets:Bank:Checking\n",
      FROM,
      TO,
    );
    expect(text).toBe("\uFEFF2026-01-01 open Assets:Bank:Main\n");
    expect(changes).toEqual([
      {
        line: 1,
        before: "2026-01-01 open Assets:Bank:Checking",
        after: "2026-01-01 open Assets:Bank:Main",
      },
    ]);
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

  it("reads a non-ASCII character as part of the name, as the loader does", () => {
    // `€` and astral emojis continue the token, so Assets:Savings€ and
    // Assets:Savings😀 are neighbours, not children.
    const source =
      "2026-01-01 open Assets:Savings€\n2026-01-01 open Assets:Savings😀\n2026-01-01 open Assets:Savings\n";
    expect(
      renameAccountInText(source, "Assets:Savings", "Assets:Saving").text,
    ).toBe(
      "2026-01-01 open Assets:Savings€\n2026-01-01 open Assets:Savings😀\n2026-01-01 open Assets:Saving\n",
    );
  });

  it("reads a zero-width non-joiner as part of the name (w31/013)", () => {
    // Persian writes خریدها with a ZWNJ; the loader reads one token.
    const longer = "Expenses:Food:خرید\u200cها";
    const source = `2026-01-01 open ${longer}\n2026-01-01 open Expenses:Food:خرید\n`;
    expect(
      renameAccountInText(source, "Expenses:Food:خرید", "Expenses:Food:Shop")
        .text,
    ).toBe(`2026-01-01 open ${longer}\n2026-01-01 open Expenses:Food:Shop\n`);
    expect(renamedAccounts([source], longer, "Expenses:Food:Shops")).toEqual([
      { from: longer, to: "Expenses:Food:Shops" },
    ]);
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

// w31/114: an error the ledger already had names the account in engine prose;
// after the rename the same error names the new account.
describe("renameAccountInMessage", () => {
  it.each([
    [
      "an account the name's own colon closes",
      "Balance failed for Assets:Bank:Checking: expected 40.00 USD, got 49.75 USD",
      "Balance failed for Assets:Bank:Main: expected 40.00 USD, got 49.75 USD",
    ],
    [
      "a child account",
      "Account Assets:Bank:Checking:Joint was never opened",
      "Account Assets:Bank:Main:Joint was never opened",
    ],
    [
      "a quoted name, and every name in the message",
      "Invalid reference to 'Assets:Bank:Checking' from \"Assets:Bank:Checking\"",
      "Invalid reference to 'Assets:Bank:Main' from \"Assets:Bank:Main\"",
    ],
    [
      "a name that ends the message",
      "Duplicate open directive for Assets:Bank:Checking",
      "Duplicate open directive for Assets:Bank:Main",
    ],
  ])("renames %s", (_case, message, renamed) => {
    expect(renameAccountInMessage(message, FROM, TO)).toBe(renamed);
  });

  it.each([
    ["a longer name", "Account Assets:Bank:CheckingOld was never opened"],
    ["a name it ends", "Account Assets:Old:Assets:Bank:Checking is odd"],
    ["a name it is a suffix of", "Account XAssets:Bank:Checking is odd"],
    ["a parent", "Balance failed for Assets:Bank: expected 1 USD, got 2 USD"],
  ])("leaves %s alone", (_case, message) => {
    expect(renameAccountInMessage(message, FROM, TO)).toBe(message);
  });
});

describe("accountsRenamedByCommit (w31/150)", () => {
  const BEFORE = [
    "2026-01-01 open Assets:Bank:Checking USD",
    "2026-01-01 open Assets:Bank:Checking:Joint USD",
    '2026-02-01 * "Assets:Bank:Checking keeps its name in strings"',
    "  Assets:Bank:Checking  -3 USD",
    "  Expenses:Coffee",
    "",
  ].join("\n");
  const AFTER = renameAccountInText(BEFORE, FROM, TO).text;
  const SUBJECT = `Rename ${FROM} to ${TO}`;

  it("maps each account the commit renamed back to its name before", () => {
    expect(
      accountsRenamedByCommit(SUBJECT, [{ before: BEFORE, after: AFTER }]),
    ).toEqual(
      new Map([
        ["Assets:Bank:Main", "Assets:Bank:Checking"],
        ["Assets:Bank:Main:Joint", "Assets:Bank:Checking:Joint"],
      ]),
    );
  });

  it.each([`Revert "${SUBJECT}"`, `Revert "Revert "${SUBJECT}""`])(
    "reads %s as the rename it redoes or undoes",
    (subject) => {
      // A revert's commit holds the old names and its parent the new ones.
      expect(
        accountsRenamedByCommit(subject, [{ before: AFTER, after: BEFORE }]),
      ).toEqual(
        new Map([
          ["Assets:Bank:Checking", "Assets:Bank:Main"],
          ["Assets:Bank:Checking:Joint", "Assets:Bank:Main:Joint"],
        ]),
      );
    },
  );

  it.each([
    ["another subject", "Update bank.bean", [{ before: BEFORE, after: AFTER }]],
    ["no file it modified", SUBJECT, []],
    [
      "a file changed besides the rename",
      SUBJECT,
      [{ before: BEFORE, after: `${AFTER}; and a note\n` }],
    ],
    [
      "a modified file that does not name the account",
      SUBJECT,
      [
        { before: BEFORE, after: AFTER },
        { before: "; notes\n", after: "; more notes\n" },
      ],
    ],
    [
      "a rename to another name than the subject says",
      SUBJECT,
      [
        {
          before: BEFORE,
          after: renameAccountInText(BEFORE, FROM, "Assets:Bank:Other").text,
        },
      ],
    ],
  ])("finds no rename in %s", (_case, subject, files) => {
    expect(accountsRenamedByCommit(subject, files).size).toBe(0);
  });
});
