import { renderToolText } from "../mcp-result-text";
import { BQL_ROW_COUNT } from "../../tools/bql-result-metadata";

function bqlResult(text: string, rowCount: unknown) {
  return Object.defineProperty({ ok: true, result: text }, BQL_ROW_COUNT, {
    value: rowCount,
  });
}

/**
 * w2/m28:t001. Before this, a BQL result reached the model as
 * `{"ok":true,"result":"   account   balance\n---"}` — the table's own
 * newlines escaped — and an empty result reached it as `""`.
 */
describe("renderToolText", () => {
  const table = [
    "   account         balance",
    "------------ -------------",
    "Assets:Cash     100.00 USD",
    "Assets:Bank     250.00 USD",
  ].join("\n");

  it("leads a BQL result with the row count and keeps the table readable", () => {
    const text = renderToolText("runBqlQuery", bqlResult(table, 2));
    expect(text.split("\n")[0]).toBe("2 rows");
    expect(text).toContain("Assets:Cash     100.00 USD");
    // The table is the table, not a JSON string of one.
    expect(text).not.toContain("\\n");
  });

  it("states an empty result's count without guessing its cause", () => {
    // LIMIT 0 or a HAVING that drops every group also returns zero rows from
    // postings that did match, so "no postings matched" overclaimed (w6/014).
    expect(renderToolText("runBqlQuery", bqlResult("", 0))).toBe("0 rows");
  });

  it("counts one row in the singular", () => {
    const single = [
      "   account         balance",
      "------------ -------------",
      "Assets:Cash     100.00 USD",
    ].join("\n");
    expect(
      renderToolText("runBqlQuery", bqlResult(single, 1)).split("\n")[0],
    ).toBe("1 row");
  });

  it.each([
    ["multiline cell", "qa_text\n-------\nqa\nline\n", 1],
    ["literal backslash", "qa_text\n--------\nqa\\nline\n", 1],
    ["one-character column", "q\n-\n1\n", 1],
    ["two-character column", "q \n--\n12\n", 1],
    ["blank cell", "q\n-\n \n", 1],
    ["count aggregation", "qa\n--\n34\n", 1],
    [
      "multiline directive cells",
      'entry\n-----\n2026-01-01 * "Fixture"\n  Assets:Cash  1 USD\n  Equity:Opening  -1 USD\n2026-01-02 open Assets:Cash\n',
      2,
    ],
  ] as const)("uses canonical rows for a %s", (_name, payload, rowCount) => {
    const result = bqlResult(payload, rowCount);
    expect(renderToolText("runBqlQuery", result)).toBe(
      `${rowCount} ${rowCount === 1 ? "row" : "rows"}\n${payload.replace(/\n$/, "")}`,
    );
    expect(result.result).toBe(payload);
  });

  it("keeps trailing all-blank row lines so the lines match the claimed count (w23/194)", () => {
    // Three rows of blank payees: the header said 3 rows and `trimEnd()` left none.
    const blanks = "payee\n-----\n     \n     \n     \n";
    const text = renderToolText("runBqlQuery", bqlResult(blanks, 3));
    expect(text).toBe("3 rows\npayee\n-----\n     \n     \n     ");
    expect(text.split("\n").slice(3)).toHaveLength(3);
    // Interior blank rows were already kept; trailing ones now match.
    const mixed = "payee\n-----\n     \nACME \n     \n";
    expect(
      renderToolText("runBqlQuery", bqlResult(mixed, 3)).split("\n").slice(3),
    ).toEqual(["     ", "ACME ", "     "]);
    // A table of nothing but whitespace is still just the count.
    expect(renderToolText("runBqlQuery", bqlResult("  \n", 0))).toBe("0 rows");
  });

  it("keeps the full text result count beyond the structured tool's ceiling", () => {
    const payload =
      [
        "number",
        "------",
        ...Array.from({ length: 1001 }, (_, index) => String(index)),
      ].join("\n") + "\n";
    const result = bqlResult(payload, 1001);
    expect(renderToolText("runBqlQuery", result)).toBe(
      `1001 rows\n${payload.trimEnd()}`,
    );
    expect(result.result).toBe(payload);
  });

  it("keeps text without row metadata readable without guessing its count", () => {
    expect(
      renderToolText("runBqlQuery", {
        ok: true,
        result: "2026-01-01 open Assets:Cash",
      }),
    ).toBe("BQL result — row count unavailable\n2026-01-01 open Assets:Cash");
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["negative", -1],
    ["fractional", 1.5],
    ["NaN", Number.NaN],
    ["infinite", Number.POSITIVE_INFINITY],
    ["string", "2"],
    ["boolean", true],
  ])("does not guess rows when private metadata is %s", (_name, rowCount) => {
    expect(renderToolText("runBqlQuery", bqlResult(table, rowCount))).toBe(
      `BQL result — row count unavailable\n${table}`,
    );
  });

  it.each([undefined, null])(
    "does not announce zero rows for empty text with unknown metadata %s",
    (rowCount) => {
      expect(renderToolText("runBqlQuery", bqlResult("", rowCount))).toBe(
        "BQL result — row count unavailable",
      );
    },
  );

  it("does not use an ordinary public property as canonical private metadata", () => {
    expect(
      renderToolText("runBqlQuery", { ok: true, result: table, rowCount: 2 }),
    ).toBe(`BQL result — row count unavailable\n${table}`);
  });

  it("leads a write result with the summary the write already computed", () => {
    const text = renderToolText("addLedgerEntries", {
      ok: true,
      result: {
        summary: "Added 1 entry to main.bean. No new bean-check errors.",
        wrote: [{ path: "main.bean" }],
      },
    });
    expect(text.split("\n")[0]).toBe(
      "Added 1 entry to main.bean. No new bean-check errors.",
    );
  });

  it("reports the row count and truncation of a typed BQL result", () => {
    expect(
      renderToolText("runBqlQueryStructured", {
        ok: true,
        result: { resultType: "table", rowCount: 1000, truncated: true },
      }).split("\n")[0],
    ).toBe("1000 rows (truncated)");
  });

  /** The text block's last line, parsed: what a text-only client receives. */
  const carried = (text: string): unknown =>
    JSON.parse(text.split("\n").at(-1) ?? "");

  it("counts a long list and still carries every row, for a client that reads only text", () => {
    // A text-only client (claude.ai's connector) used to get "42 items" and
    // nothing else: no transactionId to import, discard or refresh with.
    const staged = Array.from({ length: 42 }, (_, i) => ({
      id: `pbtx_${i}`,
      transactionId: `txn_${i}`,
      date: "2026-11-08",
      name: `PAYEE ${i}`,
      amount: 12.34 + i,
    }));
    const envelope = { ok: true, result: staged };
    const text = renderToolText("listStagedBankTransactions", envelope);
    expect(text.split("\n")[0]).toBe("42 items");
    expect(carried(text)).toEqual(envelope);
    for (const row of staged) expect(text).toContain(row.transactionId);
  });

  it("carries an object payload that has no count to lead with", () => {
    const envelope = {
      ok: true,
      result: {
        connections: [{ id: "pitm_1", institutionName: "First Bank" }],
        accounts: [{ id: "pacc_1", itemId: "pitm_1", mask: "0001" }],
      },
    };
    const text = renderToolText("listBankConnections", envelope);
    expect(text.split("\n")[0]).toBe("listBankConnections: ok");
    expect(carried(text)).toEqual(envelope);
  });

  it("counts the one collection a payload wraps", () => {
    const envelope = {
      ok: true,
      result: {
        files: Array.from({ length: 12 }, (_, i) => ({
          path: `a-reasonably-long-file-name-${i}.bean`,
        })),
      },
    };
    const text = renderToolText("listLedgerFiles", envelope);
    expect(text.split("\n")[0]).toBe("12 files");
    expect(carried(text)).toEqual(envelope);
  });

  it("carries a multiline string payload past its first line", () => {
    const envelope = { ok: true, result: "first line\nsecond line" };
    const text = renderToolText("someTextTool", envelope);
    expect(text.split("\n")[0]).toBe("first line");
    expect(carried(text)).toEqual(envelope);
  });

  it("says something rather than nothing for a payload it cannot summarize", () => {
    const text = renderToolText("deleteAccount", { ok: true, result: true });
    expect(text).toBe('deleteAccount: true\n{"ok":true,"result":true}');
  });

  it("carries what structuredContent carries beside the result, such as a page signal", () => {
    const result = { ok: true, result: [{ fullName: "alice/a" }] };
    const structured = { ...result, page: { returned: 1, hasMore: true } };
    const text = renderToolText("listLedgers", result, structured);
    expect(text.split("\n")[0]).toBe("1 item");
    expect(carried(text)).toEqual(structured);
  });
});
