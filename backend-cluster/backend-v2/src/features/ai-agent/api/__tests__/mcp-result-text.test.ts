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

  it("says why an empty result is empty", () => {
    expect(renderToolText("runBqlQuery", bqlResult("", 0))).toBe(
      "0 rows — no postings matched",
    );
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
      `${rowCount} ${rowCount === 1 ? "row" : "rows"}\n${payload.replace(/\s+$/, "")}`,
    );
    expect(result.result).toBe(payload);
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

  it("counts a list payload rather than reprinting it when it is long", () => {
    const ledgers = Array.from({ length: 40 }, (_, i) => ({
      fullName: `alice/ledger-${i}`,
      description: "a ledger with a description long enough to matter",
    }));
    const text = renderToolText("listLedgers", { ok: true, result: ledgers });
    expect(text).toBe("40 items");
  });

  it("repeats a short payload under the summary, where reading it is free", () => {
    const text = renderToolText("generateTempAssetUploadUrl", {
      ok: true,
      result: { objectKey: "tmp/usr_1/a.png" },
    });
    expect(text.split("\n")[1]).toBe('{"objectKey":"tmp/usr_1/a.png"}');
  });

  it("counts the one collection a payload wraps", () => {
    expect(
      renderToolText("listLedgerFiles", {
        ok: true,
        result: {
          files: Array.from({ length: 12 }, (_, i) => ({
            path: `a-reasonably-long-file-name-${i}.bean`,
          })),
        },
      }),
    ).toBe("12 files");
  });

  it("says something rather than nothing for a payload it cannot summarize", () => {
    expect(renderToolText("deleteAccount", { ok: true, result: true })).toBe(
      "deleteAccount: true",
    );
  });
});
