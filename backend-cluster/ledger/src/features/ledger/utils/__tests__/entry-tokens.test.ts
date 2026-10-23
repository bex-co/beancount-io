import fs from "fs";
import path from "path";
import {
  assertEntryTokens,
  assertNoControlCharacters,
  assertNoNewControlCharacters,
  assertSingleEntryText,
  isSingleDirective,
} from "@/features/ledger/utils/entry-tokens";

const txn = (item: Record<string, unknown>) => ({ type: "transaction", item });

describe("assertEntryTokens", () => {
  it.each([
    "Assets:Cash",
    "Assets:Bank:Checking-2",
    "Assets:Café",
    "资产:现金",
    "Liabilities:CreditCard:2026",
    // w21/649: ZWNJ and ZWJ, as Persian and Indic words carry them.
    "Assets:Bank:خانه\u200cها",
    "Assets:Bank:क्\u200dष",
  ])("accepts account %p", (account) => {
    expect(() =>
      assertEntryTokens([
        { type: "close", item: { date: "2026-01-01", account } },
      ]),
    ).not.toThrow();
  });

  it.each([
    "Assets",
    "assets:Cash",
    "Assets:Cash Box",
    "Assets:Cash\u00a0Box",
    "Assets:Cash\u2028x",
    "Assets:Ca;sh",
    'Assets:Ca"sh',
    // Other format characters stay refused (w21/649): ZWSP, LRM, word joiner.
    "Assets:Bank:خانه\u200bها",
    "Assets:Bank:خانه\u200eها",
    "Assets:Bank:خانه\u2060ها",
  ])("refuses account %p", (account) => {
    expect(() =>
      assertEntryTokens([
        { type: "close", item: { date: "2026-01-01", account } },
      ]),
    ).toThrow(/entry 0: account [\s\S]* is not a valid account/);
  });

  // w21/652: any capital letter, not only P, S, T, C, U, R and M.
  it.each(["*", "!", "txn", "P", "A", "Z"])(
    "accepts transaction flag %p",
    (flag) => {
      expect(() => assertEntryTokens([txn({ flag })])).not.toThrow();
    },
  );

  it.each(["A", "Z", "!"])("accepts posting flag %p", (flag) => {
    expect(() =>
      assertEntryTokens([
        txn({ postings: [{ account: "Assets:Cash", flag }] }),
      ]),
    ).not.toThrow();
  });

  // w21/653: a quoted flag is not Beancount syntax; the entry dropped.
  it.each(["**", "x", "* ", "txn\n", "'X"])(
    "refuses transaction flag %p",
    (flag) => {
      expect(() => assertEntryTokens([txn({ flag })])).toThrow(
        /transaction flag/,
      );
    },
  );

  it.each([
    ["USD", true],
    ["V", true],
    ["BRK.B", true],
    ["usd", false],
    ["US D", false],
    ["USD-", false],
    // w21/651: futures, as both engines read them as written.
    ["/ESZ24", true],
    ["/NQH21_QNEG21C13100", true],
    ["/6.3", false],
    ["/E_", false],
    // Valid Beancount, but rustledger reads `1 /6E` as 1/6 of `E`.
    ["/6E", false],
    ["/", false],
  ])("currency %p is accepted: %p", (currency, ok) => {
    const call = () =>
      assertEntryTokens([
        { type: "commodity", item: { date: "2026-01-01", currency } },
      ]);
    if (ok) expect(call).not.toThrow();
    else expect(call).toThrow(/is not a valid currency/);
  });

  // w21/653: both engines' lexers read tags and links as ASCII only.
  it.each(["trip-2026", "inv/2026.03", "a_b"])(
    "accepts tag and link %p",
    (tag) => {
      expect(() =>
        assertEntryTokens([txn({ tags: [tag], links: [tag] })]),
      ).not.toThrow();
    },
  );

  it.each(["café", "旅行", "a b", "a#b"])("refuses tag and link %p", (tag) => {
    expect(() => assertEntryTokens([txn({ tags: [tag] })])).toThrow(
      `entry 0: tags[0] ${JSON.stringify(tag)} is not a valid tag`,
    );
    expect(() => assertEntryTokens([txn({ links: [tag] })])).toThrow(
      /is not a valid link/,
    );
  });

  // w21/650: rustledger read a `%` posting as a comment; the entry committed
  // with no postings.
  it("refuses a % posting or transaction flag, saying why", () => {
    expect(() =>
      assertEntryTokens([
        txn({ postings: [{ account: "Assets:Cash", flag: "%" }] }),
      ]),
    ).toThrow(
      'entry 0: postings[0].flag "%" is not a valid flag: the ledger engine cannot read a "%" flag yet',
    );
    expect(() => assertEntryTokens([txn({ flag: "%" })])).toThrow(
      /flag "%" is not a valid transaction flag: the ledger engine cannot read/,
    );
  });

  it("refuses a quoted posting flag", () => {
    expect(() =>
      assertEntryTokens([
        txn({
          postings: [{ account: "Assets:Cash", flag: "'X" }],
        }),
      ]),
    ).toThrow('entry 0: postings[0].flag "\'X" is not a valid flag');
  });

  it("refuses a non-string token rather than rendering it", () => {
    expect(() => assertEntryTokens([txn({ tags: [42] })])).toThrow(
      "entry 0: tags[0] 42 is not a valid tag",
    );
  });

  it("names the custom value that is not an account", () => {
    expect(() =>
      assertEntryTokens([
        {
          type: "custom",
          item: {
            date: "2026-01-01",
            type: "budget",
            values: [{ kind: "account", value: "Expenses:Food\n2026-01-01 *" }],
          },
        },
      ]),
    ).toThrow(/entry 0: values\[0\]\.value/);
  });
});

