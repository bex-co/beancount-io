import type { BeancountError, DirectiveJson } from "@rustledger/wasm";
import { errorsHiddenByUnusedPads } from "../pad-recheck";

/** The errors a re-check adds. */
const added = async (...args: Parameters<typeof errorsHiddenByUnusedPads>) =>
  (await errorsHiddenByUnusedPads(...args)).added;

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
    const errors = await added(
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
    const errors = await added(
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
    const errors = await added(
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
    const errors = await added(
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
    const errors = await added(
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
    await added(
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
      const errors = await added(
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
      const errors = await added(
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

  // w21/706: rustledger reports "Multiple pad directives" on the pad after an
  // unused one, which Beancount never does; it goes once the unused pad does.
  describe("Multiple pad directives", () => {
    const twoPads = `2026-01-01 open Assets:Cash
2026-02-01 pad Assets:Cash Equity:Open
2026-02-02 balance Assets:Cash  100.00 USD
2026-03-01 pad Assets:Cash Equity:Open
2026-03-02 balance Assets:Cash  120.00 USD
`;
    const multiple: BeancountError = {
      ...failed,
      code: "E2004",
      message:
        "Multiple pad directives for Assets:Cash USD before balance assertion",
      line: 4,
    };
    const used: DirectiveJson = { ...pad, date: "2026-03-01" };
    const usedPadding: DirectiveJson = {
      ...padding,
      date: "2026-03-01",
      postings: [
        {
          account: "Assets:Cash",
          units: { number: "20.00", currency: "USD" },
        },
        {
          account: "Equity:Open",
          units: { number: "-20.00", currency: "USD" },
        },
      ],
    };

    it("is cleared when it does not recur without the unused pad", async () => {
      const result = await errorsHiddenByUnusedPads(
        [pad, used],
        [usedPadding],
        { "main.bean": twoPads },
        [multiple],
        async () => [],
      );
      expect(result.cleared).toEqual([multiple]);
      expect(result.added.map((e) => [e.code, e.line])).toEqual([["E2003", 2]]);
    });

    it("stays when it recurs", async () => {
      const result = await errorsHiddenByUnusedPads(
        [pad, used],
        [usedPadding],
        { "main.bean": twoPads },
        [multiple],
        async () => [{ ...multiple }],
      );
      expect(result.cleared).toEqual([]);
    });

    it("stays when nothing was re-checked", async () => {
      const result = await errorsHiddenByUnusedPads(
        [used],
        [usedPadding],
        { "main.bean": twoPads },
        [multiple],
        async () => [],
      );
      expect(result).toEqual({ added: [], cleared: [] });
    });
  });

  // w21/706: every pad re-split every file, so 4000 unused pads took seconds
  // in this step alone.
  it("finds and blanks 4000 unused pads in one pass over the files", async () => {
    const day = (n: number) =>
      new Date(Date.UTC(2000, 0, 1) + n * 86_400_000)
        .toISOString()
        .slice(0, 10);
    const pads: DirectiveJson[] = [];
    let source = "2000-01-01 open Assets:Cash\n";
    for (let i = 1; i <= 4000; i += 1) {
      pads.push({ ...pad, date: day(2 * i) });
      source += `${day(2 * i)} pad Assets:Cash Equity:Open\n${day(2 * i + 1)} balance Assets:Cash  100.00 USD\n`;
    }
    let blanked = "";
    const started = Date.now();
    const errors = await added(
      pads,
      [],
      { "main.bean": source },
      [],
      async (files) => {
        blanked = files["main.bean"];
        return [];
      },
    );
    expect(Date.now() - started < 1000).toBe(true);
    expect(errors).toHaveLength(4000);
    expect(errors[3999].line).toBe(8000);
    expect(blanked.includes(" pad ")).toBe(false);
    expect(blanked.split("\n")).toHaveLength(source.split("\n").length);
  });
});
