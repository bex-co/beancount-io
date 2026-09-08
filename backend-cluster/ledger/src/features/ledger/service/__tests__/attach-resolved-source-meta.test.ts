import { attachResolvedSourceMeta } from "@/features/ledger/service/ledger-journal-service";

describe("attachResolvedSourceMeta", () => {
  it("merges resolved filename and one-based lineno onto empty meta", () => {
    const out = attachResolvedSourceMeta(
      { type: "Transaction", entry_hash: "abc" },
      { file: "main.bean", startLine: 41 },
    );

    expect(out.meta).toEqual({ filename: "main.bean", lineno: 42 });
    expect(out.entry_hash).toBe("abc");
  });

  it("preserves existing user metadata while overwriting location keys", () => {
    const out = attachResolvedSourceMeta(
      {
        type: "Transaction",
        meta: { filename: "stale.bean", lineno: 1, note: "payroll" },
      },
      { file: "included/payroll.bean", startLine: 0 },
    );

    expect(out.meta).toEqual({
      filename: "included/payroll.bean",
      lineno: 1,
      note: "payroll",
    });
  });

  it("replaces a null meta object with the resolved location", () => {
    const out = attachResolvedSourceMeta(
      { type: "Transaction", meta: null },
      { file: "main.bean", startLine: 6 },
    );

    expect(out.meta).toEqual({ filename: "main.bean", lineno: 7 });
  });
});
