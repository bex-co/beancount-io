import type { BeancountError, DirectiveJson } from "@rustledger/wasm";
import { errorsHiddenByUnusedPads } from "../pad-recheck";

/**
 * w21/675, w21/676: a pad that was not needed (or was dropped as within
 * tolerance) still hid a later failing balance from rustledger's checks. The
 * engine is scripted here (WASM-free); the live run is in the commit notes.
 */
const MAIN = `2026-01-01 open Assets:Cash
2026-02-01 pad Assets:Cash Equity:Open
2026-02-02 balance Assets:Cash  100.00 USD
2026-02-04 balance Assets:Cash  100.00 USD
`;
const pad: DirectiveJson = {
  type: "pad",
  date: "2026-02-01",
  account: "Assets:Cash",
  source_account: "Equity:Open",
};
const padding: DirectiveJson = {
  type: "transaction",
  date: "2026-02-01",
  flag: "P",
  narration: "(Padding)",
  tags: [],
  links: [],
  postings: [
    { account: "Assets:Cash", units: { number: "10.00", currency: "USD" } },
    { account: "Equity:Open", units: { number: "-10.00", currency: "USD" } },
  ],
};
const failed: BeancountError = {
  message: "Balance failed for Assets:Cash: expected 100.00 USD, got 90.00 USD",
  code: "E2001",
  phase: "validate",
  hint: null,
  file: "main.bean",
  line: 4,
  column: 1,
  end_line: null,
  end_column: null,
  severity: "error",
};

describe("errorsHiddenByUnusedPads", () => {
  it("reports the unused pad and the later failure it hid", async () => {
    const seen: string[] = [];
    const errors = await errorsHiddenByUnusedPads(
      [pad],
      [],
      { "main.bean": MAIN },
      [],
      async (files) => {
        seen.push(files["main.bean"]);
        return [failed];
      },
    );
    expect(errors.map((e) => [e.code, e.line])).toEqual([
      ["E2003", 2],
      ["E2001", 4],
    ]);
    // Checked again with the pad blanked and every line number kept.
    expect(seen[0].split("\n")).toHaveLength(MAIN.split("\n").length);
    expect(seen[0].split("\n")[1]).toBe("");
    expect(seen[0].split("\n")[3]).toContain("2026-02-04 balance");
  });

  it("does not repeat an error the first run already had", async () => {
    const errors = await errorsHiddenByUnusedPads(
      [pad],
      [],
      { "main.bean": MAIN },
      [
        {
          ...failed,
          message: "Unused Pad entry",
          code: "E2003",
          line: 2,
        },
        failed,
      ],
      async () => [failed],
    );
    expect(errors).toEqual([]);
  });

  it("leaves a pad that padded alone, and never re-parses for it", async () => {
    const reparse = jest.fn(async () => []);
    const errors = await errorsHiddenByUnusedPads(
      [pad],
      [padding],
      { "main.bean": MAIN },
      [],
      reparse,
    );
    expect(errors).toEqual([]);
    expect(reparse).not.toHaveBeenCalled();
  });

  it("takes only balance failures from the second run", async () => {
    const errors = await errorsHiddenByUnusedPads(
      [pad],
      [],
      { "main.bean": MAIN },
      [],
      async () => [{ ...failed, code: "E1001", message: "Account not open" }],
    );
    expect(errors.map((e) => e.code)).toEqual(["E2003"]);
  });
});
