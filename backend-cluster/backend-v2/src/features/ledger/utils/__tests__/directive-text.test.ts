import {
  insertDirectives,
  parseDirectiveText,
} from "@/features/ledger/utils/directive-text";
import { BadUserInputError } from "@/shared/errors";

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
        '2026-01-01 open Assets:Cash USD',
        "",
        txn("2026-02-01", "Shop"),
        "",
        "2026-02-02 price USD 1.00 USD",
        '2026-02-03 balance Assets:Cash 90.00 USD',
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

  it("accepts the undated directives that have no date to sort by", () => {
    expect(
      parseDirectiveText('option "title" "My Ledger"\ninclude "2026.bean"'),
    ).toEqual([
      { date: null, kind: "Custom", text: 'option "title" "My Ledger"' },
      { date: null, kind: "Custom", text: 'include "2026.bean"' },
    ]);
  });

  it("refuses content that is not directives, naming the line", () => {
    expect(() =>
      parseDirectiveText("Here are the transactions you asked for:"),
    ).toThrow(BadUserInputError);
    expect(() => parseDirectiveText("+++ b/main.bean")).toThrow(
      /line 1: not a Beancount directive/,
    );
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
    expect(content.trimEnd().endsWith("  Assets:Cash    -10.00 USD")).toBe(true);
    const dates = [...content.matchAll(/^(\d{4}-\d{2}-\d{2}) \*/gm)].map(
      (match) => match[1],
    );
    expect(dates).toEqual(["2026-01-05", "2026-03-05", "2026-12-31"]);
  });

  it("appends to an unsorted file rather than reordering somebody's ledger", () => {
    const unsorted = [txn("2026-05-01", "Late"), "", txn("2026-01-01", "Early")].join(
      "\n",
    );
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
