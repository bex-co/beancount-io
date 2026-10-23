import fs from "fs";
import path from "path";
import {
  ACCOUNT_CLOSE_DATE_QUERIES,
  LEDGER_ERROR_QUERIES,
  refetchNamedQueries,
} from "../refresh-named-queries";

// w21/839: a pull on Accounts, Transactions, Reports or Files left the bell's
// ledger errors, and Accounts' close dates, as they were.
describe("refetchNamedQueries", () => {
  it("refetches the queries by operation name", async () => {
    const seen: string[][] = [];
    await refetchNamedQueries(
      {
        refetchQueries: async ({ include }) => {
          seen.push(include);
        },
      },
      [...LEDGER_ERROR_QUERIES, ...ACCOUNT_CLOSE_DATE_QUERIES],
    );
    expect(seen).toEqual([
      ["getLedgerErrors", "getLedgerErrorsBasic", "LedgerAccountCloseDates"],
    ]);
  });

  it("never rejects, so a pull offline keeps what is shown", async () => {
    await refetchNamedQueries(
      {
        refetchQueries: async () => {
          throw new Error("offline");
        },
      },
      LEDGER_ERROR_QUERIES,
    );
  });
});

describe("the tabs' pull handlers", () => {
  const read = (...parts: string[]) =>
    fs
      .readFileSync(path.join(__dirname, "..", "..", "..", ...parts), "utf8")
      .replace(/\s+/g, "");

  it("reach the ledger errors behind the bell", () => {
    for (const file of [
      ["screens", "accounts-screen", "accounts-screen.tsx"],
      ["screens", "transactions-screen", "transactions-screen.tsx"],
      ["screens", "reports-screen", "reports-screen.tsx"],
      ["screens", "ledger-file-browser-screen", "index.tsx"],
    ]) {
      expect(read(...file).includes("LEDGER_ERROR_QUERIES")).toBe(true);
    }
  });

  it("has Accounts reach its close dates too", () => {
    expect(
      read("screens", "accounts-screen", "accounts-screen.tsx").includes(
        "...ACCOUNT_CLOSE_DATE_QUERIES",
      ),
    ).toBe(true);
  });

  it("names operations that exist", () => {
    const generated = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "generated-graphql",
        "graphql.tsx",
      ),
      "utf8",
    );
    for (const name of [
      ...LEDGER_ERROR_QUERIES,
      ...ACCOUNT_CLOSE_DATE_QUERIES,
    ]) {
      expect(generated.includes(`query ${name}(`)).toBe(true);
    }
  });
});
