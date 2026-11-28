/**
 * `check_drained` and `commodity_attr` errors on the live engine, against
 * bean-check 3.2.3 (w31/156). The engine reported both plugins' findings with
 * no file or line and in its own words, and ignored a `commodity_attr` config
 * that is not a dict. Each now sits on the `close` or `commodity` line in
 * stock's words, and a write elsewhere in a ledger that already has one, or
 * one that only changes the closed account's figure, is not refused for it.
 *
 * Run by `verify-rustledger.ts` (live engine; not a jest test).
 */
import { parseLedgerFiles } from "@/foundation/rustledger";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { projectNewLedgerErrors } from "@/features/ledger/utils/new-ledger-errors";
import { committingRepo } from "./entry-move";

function fail(message: string): never {
  throw new Error(`check_drained and commodity_attr errors: ${message}`);
}

const BODY = [
  "2026-01-01 open Assets:Cash USD",
  "2026-01-01 open Equity:Opening USD",
  '2026-01-02 * "Open"',
  "  Assets:Cash  49.75 USD",
  "  Equity:Opening",
];

/** Each error bean-check would print for `lines`: `line message`. */
async function placed(lines: readonly string[]): Promise<string[]> {
  const snapshot = await parseLedgerFiles(
    { "main.bean": lines.join("\n") },
    "main.bean",
    { today: "2099-01-01" },
  );
  return snapshot.errors
    .filter((error) => error.severity === "error")
    .map((error) => `${error.line} ${error.message}`);
}

