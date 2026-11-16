import {
  insertDirectives,
  parseDirectiveText,
} from "@/features/ledger/utils/directive-text";
import { BadUserInputError } from "@/shared/errors";
import { simpleLedgerTemplate } from "../ledger-template";

const txn = (date: string, payee: string) =>
  [
    `${date} * "${payee}" "note"`,
    "  Expenses:Food   10.00 USD",
    "  Assets:Cash    -10.00 USD",
  ].join("\n");

describe("parseDirectiveText", () => {
  it("keeps a transaction's postings with it", () => {
    const [directive, ...rest] = parseDirectiveText(txn("2026-03-01", "Cafe"));
    expect(rest).toEqual([]);
    expect(directive).toEqual({
      date: "2026-03-01",
      kind: "Transaction",
      text: txn("2026-03-01", "Cafe"),
    });
  });

  it("splits several directives and classifies each for file routing", () => {
    const directives = parseDirectiveText(
      [
        "2026-01-01 open Assets:Cash USD",
        "",
        txn("2026-02-01", "Shop"),
        "",
        "2026-02-02 price USD 1.00 USD",
        "2026-02-03 balance Assets:Cash 90.00 USD",
      ].join("\n"),
    );
    expect(directives.map((d) => [d.date, d.kind])).toEqual([
      ["2026-01-01", "Open"],
      ["2026-02-01", "Transaction"],
      ["2026-02-02", "Price"],
      ["2026-02-03", "Balance"],
    ]);
  });

  it("carries a comment above a directive along with it", () => {
    const [directive] = parseDirectiveText(
      `; groceries\n${txn("2026-03-01", "Shop")}`,
    );
    expect(directive.text.startsWith("; groceries\n")).toBe(true);
  });

  // w23/041: the stack is positional, but each appended entry moves to its
  // date position, so the statements ended up apart from the entries they
  // annotated. They are applied to those entries instead.
  it("writes a pushed tag onto each enclosed transaction, note and document and drops the statements", () => {
    const parsed = parseDirectiveText(
      [
        "pushtag #trip",
        '2026-01-02 * "Cafe" #food ; lunch',
        "  Assets:Cash  -3 USD",
        "  Expenses:Food",
        '2026-01-02 note Assets:Cash "left a tip"',
        '2026-01-02 document Assets:Cash "receipt.pdf" ^case-1 ; scan',
        "2026-01-02 balance Assets:Cash 0 USD",
        "poptag #trip",
        '2026-01-03 * "Home"',
        "  Assets:Cash  -1 USD",
        "  Expenses:Food",
      ].join("\n"),
    );
    expect(parsed.map(({ date, kind }) => ({ date, kind }))).toEqual([
      { date: "2026-01-02", kind: "Transaction" },
      { date: "2026-01-02", kind: "Note" },
      { date: "2026-01-02", kind: "Document" },
      { date: "2026-01-02", kind: "Balance" },
      { date: "2026-01-03", kind: "Transaction" },
    ]);
    expect(parsed[0]!.text.split("\n")[0]).toBe(
      '2026-01-02 * "Cafe" #food #trip ; lunch',
    );
    // w31/018: Beancount, and the hosted engine, tag notes and documents from
    // the stack too; the appended note and document had silently lost it.
    expect(parsed[1]!.text).toBe(
      '2026-01-02 note Assets:Cash "left a tip" #trip',
    );
    expect(parsed[2]!.text).toBe(
      '2026-01-02 document Assets:Cash "receipt.pdf" ^case-1 #trip ; scan',
    );
    // No other directive carries a tag.
    expect(parsed[3]!.text).toBe("2026-01-02 balance Assets:Cash 0 USD");
    expect(parsed[4]!.text).not.toContain("#trip");
  });

  // w31/018: the header ends where its strings do.
  it("writes the stack onto a header whose string runs onto an indented line", () => {
    const [note] = parseDirectiveText(
      [
        "pushtag #trip",
        'pushmeta where: "Lisbon"',
        '2026-01-02 note Assets:Cash "first line',
        '  second line" ; c',
        "popmeta where:",
        "poptag #trip",
      ].join("\n"),
    );
    expect(note.text).toBe(
      [
        '2026-01-02 note Assets:Cash "first line',
        '  second line" #trip ; c',
        '  where: "Lisbon"',
      ].join("\n"),
    );
  });

  it("does not count a tag inside a string as one the entry writes", () => {
    const parsed = parseDirectiveText(
      [
        "pushtag #trip",
        '2026-01-02 * "Cafe" "dinner #trip day"',
        "  Assets:Cash  -3 USD",
        "  Expenses:Food",
        '2026-01-02 note Assets:Cash "see #trip"',
        "poptag #trip",
      ].join("\n"),
    );
    expect(parsed[0]!.text.split("\n")[0]).toBe(
      '2026-01-02 * "Cafe" "dinner #trip day" #trip',
    );
    expect(parsed[1]!.text).toBe(
      '2026-01-02 note Assets:Cash "see #trip" #trip',
    );
  });

  it("reads the entry's own tag lines, and stops its own keys at the first posting", () => {
    const [entry] = parseDirectiveText(
      [
        "pushtag #trip",
        'pushmeta where: "Lisbon"',
        '2026-01-02 * "Cafe"',
        "  #trip",
        "  Assets:Cash  -3 USD",
        '    where: "posting"',
        "  Expenses:Food",
        "popmeta where:",
        "poptag #trip",
      ].join("\n"),
    );
    // A posting's key is the posting's: the entry still takes the pushed one.
    expect(entry.text).toBe(
      [
        '2026-01-02 * "Cafe"',
        '  where: "Lisbon"',
        "  #trip",
        "  Assets:Cash  -3 USD",
        '    where: "posting"',
        "  Expenses:Food",
      ].join("\n"),
    );
  });

  it("writes pushed metadata onto each enclosed directive under its header", () => {
    const parsed = parseDirectiveText(
      [
        'pushmeta trip: "Lisbon"',
        '2026-01-02 * "Cafe"',
        "  Assets:Cash  -3 USD",
        "  Expenses:Food",
        "2026-01-02 open Expenses:Travel",
        '  trip: "kept"',
        "popmeta trip:",
      ].join("\n"),
    );
    expect(parsed[0]!.text.split("\n").slice(0, 2)).toEqual([
      '2026-01-02 * "Cafe"',
      '  trip: "Lisbon"',
    ]);
    // An entry's own value for the key stands.
    expect(parsed[1]!.text).toBe(
      '2026-01-02 open Expenses:Travel\n  trip: "kept"',
    );
  });

  // w31/029: Beancount keeps a stack of values per key. A second `pushmeta`
  // of a key shadows the first until its `popmeta` brings the first back; the
  // text was refused at its second `popmeta`, and an entry between the two
  // pops lost the outer value.
  it("restores a key's outer value when its inner pushmeta is popped", () => {
    const parsed = parseDirectiveText(
      [
        'pushmeta qa-k: "outer"',
        'pushmeta qa-k: "inner"',
        '2026-09-10 * "T1A" "inner scope"',
        "  Expenses:Food:Coffee   1.00 USD",
        "  Assets:Cash",
        "popmeta qa-k:",
        '2026-09-11 * "T1B" "outer scope"',
        "  Expenses:Food:Coffee   1.00 USD",
        "  Assets:Cash",
        "popmeta qa-k:",
        '2026-09-12 note Assets:Cash "after both"',
      ].join("\n"),
    );
    // Stock Beancount 3.2.3 reads T1A "inner" and T1B "outer".
    expect(parsed.map((directive) => directive.text)).toEqual([
      [
        '2026-09-10 * "T1A" "inner scope"',
        '  qa-k: "inner"',
        "  Expenses:Food:Coffee   1.00 USD",
        "  Assets:Cash",
      ].join("\n"),
      [
        '2026-09-11 * "T1B" "outer scope"',
        '  qa-k: "outer"',
        "  Expenses:Food:Coffee   1.00 USD",
        "  Assets:Cash",
      ].join("\n"),
      '2026-09-12 note Assets:Cash "after both"',
    ]);
  });

  it("writes the latest push of a key under a nested scope, below the entry's own value", () => {
    const parsed = parseDirectiveText(
      [
        'pushmeta qa-c: "pushed"',
        '2026-09-26 * "PAYEE-C1" "own key"',
        '  qa-c: "own"',
        "  Expenses:Food   1.00 USD",
        "  Assets:Cash",
        '2026-09-27 * "PAYEE-C2" "no key of its own"',
        "  Expenses:Food   2.00 USD",
        "  Assets:Cash",
        'pushmeta qa-c: "inner"',
        '2026-09-28 * "PAYEE-C3" "own key, nested"',
        '  qa-c: "own-3"',
        "  Expenses:Food   3.00 USD",
        "  Assets:Cash",
        '2026-09-28 * "PAYEE-C4" "nested, no key of its own"',
        "  Expenses:Food   4.00 USD",
        "  Assets:Cash",
        "popmeta qa-c:",
        "popmeta qa-c:",
      ].join("\n"),
    );
    // Stock Beancount 3.2.3's `entry_meta('qa-c')` for each, in order.
    expect(
      parsed.map((directive) =>
        directive.text.split("\n").filter((line) => line.includes("qa-c:")),
      ),
    ).toEqual([
      ['  qa-c: "own"'],
      ['  qa-c: "pushed"'],
      ['  qa-c: "own-3"'],
      ['  qa-c: "inner"'],
    ]);
  });

  it.each([
    [
      "pushtag #trip\n2026-01-02 open Assets:Cash",
      "line 1: pushed #trip is never popped",
    ],
    [
      'pushmeta trip: "x"\n2026-01-02 open Assets:Cash',
      "line 1: pushed metadata is never popped",
    ],
    [
      "2026-01-02 open Assets:Cash\npoptag #trip",
      "line 2: `poptag #trip` has no matching pushtag",
    ],
    [
      "2026-01-02 open Assets:Cash\npopmeta trip:",
      "line 2: `popmeta trip:` has no matching pushmeta",
    ],
    // w31/029: one pop per push of the key, as stock Beancount counts them.
    [
      'pushmeta qa-k: "outer"\npushmeta qa-k: "inner"\n2026-01-02 open Assets:Cash\npopmeta qa-k:\npopmeta qa-k:\npopmeta qa-k:',
      "line 6: `popmeta qa-k:` has no matching pushmeta",
    ],
    [
      'pushmeta qa-k: "outer"\npushmeta qa-k: "inner"\n2026-01-02 open Assets:Cash\npopmeta qa-k:',
      "line 1: pushed metadata is never popped",
    ],
    [
      "pushtag trip\n2026-01-02 open Assets:Cash",
      "line 1: `pushtag` takes one #tag",
    ],
    // w23/237: the lexer's metadata key needs two characters.
    [
      'pushmeta k: "x"\n2026-01-02 open Assets:Cash\npopmeta k:',
      'line 1: a metadata key needs at least two characters: pushmeta k: "x"',
    ],
    [
      "2026-01-02 open Assets:Cash\npopmeta k:",
      "line 2: a metadata key needs at least two characters: popmeta k:",
    ],
    [
      'pushmeta 1k: "x"\n2026-01-02 open Assets:Cash',
      'line 1: `pushmeta` takes a metadata key: pushmeta 1k: "x"',
    ],
  ])("refuses an unbalanced or malformed stack: %p", (text, message) => {
    expect(() => parseDirectiveText(text)).toThrow(message);
  });

  // w23/018: these reconfigure the whole ledger, and were appended with "No
  // new bean-check errors".
  it.each([
    ['option "operating_currency" "EUR"', "option"],
    ['plugin "beancount.plugins.auto_accounts"', "plugin"],
    ['include "other.bean"', "include"],
  ])("refuses %s, naming the line and the file-edit route", (line, keyword) => {
    const text = `2026-01-02 open Assets:Cash USD\n${line}`;
    expect(() => parseDirectiveText(text)).toThrow(
      new RegExp(`line 2: \`${keyword}\` configures the ledger`),
    );
    try {
      parseDirectiveText(text);
    } catch (error) {
      expect(error).toBeInstanceOf(BadUserInputError);
      expect((error as BadUserInputError).metadata).toMatchObject({
        field: "text",
        hint: expect.stringContaining("updateLedgerFiles"),
      });
    }
  });

  it("refuses content that is not directives, naming the line", () => {
    expect(() =>
      parseDirectiveText("Here are the transactions you asked for:"),
    ).toThrow(BadUserInputError);
    expect(() => parseDirectiveText("+++ b/main.bean")).toThrow(
      /line 1: not a Beancount directive/,
    );
  });

  // w23/240: stock Beancount reads both of these and `updateLedgerFiles` takes
  // them; this tool's classifier does not, so the refusal names the way out.
  it.each([
    [
      '2026/11/12 event "x" "y"',
      /line 1: not a Beancount directive: 2026\/11\/12 event/,
      "YYYY-MM-DD",
    ],
    [
      '2026-11-12 * "line one\nline two"\n  Assets:Cash 1 USD\n  Equity:O',
      /line 2: not a Beancount directive: line two"/,
      "addLedgerEntries",
    ],
  ])(
    "hints at the way out of a valid construct it cannot read: %p",
    (text, message, hint) => {
      expect.hasAssertions();
      expect(() => parseDirectiveText(text)).toThrow(message);
      try {
        parseDirectiveText(text);
      } catch (error) {
        expect((error as BadUserInputError).metadata).toMatchObject({
          field: "text",
          hint: expect.stringContaining(hint),
        });
      }
    },
  );

  it("gives no hint for text that is not directives at all", () => {
    expect.hasAssertions();
    try {
      parseDirectiveText("+++ b/main.bean");
    } catch (error) {
      expect((error as BadUserInputError).metadata).not.toHaveProperty("hint");
    }
  });

  it("refuses an indented line with no directive above it", () => {
    expect(() => parseDirectiveText("  Expenses:Food 10.00 USD")).toThrow(
      /line 1: indented line has no directive above it/,
    );
  });

  it("refuses text with no directives at all", () => {
    expect(() => parseDirectiveText("\n\n; just a comment\n")).toThrow(
      /no Beancount directives/,
    );
  });
});

