import type {
  BeancountError,
  DirectiveJson,
  LedgerOptions,
} from "@rustledger/wasm";

/**
 * Wiring test for `parseLedgerFiles`' fava-plugin handling. The live WASM parse
 * needs `--experimental-vm-modules` (unavailable under the default jest run — see
 * `loader.ts`), so the real end-to-end path is covered by
 * `scripts/verify-rustledger.ts`. Here we stub the WASM loader to a fake ledger
 * whose `getDirectives()` returns canned "parsed" directives, and assert the
 * orchestration: the `fava.plugins.*` line is stripped before parse, the TS
 * plugin transform runs on the parsed stream, unsupported plugins produce a
 * `TS_PLUGIN_SKIPPED` warning, and `directiveCount` reflects the transformed
 * stream.
 */

let parsedDirectives: DirectiveJson[] = [];
let filesSeenByWasm: Record<string, string> = {};
let rawFilesSeenByWasm: Record<string, string> = {};
let rawErrors: BeancountError[] = [];
let transformedErrors: BeancountError[] = [];
let queryCalls = 0;

jest.mock("@/foundation/rustledger/loader", () => ({
  loadRustledger: async () => ({
    Ledger: {
      fromFiles: (files: Record<string, string>) => {
        filesSeenByWasm = files;
        const materialized = "__plugin_transformed__.bean" in files;
        const sourceProbe = Object.values(files).some((source) =>
          source.includes("bcio_source_probe"),
        );
        const probeKey = /\b(bcio_source_probe\w*):/u.exec(
          Object.values(files).join("\n"),
        )?.[1];
        if (!materialized) rawFilesSeenByWasm = files;
        return {
          isValid: () =>
            !(materialized ? transformedErrors : rawErrors).some(
              (error) => error.severity === "error",
            ),
          getErrors: () => (materialized ? transformedErrors : rawErrors),
          getOptions: () =>
            ({ title: null, operating_currencies: [] }) as LedgerOptions,
          getDirectives: () =>
            sourceProbe && probeKey
              ? parsedDirectives.map((directive, index) => ({
                  ...directive,
                  meta: {
                    ...(directive.meta ?? {}),
                    [probeKey]: String(index),
                  },
                }))
              : parsedDirectives,
          directiveCount: () => parsedDirectives.length,
          query: () => {
            queryCalls += 1;
            return {
              columns: ["source"],
              rows: [[Object.values(files).join("\n")]],
              errors: [],
            };
          },
          free: () => undefined,
        };
      },
    },
  }),
}));

// Imported AFTER the mock so engine.ts picks up the stubbed loader.
import {
  clearLedgerSnapshotCache,
  clearQueryLedgerCache,
  parseLedgerFiles,
  queryLedgerFilesResult,
} from "@/foundation/rustledger/engine";

const amortizeTxn: DirectiveJson = {
  type: "transaction",
  date: "2017-06-01",
  flag: "*",
  narration: "Amortize car insurance",
  tags: [],
  links: [],
  meta: { amortize_months: "3" },
  postings: [
    {
      account: "Assets:Prepaid-Expenses",
      units: { number: "-600.00", currency: "USD" },
    },
    { account: "Expenses:Insurance:Auto" },
  ],
} as DirectiveJson;

const forecastTxn: Extract<DirectiveJson, { type: "transaction" }> = {
  type: "transaction",
  date: "2014-03-08",
  flag: "#",
  narration: "Electricity bill [MONTHLY REPEAT 3 TIMES]",
  tags: [],
  links: [],
  postings: [
    {
      account: "Expenses:Electricity",
      units: { number: "50.10", currency: "USD" },
    },
    {
      account: "Assets:Checking",
      units: { number: "-50.10", currency: "USD" },
    },
  ],
};

const openCash: DirectiveJson = {
  type: "open",
  date: "2017-01-01",
  account: "Assets:Cash",
  currencies: [],
} as DirectiveJson;

beforeEach(() => {
  parsedDirectives = [];
  filesSeenByWasm = {};
  rawFilesSeenByWasm = {};
  rawErrors = [];
  transformedErrors = [];
  queryCalls = 0;
  // Tests reuse identical file content with DIFFERENT stubbed parse results —
  // the content-addressed snapshot cache would otherwise serve test A's
  // snapshot to test B.
  clearLedgerSnapshotCache();
  clearQueryLedgerCache();
});

