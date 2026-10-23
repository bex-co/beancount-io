import fs from "fs";
import path from "path";
import { isPluginCopy } from "../select-plugin-copy";
import { shouldShowTransactionWriteActions } from "../select-transaction-write-actions";

// w21/443: an amortize_over or forecast copy answers with its template's slice
// and checksum, so Delete on it removed the whole series.
const TEMPLATE = [
  '2026-06-01 * "QA Insurer" "car insurance"',
  '  amortize_months: "12"',
  "  Expenses:Insurance  600.00 USD",
  "  Assets:Bank",
].join("\n");

describe("isPluginCopy", () => {
  it("is true for each amortized copy, the first included", () => {
    // (1/12) shares the template's day; its name is what differs.
    expect(
      isPluginCopy(
        {
          date: "2026-06-01",
          payee: "QA Insurer",
          narration: "car insurance (1/12)",
        },
        TEMPLATE,
      ),
    ).toBe(true);
    expect(
      isPluginCopy(
        {
          date: "2026-09-01",
          payee: "QA Insurer",
          narration: "car insurance (4/12)",
        },
        TEMPLATE,
      ),
    ).toBe(true);
  });

  it("is true for a forecast occurrence, whose marker the template carries", () => {
    const slice = '2026-06-01 # "Power [MONTHLY REPEAT 3 TIMES]"\n  A  1 USD';
    expect(
      isPluginCopy({ date: "2026-06-01", narration: "Power" }, slice),
    ).toBe(true);
    expect(
      isPluginCopy({ date: "2026-07-01", narration: "Power" }, slice),
    ).toBe(true);
  });

  it("is false for an entry that is its own text", () => {
    expect(
      isPluginCopy(
        {
          date: "2026-06-01T00:00:00",
          payee: "QA Insurer",
          narration: "car insurance",
        },
        TEMPLATE,
      ),
    ).toBe(false);
    // Narration only, payee absent or null, a flag other than `*`, `txn`.
    for (const header of [
      '2026-08-06 * "Lunch"',
      '2026-08-06 ! "Lunch"',
      '2026-08-06 txn "Lunch"',
      '; note\n2026-08-06 * "Lunch" #trip ^receipt',
    ]) {
      expect(
        isPluginCopy(
          { date: "2026-08-06", payee: null, narration: "Lunch" },
          header,
        ),
      ).toBe(false);
    }
    // No narration at all.
    expect(
      isPluginCopy({ date: "2026-08-06", narration: "" }, "2026-08-06 *"),
    ).toBe(false);
  });

  it("does not judge what it cannot read", () => {
    const entry = { date: "2026-08-06", narration: "Lunch" };
    expect(isPluginCopy(entry, undefined)).toBe(false);
    expect(isPluginCopy(entry, "")).toBe(false);
    expect(isPluginCopy(entry, "not a directive")).toBe(false);
    // A quote or backslash escape is read back, so an ordinary entry is not a copy.
    expect(
      isPluginCopy(
        { date: "2026-08-06", narration: 'He said "hi"' },
        '2026-08-06 * "He said \\"hi\\""',
      ),
    ).toBe(false);
  });

  // w21/504: a written string with an escaped quote was never compared, so the
  // first copy of such a series kept Edit and Delete.
  it("tells the first copy of an escaped narration from its template", () => {
    const template = [
      '2026-10-01 * "QA Insurer" "qa car \\"premium\\" insurance"',
      '  amortize_months: "12"',
      "  Expenses:Insurance  600.00 USD",
      "  Assets:Bank",
    ].join("\n");
    expect(
      isPluginCopy(
        {
          date: "2026-10-01",
          payee: "QA Insurer",
          narration: 'qa car "premium" insurance (1/12)',
        },
        template,
      ),
    ).toBe(true);
    // The template itself is not a copy.
    expect(
      isPluginCopy(
        {
          date: "2026-10-01",
          payee: "QA Insurer",
          narration: 'qa car "premium" insurance',
        },
        template,
      ),
    ).toBe(false);
  });

  it("tells a forecast's first month with an escaped quote", () => {
    const slice = ['2026-10-01 # "Landlord" "Rent \\"flat\\" [MONTHLY]"'].join(
      "\n",
    );
    expect(
      isPluginCopy(
        {
          date: "2026-10-01",
          payee: "Landlord",
          narration: 'Rent "flat"',
        },
        slice,
      ),
    ).toBe(true);
  });

  it("still does not judge other escapes, and reads a doubled backslash", () => {
    const entry = { date: "2026-08-06", narration: "a\\nb" };
    expect(isPluginCopy(entry, '2026-08-06 * "a\\nb"')).toBe(false);
    expect(
      isPluginCopy(
        { date: "2026-08-06", narration: "C:\\dir" },
        '2026-08-06 * "C:\\\\dir"',
      ),
    ).toBe(false);
  });

  // w21/505: a multi-line narration and the old `"Payee" | "Narration"` header
  // were read as one string, so an ordinary entry lost Edit and Delete.
  it("keeps Edit on a multi-line narration and on the bar form", () => {
    expect(
      isPluginCopy(
        {
          date: "2026-08-30",
          payee: "QA Multi",
          narration: "qa line one\nline two",
        },
        '2026-08-30 * "QA Multi" "qa line one\nline two"\n  Expenses:Food  5 USD\n  Assets:Cash',
      ),
    ).toBe(false);
    expect(
      isPluginCopy(
        { date: "2026-06-01", payee: "Cafe", narration: "Coffee" },
        '2026-06-01 * "Cafe" | "Coffee"\n  Expenses:Food  3 USD\n  Assets:Cash',
      ),
    ).toBe(false);
  });

  it("still catches a copy of a multi-line narration, and does not judge an unclosed string", () => {
    expect(
      isPluginCopy(
        {
          date: "2026-08-30",
          payee: "QA Multi",
          narration: "qa line one\nline two (1/12)",
        },
        '2026-08-30 * "QA Multi" "qa line one\nline two"\n  Assets:Cash',
      ),
    ).toBe(true);
    expect(
      isPluginCopy(
        { date: "2026-08-30", payee: "x", narration: "y" },
        '2026-08-30 * "x" "never closes\n  Assets:Cash',
      ),
    ).toBe(false);
  });

  it("is true when the slice is another kind of directive (a pad)", () => {
    expect(
      isPluginCopy(
        { date: "2026-08-06", narration: "(Padding inserted)" },
        "2026-08-06 pad Assets:Cash Equity:Opening-Balances",
      ),
    ).toBe(true);
  });
});