// w23/076: on the starter ledger the first transactions landed after the last
// `1970-01-01 open`, inside `* Accounts`, above an empty `* Transactions`.
describe("insertDirectives under org headings", () => {
  const template = simpleLedgerTemplate["main.bean"];
  const insert = (existing: string, text: string) =>
    insertDirectives(existing, parseDirectiveText(text)).content;
  // Each directive's first line and each heading, in file order.
  const outline = (content: string) =>
    content
      .split("\n")
      .filter((line) => /^(\*+ |\d{4}-\d{2}-\d{2} )/.test(line))
      .slice(-5);

  it("puts the first transactions under the starter ledger's * Transactions", () => {
    const first = insert(template, txn("2021-06-01", "via-append"));
    const next = insert(
      insert(first, txn("2021-07-01", "later")),
      txn("2021-05-01", "earlier"),
    );
    expect(outline(next)).toEqual([
      "1970-01-01 open Equity:Initial",
      "* Transactions",
      '2021-05-01 * "earlier" "note"',
      '2021-06-01 * "via-append" "note"',
      '2021-07-01 * "later" "note"',
    ]);
    expect(next).toContain('* Transactions\n\n2021-05-01 * "earlier"');
  });

  it("keeps a new open with the opens, under * Accounts", () => {
    const content = insert(template, "1970-01-01 open Assets:Bank USD");
    expect(content).toContain(
      "1970-01-01 open Equity:Initial\n\n1970-01-01 open Assets:Bank USD",
    );
    expect(content.trimEnd().endsWith("* Transactions")).toBe(true);
  });

  it("keeps an entry in its period's section, before the next one's heading", () => {
    const yearly = [
      "* 2021",
      "",
      txn("2021-03-01", "March"),
      "",
      "* 2022",
      "",
      txn("2022-02-01", "February"),
      "",
    ].join("\n");
    const content = insert(yearly, txn("2021-12-31", "December"));
    expect(content.indexOf('2021-12-31 * "December"')).toBeLessThan(
      content.indexOf("* 2022"),
    );
  });

  it("leaves a ledger without headings as it was", () => {
    const plain = ["1970-01-01 open Assets:Cash", ""].join("\n");
    expect(insert(plain, txn("2021-06-01", "x"))).toBe(
      `1970-01-01 open Assets:Cash\n\n${txn("2021-06-01", "x")}\n`,
    );
  });
});

