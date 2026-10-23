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

  // w21/676: padding within the balance's `~` tolerance is dropped (w21/135), so
  // the pad is unused, and the next balance reads the unpadded 98.00.
  it("reports the failure after a padding dropped as within tolerance", async () => {
    const source = `2026-01-01 open Assets:Cash
2026-01-31 pad Assets:Cash Equity:Open
2026-02-01 balance Assets:Cash  100.00 ~ 5.00 USD
2026-03-01 balance Assets:Cash  100.00 USD
`;
    const later = {
      ...failed,
      message:
        "Balance failed for Assets:Cash: expected 100.00 USD, got 98.00 USD",
      line: 4,
    };
    const errors = await errorsHiddenByUnusedPads(
      [{ ...pad, date: "2026-01-31" }],
      [],
      { "main.bean": source },
      [],
      async () => [later],
    );
    expect(errors.map((e) => [e.code, e.line, e.message])).toEqual([
      ["E2003", 2, "Unused Pad entry"],
      ["E2001", 4, later.message],
    ]);
  });

  // w21/704: in a ledger with amortize_over the first run validated the
  // plugin's transformed stream; the blanked source has none of its copies, so
  // the engine re-checks that stream instead and needs to know which pads to
  // leave out of it.
  it("hands the second run the unused pads themselves", async () => {
    const used: DirectiveJson = { ...pad, date: "2026-01-15" };
    const usedPadding: DirectiveJson = { ...padding, date: "2026-01-15" };
    const seen: (readonly DirectiveJson[])[] = [];
    await errorsHiddenByUnusedPads(
      [used, pad],
      [usedPadding],
      { "main.bean": MAIN },
      [],
      async (_files, unused) => {
        seen.push(unused);
        return [];
      },
    );
    expect(seen).toHaveLength(1);
    expect(seen[0]).toHaveLength(1);
    expect(seen[0][0]).toBe(pad);
  });

  // w21/705: the pad filled USD, so it counted as used and its account's later
  // EUR balance was never checked on its own, as Beancount checks it.
  describe("a pad that filled another currency", () => {
    const source = `2026-01-01 open Assets:Cash
2026-02-01 pad Assets:Cash Equity:Open
2026-02-02 balance Assets:Cash  100.00 USD
2026-02-02 balance Assets:Cash  50.00 EUR
2026-02-04 balance Assets:Cash  50.00 EUR ; after the spend
2026-02-05 balance Equity:Open  -100.00 USD
`;
    const balance = (
      date: string,
      account: string,
      number: string,
      currency: string,
    ): DirectiveJson => ({
      type: "balance",
      date,
      account,
      amount: { number, currency },
    });
    const usdPadding: DirectiveJson = {
      ...padding,
      postings: [
        {
          account: "Assets:Cash",
          units: { number: "100.00", currency: "USD" },
        },
        {
          account: "Equity:Open",
          units: { number: "-100.00", currency: "USD" },
        },
      ],
    };
    const at = (line: number, message: string): BeancountError => ({
      ...failed,
      line,
      message,
    });
    const eur = at(5, "Balance failed for Assets:Cash: expected 50.00 EUR");
    // Only the blanking caused these: the pad's USD padding is gone.
    const usd = at(3, "Balance failed for Assets:Cash: expected 100.00 USD");
    const sourceUsd = at(6, "Balance failed for Equity:Open");

    it("re-checks its account's other currency, without reporting it unused", async () => {
      const seen: string[] = [];
      const errors = await errorsHiddenByUnusedPads(
        [
          pad,
          balance("2026-02-02", "Assets:Cash", "100.00", "USD"),
          balance("2026-02-02", "Assets:Cash", "50.00", "EUR"),
          balance("2026-02-04", "Assets:Cash", "50.00", "EUR"),
        ],
        [usdPadding],
        { "main.bean": source },
        [],
        async (files, unused) => {
          seen.push(files["main.bean"].split("\n")[1]);
          expect(unused).toEqual([pad]);
          return [usd, eur, sourceUsd];
        },
      );
      expect(errors).toEqual([eur]);
      expect(seen).toEqual([""]);
    });

    it("is not re-checked when the account asserts only what it filled", async () => {
      const reparse = jest.fn(async () => [usd]);
      const errors = await errorsHiddenByUnusedPads(
        [
          pad,
          balance("2026-02-02", "Assets:Cash", "100.00", "USD"),
          balance("2026-02-09", "Assets:Cash", "100.00", "USD"),
          // Another account's EUR does not count.
          balance("2026-02-04", "Assets:Other", "5.00", "EUR"),
        ],
        [usdPadding],
        { "main.bean": source },
        [],
        reparse,
      );
      expect(errors).toEqual([]);
      expect(reparse).not.toHaveBeenCalled();
    });
  });
});