describe("the write actions", () => {
  it("are withheld from a copy, whatever the write access", () => {
    expect(shouldShowTransactionWriteActions(true, "sha", false)).toBe(true);
    expect(shouldShowTransactionWriteActions(true, "sha", true)).toBe(false);
    expect(shouldShowTransactionWriteActions(true, "sha")).toBe(true);
    expect(shouldShowTransactionWriteActions(false, "sha", false)).toBe(false);
  });

  it("are decided by the screen with the entry and its slice", () => {
    const source = fs
      .readFileSync(
        path.join(__dirname, "..", "..", "transaction-detail-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      source.includes(
        "constpluginCopy=isPluginCopy(entry,contextSource?.slice,generatedFrom);",
      ),
    ).toBe(true);
    expect(
      source.includes(
        "shouldShowTransactionWriteActions(canWrite,sha256sum,pluginCopy,)",
      ),
    ).toBe(true);
  });
});

// w21/508: the ledger names a copy's source (`generated_from`), which decides it
// over the first-line guess; the guess stays for a server older than the field.
describe("isPluginCopy with the ledger's generated_from", () => {
  const copy = {
    date: "2026-07-01",
    payee: "QA Insurer",
    narration: "car insurance (2/12)",
  };
  const ordinary = {
    date: "2026-06-01",
    payee: "QA Insurer",
    narration: "car insurance",
  };

  it("follows the ledger when it names the source, or says there is none", () => {
    expect(isPluginCopy(ordinary, TEMPLATE, "abc123")).toBe(true);
    expect(isPluginCopy(copy, TEMPLATE, null)).toBe(false);
    // A copy whose first line happens to match is still a copy.
    expect(isPluginCopy(ordinary, null, "abc123")).toBe(true);
  });

  it("guesses from the first line only when the ledger does not say", () => {
    expect(isPluginCopy(copy, TEMPLATE, undefined)).toBe(true);
    expect(isPluginCopy(ordinary, TEMPLATE, undefined)).toBe(false);
  });

  it("explains a copy and opens its source when the ledger names it", () => {
    const source = fs
      .readFileSync(
        path.join(__dirname, "..", "..", "transaction-detail-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(source.includes('t("pluginCopyNotice")')).toBe(true);
    expect(
      source.includes("params:{entry_hash:generatedFrom,ledger:ledgerId}"),
    ).toBe(true);
  });
});