describe("insertDirectives", () => {
  const existing = [
    'option "title" "T"',
    "",
    txn("2026-01-05", "Jan"),
    "",
    txn("2026-03-05", "Mar"),
    "",
  ].join("\n");

  it("threads a directive between the two it belongs between", () => {
    const [directive] = parseDirectiveText(txn("2026-02-05", "Feb"));
    const result = insertDirectives(existing, [directive]);

    expect(result.appended).toBe(false);
    const dates = [...result.content.matchAll(/^(\d{4}-\d{2}-\d{2}) \*/gm)].map(
      (match) => match[1],
    );
    expect(dates).toEqual(["2026-01-05", "2026-02-05", "2026-03-05"]);
    // The reported line is where the directive actually starts.
    expect(result.content.split("\n")[result.inserted[0].line - 1]).toBe(
      '2026-02-05 * "Feb" "note"',
    );
  });

  describe("several directives in one call", () => {
    const pair = (gap: string) =>
      parseDirectiveText(
        `${txn("2026-10-01", "one")}\n${gap}${txn("2026-10-02", "two")}`,
      );
    const blankRuns = (content: string) =>
      [...content.matchAll(/\n(\n*)(?=\d{4}-)/g)].map((m) => m[1].length);

    it.each(["", "\n", "\n\n\n"])(
      "separates them with exactly one blank line (gap %j)",
      (gap) => {
        const { content, inserted } = insertDirectives(existing, pair(gap));
        expect(content).not.toMatch(/\n\n\n/);
        const lines = content.split("\n");
        expect(lines[inserted[0].line - 1]).toBe('2026-10-01 * "one" "note"');
        expect(lines[inserted[1].line - 1]).toBe('2026-10-02 * "two" "note"');
        expect(blankRuns(content).every((n) => n === 1)).toBe(true);
      },
    );

    it("threads an out-of-order pair mid-file with single separators", () => {
      const { content, inserted } = insertDirectives(
        existing,
        parseDirectiveText(
          `${txn("2026-02-05", "Feb")}\n\n${txn("2026-02-01", "Early")}`,
        ),
      );
      expect(content).not.toMatch(/\n\n\n/);
      const lines = content.split("\n");
      expect(lines[inserted[0].line - 1]).toBe('2026-02-05 * "Feb" "note"');
      expect(lines[inserted[1].line - 1]).toBe('2026-02-01 * "Early" "note"');
    });

    it("accepts CRLF text", () => {
      const { content } = insertDirectives(
        existing,
        parseDirectiveText(
          `${txn("2026-10-01", "one")}\r\n\r\n${txn("2026-10-02", "two")}`,
        ),
      );
      expect(content).not.toMatch(/\n\n\n/);
    });
  });

  it("keeps a threaded directive's postings with it", () => {
    const [directive] = parseDirectiveText(txn("2026-02-05", "Feb"));
    const { content } = insertDirectives(existing, [directive]);
    const lines = content.split("\n");
    const at = lines.indexOf('2026-02-05 * "Feb" "note"');
    expect(lines[at + 1]).toBe("  Expenses:Food   10.00 USD");
    expect(lines[at + 2]).toBe("  Assets:Cash    -10.00 USD");
  });

  it("does not split an earlier directive from its own postings", () => {
    const [directive] = parseDirectiveText(txn("2026-01-06", "Later same"));
    const { content } = insertDirectives(existing, [directive]);
    const lines = content.split("\n");
    const jan = lines.indexOf('2026-01-05 * "Jan" "note"');
    expect(lines[jan + 1]).toBe("  Expenses:Food   10.00 USD");
    expect(lines[jan + 2]).toBe("  Assets:Cash    -10.00 USD");
  });

  it("puts the newest directive last", () => {
    const [directive] = parseDirectiveText(txn("2026-12-31", "Dec"));
    const { content } = insertDirectives(existing, [directive]);
    expect(content.trimEnd().endsWith("  Assets:Cash    -10.00 USD")).toBe(
      true,
    );
    const dates = [...content.matchAll(/^(\d{4}-\d{2}-\d{2}) \*/gm)].map(
      (match) => match[1],
    );
    expect(dates).toEqual(["2026-01-05", "2026-03-05", "2026-12-31"]);
  });

  it("appends to an unsorted file rather than reordering somebody's ledger", () => {
    const unsorted = [
      txn("2026-05-01", "Late"),
      "",
      txn("2026-01-01", "Early"),
    ].join("\n");
    const [directive] = parseDirectiveText(txn("2026-03-01", "Mid"));
    const result = insertDirectives(unsorted, [directive]);

    expect(result.appended).toBe(true);
    const dates = [...result.content.matchAll(/^(\d{4}-\d{2}-\d{2}) \*/gm)].map(
      (match) => match[1],
    );
    expect(dates).toEqual(["2026-05-01", "2026-01-01", "2026-03-01"]);
  });

  it("writes into an empty file without a leading blank line", () => {
    const [directive] = parseDirectiveText(txn("2026-01-01", "First"));
    const result = insertDirectives("", [directive]);
    expect(result.content).toBe(`${txn("2026-01-01", "First")}\n`);
    expect(result.inserted).toEqual([{ line: 1 }]);
  });

  it("reports where each directive ends up when a later one lands above it", () => {
    // w23/060: the lines locate the entries' hashes, so an earlier report
    // must move down when a later directive is threaded in before it.
    const directives = parseDirectiveText(
      [txn("2026-04-01", "Apr"), "", txn("2026-02-01", "Feb")].join("\n"),
    );
    const result = insertDirectives(existing, directives);
    const lines = result.content.split("\n");
    expect(result.inserted.map(({ line }) => lines[line - 1])).toEqual([
      '2026-04-01 * "Apr" "note"',
      '2026-02-01 * "Feb" "note"',
    ]);
  });

  it("inserts several directives, each in its own place", () => {
    const directives = parseDirectiveText(
      [txn("2026-02-01", "Feb"), "", txn("2026-04-01", "Apr")].join("\n"),
    );
    const { content } = insertDirectives(existing, directives);
    const dates = [...content.matchAll(/^(\d{4}-\d{2}-\d{2}) \*/gm)].map(
      (match) => match[1],
    );
    expect(dates).toEqual([
      "2026-01-05",
      "2026-02-01",
      "2026-03-05",
      "2026-04-01",
    ]);
  });
});

