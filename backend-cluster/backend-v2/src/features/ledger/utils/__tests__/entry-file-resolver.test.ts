import type { BcioOptionsPublic } from "@/foundation/fava/Api";
import { resolveEntryFile, resolveReceiptFolder } from "../entry-file-resolver";

function opts(overrides: Partial<BcioOptionsPublic> = {}): BcioOptionsPublic {
  return {
    default_file: "main.bean",
    transaction_file: null,
    account_file: null,
    price_file: null,
    balance_file: null,
    note_file: null,
    pad_file: null,
    budget_file: null,
    receipt_base_folder: null,
    receipt_storage: null,
    document_file: null,
    ...overrides,
  };
}

const DATE = new Date(Date.UTC(2026, 2, 15));

describe("resolveEntryFile empty-option fallback", () => {
  it("falls back to default_file when the type-specific file is an empty string", () => {
    expect(
      resolveEntryFile(
        "Transaction",
        DATE,
        opts({
          default_file: "archive/default.bean",
          transaction_file: "",
        }),
      ),
    ).toBe("archive/default.bean");
  });

  it("falls back to main.bean when both the type-specific and default files are empty strings", () => {
    expect(
      resolveEntryFile(
        "Transaction",
        DATE,
        opts({ default_file: "", transaction_file: "" }),
      ),
    ).toBe("main.bean");
  });

  it("falls back to main.bean when the type-specific file is null and default_file is empty", () => {
    expect(resolveEntryFile("Price", DATE, opts({ default_file: "" }))).toBe(
      "main.bean",
    );
  });

  it("still prefers a set type-specific file over default_file", () => {
    expect(
      resolveEntryFile(
        "Transaction",
        DATE,
        opts({
          default_file: "archive/default.bean",
          transaction_file: "txns/{year}.bean",
        }),
      ),
    ).toBe("txns/2026.bean");
  });

  it("still uses default_file when the type-specific file is null", () => {
    expect(resolveEntryFile("Transaction", DATE, opts())).toBe("main.bean");
  });
});

// w31/152: Beancount reads a routing option's `./txns/{year}.bean` as
// `txns/{year}.bean`, as it reads that include. Used as written, the `./`
// failed the repository path check, which blamed the call's `paths[0]`.
describe("resolveEntryFile path normalization", () => {
  it.each([
    ["./main.bean", "main.bean"],
    ["./txns/{year}.bean", "txns/2026.bean"],
    ["././txns//{year}/./{month}.bean", "txns/2026/03.bean"],
    ["txns/old/../{year}.bean", "txns/2026.bean"],
  ])("routes %j to %j", (route, path) => {
    expect(
      resolveEntryFile("Transaction", DATE, opts({ transaction_file: route })),
    ).toBe(path);
  });

  it.each([
    ["Price", { price_file: "./prices.bean" }, "prices.bean"],
    ["Document", { document_file: "./docs/{year}.bean" }, "docs/2026.bean"],
    ["Custom", { default_file: "./books/main.bean" }, "books/main.bean"],
  ] as const)(
    "normalizes the %s route and the default_file fallback",
    (type, overrides, path) => {
      expect(resolveEntryFile(type, DATE, opts(overrides))).toBe(path);
    },
  );

  function refusal(overrides: Partial<BcioOptionsPublic>) {
    try {
      resolveEntryFile("Transaction", DATE, opts(overrides));
    } catch (error) {
      return error as {
        category: string;
        message: string;
        metadata?: { field?: string; hint?: string };
      };
    }
    throw new Error("expected a refusal");
  }

  it.each([
    ["../x.bean", '"../x.bean", which is outside the ledger'],
    ["./../x.bean", '("./../x.bean") routes this entry to "../x.bean"'],
    ["txns/../../{year}.bean", '"../2026.bean", which is outside the ledger'],
    ["/x.bean", '"/x.bean", which is outside the ledger'],
  ])("refuses %j as outside the ledger, naming the option", (route, quoted) => {
    const error = refusal({ transaction_file: route });
    expect(error.category).toBe("BAD_USER_INPUT");
    expect(error.message).toContain("The ledger's `transaction_file` option");
    expect(error.message).toContain(quoted);
    expect(error.metadata?.field).toBeUndefined();
    expect(error.metadata?.hint).toContain(
      'custom "beancountio-option" "transaction_file"',
    );
    expect(error.metadata?.hint).toContain("`path` on `appendLedgerText`");
  });

  it.each([
    ["txns/{year}/", 'ends with "/"'],
    ["txns\\{year}.bean", 'uses "\\"'],
    [".git/{year}.bean", "is inside .git"],
    ["{year}/..", 'has a "." or ".." part'],
  ])(
    "refuses %j for the path rule it breaks, naming the option",
    (route, rule) => {
      const error = refusal({ transaction_file: route });
      expect(error.category).toBe("BAD_USER_INPUT");
      expect(error.message).toContain("`transaction_file`");
      expect(error.message).toContain(`which ${rule}`);
      expect(error.metadata?.field).toBeUndefined();
    },
  );

  it("names default_file when the fallback is at fault", () => {
    const error = refusal({ default_file: "../main.bean" });
    expect(error.message).toContain("The ledger's `default_file` option");
    expect(error.metadata?.hint).toContain(
      'custom "beancountio-option" "default_file"',
    );
  });
});

// w31/153: `receipt_base_folder` is a folder from the ledger root, read like
// a routing option. Used as written, `./receipts` and `receipts/` stored the
// receipt as `./receipts/…` and `receipts//…`, which the ledger refuses.
describe("resolveReceiptFolder", () => {
  it.each([
    [null, "documents"],
    ["", "documents"],
    ["receipts", "receipts"],
    ["./receipts", "receipts"],
    ["receipts/", "receipts"],
    ["receipts//", "receipts"],
    [".//receipts//2026/./", "receipts/2026"],
    ["old/../receipts", "receipts"],
    [".", ""],
    ["./", ""],
  ])("reads %j as %j", (folder, path) => {
    expect(resolveReceiptFolder(opts({ receipt_base_folder: folder }))).toBe(
      path,
    );
  });

  function refusal(folder: string) {
    try {
      resolveReceiptFolder(opts({ receipt_base_folder: folder }));
    } catch (error) {
      return error as {
        category: string;
        message: string;
        metadata?: { field?: string; hint?: string };
      };
    }
    throw new Error("expected a refusal");
  }

  it.each([
    ["..", '"..", which is outside the ledger'],
    ["../x", '"../x", which is outside the ledger'],
    ["./receipts/../../x", '("./receipts/../../x") stores receipts in "../x"'],
    ["/receipts", '"/receipts", which is outside the ledger'],
    ["/", '"/", which is outside the ledger'],
    ["receipts\\2026", 'uses "\\"'],
    ["receipts/.git", "is inside .git"],
    ["receipts:2026", "which Windows cannot store"],
    ["receipts.", "has a part ending in a dot or a space"],
    ["con", 'uses the Windows device name "con"'],
  ])("refuses %j, naming the option and no argument", (folder, quoted) => {
    const error = refusal(folder);
    expect(error.category).toBe("BAD_USER_INPUT");
    expect(error.message).toContain(
      "The ledger's `receipt_base_folder` option",
    );
    expect(error.message).toContain(quoted);
    expect(error.metadata?.field).toBeUndefined();
    expect(error.metadata?.hint).toContain(
      'custom "beancountio-option" "receipt_base_folder"',
    );
  });
});
