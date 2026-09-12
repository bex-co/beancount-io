import { renderToolText } from "../mcp-result-text";

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
    const text = renderToolText("runBqlQuery", { ok: true, result: table });
    expect(text.split("\n")[0]).toBe("2 rows");
    expect(text).toContain("Assets:Cash     100.00 USD");
    // The table is the table, not a JSON string of one.
    expect(text).not.toContain("\\n");
  });

  it("says why an empty result is empty", () => {
    expect(renderToolText("runBqlQuery", { ok: true, result: "" })).toBe(
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
      renderToolText("runBqlQuery", { ok: true, result: single }).split("\n")[0],
    ).toBe("1 row");
  });

  it("falls back to counting lines for a result with no table rule", () => {
    expect(
      renderToolText("runBqlQuery", {
        ok: true,
        result: "2026-01-01 open Assets:Cash",
      }).split("\n")[0],
    ).toBe("1 row");
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

  /**
   * `checkLedger` is the tool an agent calls to learn one fact, and its
   * payload is a per-directive-type census too long to repeat. Before this it
   * summarized as "checkLedger: ok", which does not answer what was asked.
   */
  it("leads a verdict payload with its error count", () => {
    expect(
      renderToolText("checkLedger", {
        ok: true,
        result: { errors: [], entriesCount: [{ type: "Open", number: 30 }] },
      }),
    ).toContain("No errors");

    expect(
      renderToolText("checkLedger", {
        ok: true,
        result: {
          errors: [{ message: "a" }, { message: "b" }],
          entriesCount: [],
        },
      }).split("\n")[0],
    ).toBe("2 errors");
  });

  it("says something rather than nothing for a payload it cannot summarize", () => {
    expect(renderToolText("deleteAccount", { ok: true, result: true })).toBe(
      "deleteAccount: true",
    );
  });
});