// w31/015: the target file's `pushtag`/`pushmeta` apply by position, so an
// entry threaded into one of its scopes took the scope's tag or metadata.
describe("insertDirectives around the target file's pushtag/pushmeta scopes", () => {
  /** Insert `text` into the file `existing` spells, line by line. */
  const insert = (existing: string[], text: string) => {
    const result = insertDirectives(
      `${existing.join("\n")}\n`,
      parseDirectiveText(text),
    );
    const lines = result.content.split("\n");
    return {
      content: result.content.replace(/\n$/, ""),
      lines,
      at: result.inserted.map(({ line }) => lines[line - 1]),
    };
  };
  const file = (...lines: string[]) => lines.join("\n");
  const before = [txn("2026-08-30", "Before"), ""];

  it.each([
    ["pushtag", "pushtag #trip", "poptag #trip"],
    ["pushmeta", 'pushmeta trip: "Lisbon"', "popmeta trip:"],
  ])(
    "puts an entry dated before a %s scope's first entry above the push",
    (_kind, push, pop) => {
      const scope = [push, txn("2026-09-02", "Scoped"), pop];
      const { content, at } = insert(
        [...before, "; the trip", ...scope],
        txn("2026-09-01", "New"),
      );
      expect(content).toBe(
        file(...before, txn("2026-09-01", "New"), "", "; the trip", ...scope),
      );
      expect(at).toEqual(['2026-09-01 * "New" "note"']);
    },
  );

  it.each([
    ["pushtag", "pushtag #trip", "poptag #trip"],
    ["pushmeta", 'pushmeta trip: "Lisbon"', "popmeta trip:"],
  ])(
    "closes a %s scope around an entry dated strictly inside it",
    (_kind, push, pop) => {
      const { content, at } = insert(
        [push, txn("2026-09-02", "First"), "", txn("2026-09-05", "Last"), pop],
        txn("2026-09-03", "New"),
      );
      expect(content).toBe(
        file(
          push,
          txn("2026-09-02", "First"),
          "",
          pop,
          txn("2026-09-03", "New"),
          push,
          "",
          txn("2026-09-05", "Last"),
          pop,
        ),
      );
      expect(at).toEqual(['2026-09-03 * "New" "note"']);
    },
  );

  it("pops nested scopes last-first and pushes them again with the same values", () => {
    const pushes = [
      "pushtag #trip ; the trip",
      'pushmeta trip: "Lisbon"',
      'pushmeta trip: "Porto"',
    ];
    const pops = ["popmeta trip:", "popmeta trip:", "poptag #trip"];
    const { content } = insert(
      [
        ...pushes,
        txn("2026-09-02", "First"),
        txn("2026-09-05", "Last"),
        ...pops,
      ],
      txn("2026-09-03", "New"),
    );
    expect(content).toBe(
      file(
        ...pushes,
        txn("2026-09-02", "First"),
        "",
        ...pops,
        txn("2026-09-03", "New"),
        // The push as the file wrote it, without its comment.
        "pushtag #trip",
        ...pushes.slice(1),
        txn("2026-09-05", "Last"),
        ...pops,
      ),
    );
  });

  it("steps above an inner scope's push and closes only the outer one", () => {
    const { content } = insert(
      [
        "pushtag #year",
        txn("2026-08-30", "Before"),
        "pushtag #trip",
        txn("2026-09-02", "Scoped"),
        "poptag #trip",
        "poptag #year",
      ],
      txn("2026-09-01", "New"),
    );
    expect(content).toBe(
      file(
        "pushtag #year",
        txn("2026-08-30", "Before"),
        "",
        "poptag #year",
        txn("2026-09-01", "New"),
        "pushtag #year",
        "",
        "pushtag #trip",
        txn("2026-09-02", "Scoped"),
        "poptag #trip",
        "poptag #year",
      ),
    );
  });

  it("keeps the entry's own tags and metadata as written", () => {
    const own = file(
      '2026-09-03 * "Own" "note" #mine',
      '  trip: "Porto"',
      "  Expenses:Food   1.00 USD",
      "  Assets:Cash",
    );
    const { content, at } = insert(
      [
        'pushmeta trip: "Lisbon"',
        txn("2026-09-02", "First"),
        txn("2026-09-05", "Last"),
        "popmeta trip:",
      ],
      own,
    );
    expect(content).toBe(
      file(
        'pushmeta trip: "Lisbon"',
        txn("2026-09-02", "First"),
        "",
        "popmeta trip:",
        own,
        'pushmeta trip: "Lisbon"',
        txn("2026-09-05", "Last"),
        "popmeta trip:",
      ),
    );
    expect(at).toEqual(['2026-09-03 * "Own" "note" #mine']);
  });

  it("threads several entries into one scope with single separators", () => {
    const { content, lines, at } = insert(
      [
        ...before,
        "pushtag #trip",
        txn("2026-09-02", "First"),
        "",
        txn("2026-09-05", "Last"),
        "poptag #trip",
      ],
      file(
        txn("2026-09-03", "One"),
        "",
        txn("2026-09-03", "Two"),
        "",
        txn("2026-09-01", "Early"),
      ),
    );
    expect(at).toEqual([
      '2026-09-03 * "One" "note"',
      '2026-09-03 * "Two" "note"',
      '2026-09-01 * "Early" "note"',
    ]);
    expect(content).not.toMatch(/\n\n\n/);
    expect(lines.filter((line) => /^(push|pop)tag/.test(line))).toEqual([
      "pushtag #trip",
      "poptag #trip",
      "pushtag #trip",
      "poptag #trip",
    ]);
    // One and Two share the gap the scope was closed for.
    const gap = lines.indexOf("poptag #trip");
    expect(lines.indexOf(at[0])).toBe(gap + 1);
    expect(lines.indexOf(at[1])).toBeLessThan(
      lines.lastIndexOf("pushtag #trip"),
    );
    expect(lines.indexOf(at[2])).toBeLessThan(lines.indexOf("pushtag #trip"));
  });

  it("leaves an entry dated on a scope's last day after the pop, as before", () => {
    const scoped = [
      "pushtag #trip",
      txn("2026-09-02", "Scoped"),
      "poptag #trip",
    ];
    const { content } = insert(
      [...scoped, "", txn("2026-09-03", "After")],
      txn("2026-09-02", "Same day"),
    );
    expect(content).toBe(
      file(
        ...scoped,
        "",
        txn("2026-09-02", "Same day"),
        "",
        txn("2026-09-03", "After"),
      ),
    );
  });
});

