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
    const usd = at(3, "Balance failed for Assets:Cash: expected 100.00 USD");

    it("re-checks its account's other currency with its own padding in place", async () => {
      const seen: { lines: string[]; removed: unknown; standIns: unknown }[] =
        [];
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
        async (files, removed, standIns) => {
          seen.push({
            lines: files["main.bean"].split("\n"),
            removed,
            standIns,
          });
          return [eur];
        },
      );
      // Not reported unused: it was used, for USD.
      expect(errors).toEqual([eur]);
      expect(seen[0].removed).toEqual([pad]);
      expect(seen[0].standIns).toEqual([usdPadding]);
      // The pad's line is blank, every line keeps its number, and the padding
      // it added stands after them.
      const { lines } = seen[0];
      expect(lines[1]).toBe("");
      expect(lines[4]).toContain("2026-02-04 balance");
      expect(lines.slice(7).join("\n")).toMatch(
        /^2026-02-01 \* "\(Padding\)"\n\s+Assets:Cash\s+100\.00 USD\n\s+Equity:Open\s+-100\.00 USD/,
      );
    });

    // w21/720: the second pad was unused and hid the 04-02 failure; blanking
    // the first, used one dropped its USD padding, and the filter for what that
    // caused dropped the hidden failure too.
    it("reports a failure an unused pad hid in the currency another pad filled", async () => {
      const twoPads = `2024-01-01 open Assets:Cash
2024-01-02 pad Assets:Cash Equity:Open
2024-01-03 balance Assets:Cash  100 USD
2024-01-04 balance Assets:Cash  50 EUR
2024-03-01 pad Assets:Cash Equity:Open
2024-03-02 balance Assets:Cash  100 USD
2024-04-02 balance Assets:Cash  100 USD
`;
      const first: DirectiveJson = { ...pad, date: "2024-01-02" };
      const second: DirectiveJson = { ...pad, date: "2024-03-01" };
      const later = at(
        7,
        "Balance failed for Assets:Cash: expected 100 USD, got 70 USD",
      );
      const errors = await added(
        [
          first,
          balance("2024-01-03", "Assets:Cash", "100", "USD"),
          balance("2024-01-04", "Assets:Cash", "50", "EUR"),
          second,
          balance("2024-03-02", "Assets:Cash", "100", "USD"),
          balance("2024-04-02", "Assets:Cash", "100", "USD"),
        ],
        [{ ...usdPadding, date: "2024-01-02" }],
        { "main.bean": twoPads },
        [],
        async (_files, removed) => {
          expect(removed).toEqual([second, first]);
          return [later];
        },
      );
      expect(errors.map((e) => [e.code, e.line])).toEqual([
        ["E2003", 5],
        ["E2001", 7],
      ]);
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

  // w31/014: rustledger fills a pad's balance in the pass that checks it, so a
  // balance its padding moves after that check passed. bean-check 3.2.3:
  // "Balance failed for 'Assets:A': expected 100 USD != accumulated 0 USD".
  describe("a padding that moves a balance rustledger checked without it", () => {
    const balance = (
      date: string,
      account: string,
      number: string,
    ): DirectiveJson => ({
      type: "balance",
      date,
      account,
      amount: { number, currency: "USD" },
    });
    const padOf = (
      account: string,
      source: string,
      date = "2026-09-03",
    ): DirectiveJson => ({
      type: "pad",
      date,
      account,
      source_account: source,
    });
    const paddingOf = (
      account: string,
      source: string,
      number: string,
      date = "2026-09-03",
    ): DirectiveJson => ({
      ...padding,
      date,
      postings: [
        { account, units: { number, currency: "USD" } },
        { account: source, units: { number: `-${number}`, currency: "USD" } },
      ],
    });
    const at = (line: number, account: string, got: string) => ({
      ...failed,
      line,
      message: `Balance failed for ${account}: expected 100 USD, got ${got} USD`,
    });

    it("re-checks a pad from its own account with its padding in place", async () => {
      const source = `2026-09-01 open Assets:A USD
2026-09-03 pad Assets:A Assets:A
2026-09-04 balance Assets:A 100 USD
`;
      const self = padOf("Assets:A", "Assets:A");
      const selfPadding = paddingOf("Assets:A", "Assets:A", "100");
      const seen: { lines: string[]; removed: unknown; standIns: unknown }[] =
        [];
      const errors = await added(
        [self, balance("2026-09-04", "Assets:A", "100")],
        [selfPadding],
        { "main.bean": source },
        [],
        async (files, removed, standIns) => {
          seen.push({
            lines: files["main.bean"].split("\n"),
            removed,
            standIns,
          });
          return [at(3, "Assets:A", "0")];
        },
      );
      // Used, so not reported unused: the balance it could not fill fails.
      expect(errors.map((e) => [e.code, e.line])).toEqual([["E2001", 3]]);
      expect(seen).toHaveLength(1);
      expect(seen[0].removed).toEqual([self]);
      expect(seen[0].standIns).toEqual([selfPadding]);
      expect(seen[0].lines[1]).toBe("");
      expect(seen[0].lines.slice(4).join("\n")).toMatch(
        /^2026-09-03 \* "\(Padding\)"\n\s+Assets:A\s+100 USD\n\s+Assets:A\s+-100 USD/,
      );
    });

    it("re-checks a pad from a child of its account", async () => {
      const reparse = jest.fn(async () => [at(4, "Assets:A", "0")]);
      const errors = await added(
        [
          padOf("Assets:A", "Assets:A:Sub"),
          balance("2026-09-04", "Assets:A", "100"),
        ],
        [paddingOf("Assets:A", "Assets:A:Sub", "100")],
        { "main.bean": "x\nx\n2026-09-03 pad Assets:A Assets:A:Sub\n" },
        [],
        reparse,
      );
      expect(reparse).toHaveBeenCalledTimes(1);
      expect(errors.map((e) => [e.code, e.line])).toEqual([["E2001", 4]]);
    });

    // The second pad is filled on B's balance, after A's was checked, and
    // posts into A on a day before it. Every used pad stands in for the
    // second run, or the engine would pad A again around the stand-in.
    it("re-checks every used pad when a later-filled pad posts into a checked account", async () => {
      const source = `2026-09-01 open Assets:A USD
2026-09-03 pad Assets:A Equity:Open
2026-09-03 pad Assets:B Assets:A
2026-09-04 balance Assets:A 100 USD
2026-09-04 balance Assets:B 50 USD
`;
      const first = padOf("Assets:A", "Equity:Open");
      const second = padOf("Assets:B", "Assets:A");
      let removed: readonly DirectiveJson[] = [];
      const errors = await added(
        [
          first,
          second,
          balance("2026-09-04", "Assets:A", "100"),
          balance("2026-09-04", "Assets:B", "50"),
        ],
        [
          paddingOf("Assets:A", "Equity:Open", "100"),
          paddingOf("Assets:B", "Assets:A", "50"),
        ],
        { "main.bean": source },
        [],
        async (_files, gone) => {
          removed = gone;
          return [at(4, "Assets:A", "50")];
        },
      );
      expect(removed).toEqual([first, second]);
      expect(errors.map((e) => [e.code, e.line])).toEqual([["E2001", 4]]);
    });

    it("re-checks a parent's balance dated between a padding and its own", async () => {
      const reparse = jest.fn(async () => []);
      await added(
        [
          padOf("Assets:A:Sub", "Equity:Open"),
          balance("2026-09-04", "Assets:A", "0"),
          balance("2026-09-05", "Assets:A:Sub", "100"),
        ],
        [paddingOf("Assets:A:Sub", "Equity:Open", "100")],
        { "main.bean": "x\nx\n2026-09-03 pad Assets:A:Sub Equity:Open\n" },
        [],
        reparse,
      );
      expect(reparse).toHaveBeenCalledTimes(1);
    });

    it("leaves padding whose balances all came after it", async () => {
      const reparse = jest.fn(async () => []);
      const errors = await added(
        [
          // A pad from the parent fills only the child's balance.
          padOf("Assets:A:Sub", "Assets:A"),
          // The same day's balance is checked before that day's padding.
          balance("2026-09-03", "Assets:A", "0"),
          balance("2026-09-04", "Assets:A:Sub", "100"),
          // After the balance that set the padding, the engine sums it.
          balance("2026-09-05", "Assets:A", "0"),
          padOf("Assets:Cash", "Equity:Open", "2026-09-05"),
          balance("2026-09-06", "Assets:Cash", "100"),
          balance("2026-09-07", "Equity:Open", "-100"),
          balance("2026-10-06", "Assets:Cash", "100"),
        ],
        [
          paddingOf("Assets:A:Sub", "Assets:A", "100"),
          paddingOf("Assets:Cash", "Equity:Open", "100", "2026-09-05"),
        ],
        {
          "main.bean":
            "2026-09-03 pad Assets:A:Sub Assets:A\n2026-09-05 pad Assets:Cash Equity:Open\n",
        },
        [],
        reparse,
      );
      expect(errors).toEqual([]);
      expect(reparse).not.toHaveBeenCalled();
    });
  });
});
