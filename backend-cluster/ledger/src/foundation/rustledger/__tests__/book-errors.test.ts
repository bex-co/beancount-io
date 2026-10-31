import type { BeancountError, DirectiveJson } from "@rustledger/wasm";
import {
  locateBookErrors,
  unbookedTransactions,
  withoutUnbookedTransactions,
} from "../book-errors";

// w21/534: booking and interpolation errors had no file or line, so the app
// could not open them. The messages are the engine's own for the note's
// fixtures.
const book = (message: string): BeancountError => ({
  message,
  code: "BOOK",
  phase: "validate",
  hint: null,
  file: null,
  line: null,
  column: null,
  end_line: null,
  end_column: null,
  severity: "error",
});

const main = [
  'option "operating_currency" "USD"',
  "2025-01-01 open Assets:QaBroker2 USD,HOOL",
  "",
  '2026-01-05 * "Cafe" "qa cost and elided"',
  "  Assets:QaBroker2 10 HOOL {}",
  "  Assets:Cash",
  "",
  '2026-01-06 * "Shop" "bare at at"',
  "  Assets:QaBroker2 10 HOOL @@",
  "  Assets:Cash",
  '2026-01-07 * "Gap"',
  "  Expenses:X",
  "  Assets:Cash",
].join("\n");

describe("locateBookErrors", () => {
  it("puts an interpolation error on its transaction's first line", () => {
    const [located] = locateBookErrors(
      [
        book(
          'interpolation failed: cannot infer currency for posting to account Assets:Cash (2026-01-05, "qa cost and elided")',
        ),
      ],
      { "main.bean": main },
      "main.bean",
    );
    expect(located).toMatchObject({ file: "main.bean", line: 4, column: 1 });
    expect(located.code).toBe("BOOK");
  });

  it("locates a bare @@ price and a payeeless entry", () => {
    const located = locateBookErrors(
      [
        book(
          'interpolation failed: cannot tell which currency the bare price on the Assets:QaBroker2 posting should be computed in; write the price currency (e.g. `@ 1.20 USD`) (2026-01-06, "bare at at")',
        ),
        book(
          'interpolation failed: cannot infer currency for posting to account Expenses:X (2026-01-07, "Gap")',
        ),
      ],
      { "main.bean": main },
      "main.bean",
    );
    expect(located.map((error) => error.line)).toEqual([8, 11]);
  });

  it("finds a transaction in an included file", () => {
    const [located] = locateBookErrors(
      [book('interpolation failed: x (2026-02-01, "Rent")')],
      {
        "main.bean": 'include "sub/a.bean"',
        "sub/a.bean": '\n\n2026-02-01 * "Rent"\n  A 1 USD',
      },
      "main.bean",
    );
    expect(located).toMatchObject({ file: "sub/a.bean", line: 3 });
  });

  it("pairs same-day twins in order and leaves an unmatched count alone", () => {
    const twins = {
      "main.bean": '2026-03-01 * "Dup"\n  A\n2026-03-01 * "Dup"\n  A',
    };
    const message = 'interpolation failed: x (2026-03-01, "Dup")';
    expect(
      locateBookErrors([book(message), book(message)], twins, "main.bean").map(
        (error) => error.line,
      ),
    ).toEqual([1, 3]);
    expect(
      locateBookErrors([book(message)], twins, "main.bean")[0].line,
    ).toBeNull();
  });

  it("leaves other errors and located ones as they were", () => {
    const other = { ...book("something"), code: "E1001" };
    const located = {
      ...book('x (2026-01-05, "qa cost and elided")'),
      file: "main.bean",
      line: 99,
    };
    expect(
      locateBookErrors([other, located], { "main.bean": main }, "main.bean"),
    ).toEqual([other, located]);
  });
});