// w1/197: an append rewrote every line of a CRLF file to LF, so each append to
// a Windows-authored file was a whole-file diff.
describe("insertDirectives into a CRLF file", () => {
  const crlf = [
    "2020-01-01 open Assets:X USD",
    '2020-01-02 note Assets:X "a"',
    "",
  ].join("\r\n");

  it("keeps the existing lines byte-identical and writes the block in CRLF", () => {
    const [directive] = parseDirectiveText('2020-05-01 note Assets:X "b"\n');
    const result = insertDirectives(crlf, [directive]);
    expect(result.content).toBe(`${crlf}\r\n2020-05-01 note Assets:X "b"\r\n`);
    expect(result.content.startsWith(crlf)).toBe(true);
    expect(result.content.replace(/\r\n/g, "")).not.toContain("\n");
    expect(result.content.split("\r\n")[result.inserted[0].line - 1]).toBe(
      '2020-05-01 note Assets:X "b"',
    );
  });

  it("threads a multi-line block between CRLF lines without mixing endings", () => {
    const [directive] = parseDirectiveText(
      ['2020-01-01 * "Mid"', "  Assets:X  1 USD", "  Equity:Opening", ""].join(
        "\n",
      ),
    );
    const result = insertDirectives(crlf, [directive]);
    const lines = result.content.split("\r\n");
    expect(result.content.replace(/\r\n/g, "")).not.toContain("\n");
    expect(lines[result.inserted[0].line - 1]).toBe('2020-01-01 * "Mid"');
    expect(lines).toEqual([
      "2020-01-01 open Assets:X USD",
      "",
      '2020-01-01 * "Mid"',
      "  Assets:X  1 USD",
      "  Equity:Opening",
      '2020-01-02 note Assets:X "a"',
      "",
    ]);
  });

  it("leaves an LF file in LF", () => {
    const lf = "2020-01-01 open Assets:X USD\n";
    const [directive] = parseDirectiveText('2020-05-01 note Assets:X "b"\n');
    expect(insertDirectives(lf, [directive]).content).toBe(
      '2020-01-01 open Assets:X USD\n\n2020-05-01 note Assets:X "b"\n',
    );
  });
});