async function verifyStockPlacement(): Promise<void> {
  const funded = `8 Balance failed for 'Assets:Cash': expected 0 USD != accumulated 49.75 USD (49.75 too much)`;
  const attr = (config: string) =>
    `plugin "beancount.plugins.commodity_attr" "${config}"`;
  const rows: [string, string[], string[]][] = [
    [
      "check_drained on a funded close",
      [
        'plugin "beancount.plugins.check_drained"',
        "2026-01-01 commodity USD",
        ...BODY,
        "2026-08-30 close Assets:Cash",
      ],
      [funded],
    ],
    [
      "pedantic on a funded close",
      [
        'plugin "beancount.plugins.pedantic"',
        "2026-01-01 commodity USD",
        ...BODY,
        "2026-08-30 close Assets:Cash",
      ],
      [funded],
    ],
    [
      "check_drained on a close that holds less than nothing",
      [
        'plugin "beancount.plugins.check_drained"',
        ...BODY.map((line) => line.replace("49.75", "-10.50")),
        "",
        "2026-08-30 close Assets:Cash",
      ],
      [
        "8 Balance failed for 'Assets:Cash': expected 0 USD != accumulated -10.50 USD (10.50 too little)",
      ],
    ],
    [
      "check_drained on a drained close",
      [
        'plugin "beancount.plugins.check_drained"',
        ...BODY,
        '2026-08-29 * "Out"',
        "  Assets:Cash  -49.75 USD",
        "  Equity:Opening",
        "2026-08-30 close Assets:Cash",
      ],
      [],
    ],
    // w31/158: a balance on the close date makes stock skip its zero
    // balance in that currency; the engine still checked it.
    [
      "check_drained on a close whose own date's balance holds the money",
      [
        'plugin "beancount.plugins.check_drained"',
        ...BODY,
        "2026-08-30 balance Assets:Cash 49.75 USD",
        "2026-08-30 close Assets:Cash",
      ],
      [],
    ],
    [
      "pedantic on a close whose own date's balance, written after it, holds the money",
      [
        'plugin "beancount.plugins.pedantic"',
        "2026-01-01 commodity USD",
        ...BODY,
        "2026-08-30 close Assets:Cash",
        "2026-08-30 balance Assets:Cash 49.75 USD",
      ],
      [],
    ],
    [
      "check_drained on a close whose own date's balance checks one of two currencies",
      [
        'plugin "beancount.plugins.check_drained"',
        "2026-01-01 open Assets:Cash",
        "2026-01-01 open Equity:Opening",
        '2026-01-02 * "Open"',
        "  Assets:Cash  49.75 USD",
        "  Assets:Cash  12.00 CAD",
        "  Equity:Opening",
        "2026-08-30 balance Assets:Cash 49.75 USD",
        "2026-08-30 close Assets:Cash",
      ],
      [
        "9 Balance failed for 'Assets:Cash': expected 0 CAD != accumulated 12.00 CAD (12.00 too much)",
      ],
    ],
    [
      "check_drained on a close with a balance the day before",
      [
        'plugin "beancount.plugins.check_drained"',
        ...BODY,
        "2026-08-29 balance Assets:Cash 49.75 USD",
        "2026-08-30 close Assets:Cash",
      ],
      [
        "8 Balance failed for 'Assets:Cash': expected 0 USD != accumulated 49.75 USD (49.75 too much)",
      ],
    ],
    [
      "a missing attribute",
      [attr("{'name': None}"), "2026-08-30 commodity QAX"],
      ["2 Missing attribute 'name' for Commodity directive QAX"],
    ],
    [
      "a value the list does not hold",
      [attr("{'sector': ['Tech']}"), "2026-08-30 commodity QAX", '  sector: "Energy"'],
      [
        "2 Invalid value 'Energy' for attribute sector, Commodity directive QAX; valid options: Tech",
      ],
    ],
    [
      "a number, a boolean and an empty value",
      [
        attr("{'sector': ['Tech']}"),
        "2026-08-30 commodity QAA",
        "  sector: 5.10",
        "2026-08-30 commodity QAB",
        "  sector: TRUE",
        "2026-08-30 commodity QAC",
        "  sector:",
      ],
      [
        "2 Invalid value '5.10' for attribute sector, Commodity directive QAA; valid options: Tech",
        "4 Invalid value 'True' for attribute sector, Commodity directive QAB; valid options: Tech",
        "6 Missing attribute 'sector' for Commodity directive QAC",
      ],
    ],
    [
      "a config that is not a dict",
      [attr("[1, 2]"), "2026-08-30 commodity QAX"],
      ["null Invalid configuration for commodity_attr plugin; skipping."],
    ],
    [
      "an attribute present and allowed, and an empty list",
      [
        attr("{'name': None, 'sector': ['Tech', 'Energy'], 'tier': []}"),
        "2026-08-30 commodity QAX",
        '  name: "Example"',
        '  sector: "Energy"',
        '  tier: "any"',
      ],
      [],
    ],
  ];
  for (const [what, lines, expected] of rows) {
    const got = await placed(lines);
    if (JSON.stringify(got) !== JSON.stringify(expected)) {
      fail(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
    }
  }
  console.log(
    "✓ check_drained and commodity_attr errors sit on the close or commodity line in bean-check's words, and a config that is not a dict is reported (w31/156); a balance on the close date skips the zero balance in its currency (w31/158)",
  );
}

const MAIN = [
  'plugin "beancount.plugins.check_drained"',
  "plugin \"beancount.plugins.commodity_attr\" \"{'name': None}\"",
  'include "2027.bean"',
  ...BODY,
  "2026-01-01 open Expenses:Food USD",
  "2026-08-30 close Assets:Cash",
  "2026-08-30 commodity QAX",
  "",
].join("\n");

async function verifyKnownErrors(): Promise<void> {
  const { factory } = committingRepo({ "main.bean": MAIN, "2027.bean": "" });
  const service = new LedgerDataService(factory as never, {} as never);
  const params = { ledgerId: "synthetic/drained", userId: undefined };
  const baseline = await service.getErrors(params);
  const messages = (errors: readonly { message: string }[]) =>
    errors.map((error) => error.message);
  // The engine's close warning is not an error (w21/188).
  const errors = baseline.filter((error) => error.severity === "error");
  if (
    errors.length !== 2 ||
    errors.some((error) => error.source?.filename !== "main.bean")
  ) {
    fail(`the fixture's errors: ${JSON.stringify(baseline)}`);
  }
  const project = async (files: Record<string, string>) => {
    const after = await service.checkProjectedErrors({
      ...params,
      overlays: Object.entries(files).map(([path, content]) => ({
        path,
        content: Buffer.from(content).toString("base64"),
      })),
    });
    return projectNewLedgerErrors(after, async () => baseline);
  };
  const food = (account: string, amount: string) =>
    ['2026-03-01 * "Lunch"', `  ${account}  ${amount} USD`, "  Equity:Opening", ""].join("\n");
  for (const [what, files] of [
    [
      "a write above both lines",
      { "main.bean": MAIN.replace(BODY[0]!, `${food("Expenses:Food", "5")}${BODY[0]}`) },
    ],
    ["a write in another file", { "2027.bean": food("Expenses:Food", "5") }],
    [
      "a write that drains part of the closed account",
      { "main.bean": `${MAIN}${food("Assets:Cash", "-20.00")}` },
    ],
  ] as const) {
    const result = await project(files);
    if (result.newErrors.length > 0 || result.errorsAfter !== 2) {
      fail(`${what} reads as new: ${JSON.stringify(messages(result.newErrors))}`);
    }
  }
  const second = await project({
    "main.bean": `${MAIN}2026-08-30 commodity QAY\n`,
  });
  if (
    JSON.stringify(messages(second.newErrors)) !==
    JSON.stringify(["Missing attribute 'name' for Commodity directive QAY"])
  ) {
    fail(`a second commodity: ${JSON.stringify(messages(second.newErrors))}`);
  }
  console.log(
    "✓ a check_drained or commodity_attr error the ledger already has is not new after a write elsewhere, or one that changes the closed account's figure (w31/156)",
  );
}

export async function verifyDrainedAndCommodityAttrErrors(): Promise<void> {
  await verifyStockPlacement();
  await verifyKnownErrors();
}