describe("parseLedgerFiles — plugin orchestration (stubbed WASM)", () => {
  it("strips the fava plugin before parse and applies the amortize transform", async () => {
    parsedDirectives = [amortizeTxn];
    const source = [
      'plugin "fava.plugins.amortize_over"',
      '2017-06-01 * "x"',
    ].join("\n");

    const snapshot = await parseLedgerFiles(
      { "main.bean": source },
      "main.bean",
      {
        today: "2099-01-01",
      },
    );

    // The plugin line was stripped from what the WASM parsed.
    expect(rawFilesSeenByWasm["main.bean"]).not.toMatch(
      /fava\.plugins\.amortize_over/,
    );
    // The parsed txn was split into 3 monthly copies.
    const amortized = snapshot.directives.filter(
      (d) => d.type === "transaction" && (d.narration ?? "").includes("("),
    );
    expect(amortized).toHaveLength(3);
    expect(snapshot.directiveCount).toBe(3); // recomputed from the transformed stream
    expect(snapshot.valid).toBe(true);
    expect(
      snapshot.errors.find((e) => e.code === "TS_PLUGIN_SKIPPED"),
    ).toBeUndefined();
  });

  it("emits a TS_PLUGIN_SKIPPED warning for a stripped-but-unhandled fava plugin", async () => {
    parsedDirectives = [openCash];
    const source = [
      'plugin "fava.plugins.some_unsupported"',
      "2017-01-01 open Assets:Cash",
    ].join("\n");

    const snapshot = await parseLedgerFiles(
      { "main.bean": source },
      "main.bean",
    );

    expect(rawFilesSeenByWasm["main.bean"]).not.toMatch(/fava\.plugins/);
    const warning = snapshot.errors.find((e) => e.code === "TS_PLUGIN_SKIPPED");
    expect(warning?.severity).toBe("warning");
    expect(warning?.line).toBe(1);
  });

  it("takes the fast path (no strip) when only native plugins are declared", async () => {
    parsedDirectives = [openCash];
    const source = [
      'plugin "beancount.plugins.auto_accounts"',
      "2017-01-01 open Assets:Cash",
    ].join("\n");

    const snapshot = await parseLedgerFiles(
      { "main.bean": source },
      "main.bean",
    );

    // Native plugin left intact for the WASM to run.
    expect(filesSeenByWasm["main.bean"]).toBe(source);
    expect(snapshot.directives).toEqual([openCash]);
  });

  it("skips the TS plugin layer entirely when applyTsPlugins is false", async () => {
    parsedDirectives = [amortizeTxn];
    const source = [
      'plugin "fava.plugins.amortize_over"',
      '2017-06-01 * "x"',
    ].join("\n");

    const snapshot = await parseLedgerFiles(
      { "main.bean": source },
      "main.bean",
      {
        applyTsPlugins: false,
      },
    );

    // Raw parse: the fava plugin line is NOT stripped and the txn is NOT split.
    expect(filesSeenByWasm["main.bean"]).toBe(source);
    expect(snapshot.directives).toEqual([amortizeTxn]);
  });

  it("replaces pre-plugin validation errors with transformed-stream validation", async () => {
    parsedDirectives = [amortizeTxn];
    rawErrors = [
      {
        message: "pre-transform balance failed",
        code: "E2001",
        phase: "validate",
        hint: null,
        file: "main.bean",
        line: 3,
        column: 1,
        end_line: null,
        end_column: null,
        severity: "error",
      },
    ];
    transformedErrors = [];

    const snapshot = await parseLedgerFiles(
      {
        "main.bean": [
          'plugin "fava.plugins.amortize_over"',
          '2017-06-01 * "x"',
        ].join("\n"),
      },
      "main.bean",
      { today: "2099-01-01" },
    );

    expect(snapshot.valid).toBe(true);
    expect(snapshot.errors).toEqual([]);
  });

  it("remaps plugin-validation errors to the original file and line", async () => {
    parsedDirectives = [amortizeTxn];
    transformedErrors = [
      {
        message: "post-transform balance failed",
        code: "E2001",
        phase: "validate",
        hint: null,
        file: "__plugin_transformed__.bean",
        line: 4,
        column: 1,
        end_line: null,
        end_column: null,
        severity: "error",
      },
    ];

    const snapshot = await parseLedgerFiles(
      {
        "main.bean": [
          'plugin "fava.plugins.amortize_over"',
          '2017-06-01 * "x"',
        ].join("\n"),
      },
      "main.bean",
      { today: "2099-01-01" },
    );

    expect(snapshot.errors).toEqual([
      expect.objectContaining({
        message: "post-transform balance failed",
        file: "main.bean",
        line: 2,
      }),
    ]);
  });

  it("runs BQL over the TS-plugin-transformed stream", async () => {
    parsedDirectives = [amortizeTxn];
    const files = {
      "main.bean": [
        'plugin "fava.plugins.amortize_over"',
        '2017-06-01 * "x"',
      ].join("\n"),
    };

    const result = await queryLedgerFilesResult(
      files,
      "main.bean",
      "SELECT narration",
    );

    const materializedSource = String(result.rows[0][0]);
    expect(materializedSource).toContain("Amortize car insurance (1/3)");
    expect(materializedSource).toContain("Amortize car insurance (3/3)");
    expect(materializedSource).not.toContain("fava.plugins.amortize_over");
  });

  it("does not execute BQL over a materialized stream with parse errors", async () => {
    parsedDirectives = [amortizeTxn];
    transformedErrors = [
      {
        message: "renderer emitted invalid syntax",
        code: "E1000",
        phase: "parse",
        hint: null,
        file: "__plugin_transformed__.bean",
        line: 2,
        column: 1,
        end_line: null,
        end_column: null,
        severity: "error",
      },
    ];
    const result = await queryLedgerFilesResult(
      {
        "main.bean": [
          'plugin "fava.plugins.amortize_over"',
          '2017-06-01 * "x"',
        ].join("\n"),
      },
      "main.bean",
      "SELECT narration",
    );

    expect(queryCalls).toBe(0);
    expect(result.columns).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "renderer emitted invalid syntax",
        file: "main.bean",
        line: 2,
      }),
    ]);
  });

  it("applies forecast and materializes its generated transactions for BQL", async () => {
    parsedDirectives = [forecastTxn];
    const files = {
      "main.bean": [
        'plugin "fava.plugins.forecast"',
        '2014-03-08 # "Electricity bill [MONTHLY REPEAT 3 TIMES]"',
      ].join("\n"),
    };

    const snapshot = await parseLedgerFiles(files, "main.bean");
    const generated = snapshot.directives.filter(
      (directive) => directive.type === "transaction",
    );
    expect(snapshot.valid).toBe(true);
    expect(generated.map((directive) => directive.date)).toEqual([
      "2014-03-08",
      "2014-04-08",
      "2014-05-08",
    ]);
    expect(
      snapshot.errors.find((error) => error.code === "TS_PLUGIN_SKIPPED"),
    ).toBeUndefined();

    const result = await queryLedgerFilesResult(
      files,
      "main.bean",
      "SELECT narration",
    );
    const materializedSource = String(result.rows[0][0]);
    expect(materializedSource.match(/Electricity bill/g)).toHaveLength(3);
    expect(materializedSource).not.toContain("REPEAT 3 TIMES");
    expect(materializedSource).not.toContain("fava.plugins.forecast");
  });

  it("fails the ledger closed when forecast input is invalid", async () => {
    parsedDirectives = [
      {
        ...forecastTxn,
        narration: "Electricity bill [MONTHLY UNTIL 2014-99-99]",
      },
    ];

    const snapshot = await parseLedgerFiles(
      {
        "main.bean": [
          'plugin "fava.plugins.forecast"',
          '2014-03-08 # "Electricity bill [MONTHLY UNTIL 2014-99-99]"',
        ].join("\n"),
      },
      "main.bean",
    );

    expect(snapshot.valid).toBe(false);
    expect(snapshot.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "TS_FORECAST_TEMPLATE_FAILED",
          severity: "error",
          message: expect.stringContaining("Invalid forecast UNTIL date"),
        }),
      ]),
    );
  });
});