// w21/678: a sale that matches no lot is reported, yet the engine keeps it half
// booked, and every balance counted it. These pick out the transactions a
// `BOOK` error names so balances can skip them.
describe("unbookedTransactions", () => {
  const tx = (date: string, narration: string): DirectiveJson =>
    ({ type: "transaction", date, narration, postings: [] }) as never;
  const noLot = (date: string, narration: string) =>
    book(`No matching lot for VTI in Assets:Broker (${date}, "${narration}")`);
  const sell = tx("2026-03-01", "QA Sell");
  const buy = tx("2026-02-01", "QA Buy");

  it("names the transaction a BOOK error ends with", () => {
    expect(
      unbookedTransactions([noLot("2026-03-01", "QA Sell")], [buy, sell]),
    ).toEqual([sell]);
  });

  it("ignores other error codes and directives that are not transactions", () => {
    const open = { type: "open", date: "2026-03-01" } as never as DirectiveJson;
    const other = { ...book('x (2026-03-01, "QA Sell")'), code: "E1001" };
    expect(unbookedTransactions([other], [open, sell])).toEqual([]);
    expect(
      unbookedTransactions([noLot("2026-03-01", "QA Sell")], [open]),
    ).toEqual([]);
  });

  it("marks every twin when as many errors name them as there are twins", () => {
    const twin = tx("2026-03-01", "QA Sell");
    expect(
      unbookedTransactions(
        [noLot("2026-03-01", "QA Sell"), noLot("2026-03-01", "QA Sell")],
        [sell, twin],
      ),
    ).toEqual([sell, twin]);
  });

  it("leaves twins alone when it cannot tell which one failed", () => {
    const twin = tx("2026-03-01", "QA Sell");
    expect(
      unbookedTransactions([noLot("2026-03-01", "QA Sell")], [sell, twin]),
    ).toEqual([]);
  });

  it("reads an escaped quote in the narration", () => {
    const quoted = tx("2026-03-01", 'Say "hi"');
    expect(
      unbookedTransactions([noLot("2026-03-01", 'Say \\"hi\\"')], [quoted]),
    ).toEqual([quoted]);
  });

  it("finds nothing when no error names a transaction", () => {
    expect(unbookedTransactions([], [buy, sell])).toEqual([]);
  });
});

describe("withoutUnbookedTransactions", () => {
  const sale = book(
    'No matching lot for VTI in Assets:Broker (2026-03-01, "QA Sell")',
  );
  const source = [
    '2026-02-01 * "QA Buy"',
    "  Assets:Broker  10 VTI {100.00 USD}",
    '2026-03-01 * "QA Sell"',
    '  note: "kept with its entry"',
    "  Assets:Broker  -5 VTI {101.00 USD}",
    "  Income:Gains",
    "",
    '2026-04-01 * "After"',
    "  Assets:Cash  1 USD",
  ];

  it("blanks the transaction's lines and nothing else, line for line", () => {
    const out = withoutUnbookedTransactions(
      { "main.bean": source.join("\n") },
      [sale],
      "main.bean",
    )!["main.bean"];
    expect(out.split("\n")).toEqual([
      source[0],
      source[1],
      "",
      "",
      "",
      "",
      "",
      source[7],
      source[8],
    ]);
  });

  it("keeps a CRLF file's line breaks", () => {
    const out = withoutUnbookedTransactions(
      { "main.bean": source.join("\r\n") },
      [sale],
      "main.bean",
    )!["main.bean"];
    expect(out.split("\r\n")).toHaveLength(source.length);
    expect(out).not.toContain("QA Sell");
    expect(out).toContain("QA Buy");
  });

  it("changes nothing when no error can be placed on a transaction", () => {
    expect(
      withoutUnbookedTransactions(
        { "main.bean": source.join("\n") },
        [book('No matching lot (2030-01-01, "Nope")')],
        "main.bean",
      ),
    ).toBeUndefined();
    expect(
      withoutUnbookedTransactions({ "main.bean": "" }, [], "main.bean"),
    ).toBeUndefined();
  });
});