describe("isSingleDirective", () => {
  it.each([
    ['2026-01-01 * "a" "b"\n  Assets:Cash  1 USD\n  Equity:X\n\n', true],
    // A string may span lines; its continuation is not a directive.
    ['2026-01-01 * "two\n2026-01-02 lines"\n  Assets:Cash  1 USD\n', true],
    ['2026-01-01 * "esc \\" quote"\n  a: "x ; y"\n', true],
    ['2026-01-01 * "a"\n2026-01-01 note Assets:Cash "x"\n', false],
    ['2026-01-01 * "a"\noption "title" "x"\n', false],
    ["\n\n", false],
  ])("%p is one directive: %p", (text, single) => {
    expect(isSingleDirective(text)).toBe(single);
  });
});

describe("assertSingleEntryText", () => {
  it.each([
    '2026-01-01 * "a"\n  Assets:Cash  1 USD\n  Equity:X',
    '; why\n2026-01-01 * "a"\n  Assets:Cash  1 USD\n  Equity:X\n; after\n',
    '2026-01-01 * "two\nlines"\n  Assets:Cash  1 USD\n  Equity:X',
    "2026-01-01 open Assets:Cash USD",
  ])("accepts %p", (text) => {
    expect(() => assertSingleEntryText(text, "newContent")).not.toThrow();
  });

  it.each([
    ['plugin "beancount.plugins.auto"', "`plugin` configures the ledger"],
    ["2026-01-01 open A:B\n2026-01-02 open A:C", "newContent holds 2 entries"],
    ["  indented only", "newContent holds no entry"],
    // w21/814: an indented date is named, not called an empty entry.
    ['  2026-01-01 * "a"', "newContent's date line is indented"],
    [
      '\t2026-01-01 * "a"\n\tAssets:Cash  1 USD',
      "newContent's date line is indented",
    ],
    [
      '    2026-01-01 * "a"\n      Assets:Cash  1 USD\n      Equity:X',
      "newContent's date line is indented",
    ],
    ["; only a comment\n", "newContent holds no entry"],
    ["Assets:Cash 1 USD", "newContent must be one dated directive"],
  ])("refuses %p", (text, message) => {
    expect(() => assertSingleEntryText(text, "newContent")).toThrow(message);
  });
});

// w21/680: a NUL in a payee was committed, and the loader then refused the file.
describe("assertNoControlCharacters", () => {
  it.each(["\u0000", "\u0001", "\u001b", "\u007f", "\u000b"])(
    "refuses %p in a text field, naming it",
    (char) => {
      expect(() =>
        assertNoControlCharacters([txn({ narration: `a${char}b` })]),
      ).toThrow(/entry 0: narration contains the control character U\+/);
    },
  );

  it("finds one in the payee, a metadata value, a key or a nested value", () => {
    expect(() =>
      assertNoControlCharacters([txn({ payee: "x\u0000" })]),
    ).toThrow("entry 0: payee contains");
    expect(() =>
      assertNoControlCharacters([txn({ meta: { receipt: "a\u0000" } })]),
    ).toThrow("entry 0: meta.receipt contains");
    expect(() =>
      assertNoControlCharacters([
        txn({ postings: [{ account: "A:B", comment: "\u0000" }] }),
      ]),
    ).toThrow("entry 0: postings[0].comment contains");
  });

  it("accepts tab, line breaks and ordinary Unicode", () => {
    expect(() =>
      assertNoControlCharacters([
        txn({ narration: "lunch\twith\nthe team\r\n — café 咖啡 ‌" }),
      ]),
    ).not.toThrow();
  });
});

describe("assertSingleEntryText and control characters", () => {
  it("refuses a NUL in an edited slice", () => {
    expect(() =>
      assertSingleEntryText(
        '2026-01-01 * "lun\u0000ch"\n  Assets:Cash  1 USD\n  Equity:X',
        "newContent",
      ),
    ).toThrow("newContent contains the control character U+0000");
  });
});

// w21/816: an entry imported with an ESC could never be edited: its own slice
// came back refused for a character the editor cannot show.
describe("a control character the entry already had", () => {
  const esc = "\u001b";
  const old = `2026-10-20 * "CARD 1234${esc}[0m"\n  Expenses:Food  4.00 USD\n  Assets:Cash`;
  const edited = `${old.split("\n")[0]}\n  note: "lunch"\n${old.split("\n").slice(1).join("\n")}`;

  it("is kept through a metadata-only edit", () => {
    expect(() =>
      assertNoNewControlCharacters(edited, "newContent", old),
    ).not.toThrow();
    expect(() =>
      assertSingleEntryText(edited, "newContent", { controls: false }),
    ).not.toThrow();
  });

  it("does not let in a new one", () => {
    expect(() =>
      assertNoNewControlCharacters(`${edited}\u0000`, "newContent", old),
    ).toThrow("newContent contains the control character U+0000");
    expect(() => assertNoNewControlCharacters(edited, "newContent")).toThrow(
      "newContent contains the control character U+001B",
    );
    expect(() => assertSingleEntryText(edited, "newContent")).toThrow("U+001B");
  });

  it("is checked against the entry the update replaces", () => {
    const service = fs
      .readFileSync(
        path.join(
          __dirname,
          "..",
          "..",
          "service",
          "ledger-journal-service.ts",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    const update = service.slice(service.indexOf("asyncupdateSourceSlice("));
    const early = update.indexOf(
      'assertSingleEntryText(newContent,"newContent",{controls:false});',
    );
    const later = update.indexOf(
      'assertNoNewControlCharacters(newContent,"newContent",found.slice);',
    );
    expect([early === -1, later === -1, early < later]).toEqual([
      false,
      false,
      true,
    ]);
  });
});
