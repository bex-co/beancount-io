import type { BcioOptionsPublic } from "@/foundation/fava/Api";
import { resolveEntryFile } from "../entry-file-resolver";

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
