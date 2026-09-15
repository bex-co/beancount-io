import fs from "fs";
import os from "os";
import path from "path";

type Report = { unused: { name: string; file: string }[]; stale: string[] };
const { operationsReport } =
  require("../../scripts/graphql-operations-check.js") as {
    operationsReport: (
      root: string,
      allowlist?: Record<string, string>,
    ) => Report;
  };

/** The report for a throwaway package holding exactly `files`. */
function report(
  files: Record<string, string>,
  allowlist?: Record<string, string>,
): Report {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "graphql-operations-"));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(root, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content);
    }
    return operationsReport(root, allowlist);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const unusedNames = (files: Record<string, string>) =>
  report(files).unused.map((operation) => operation.name);

const QUERY = {
  "src/common/graphql/queries/ledgerName.graphql":
    "query LedgerName { ledger { name } }",
};

describe("unused GraphQL operations", () => {
  it("reports an operation nothing uses, with its document", () => {
    expect(report(QUERY).unused).toEqual([
      {
        name: "LedgerName",
        file: "src/common/graphql/queries/ledgerName.graphql",
      },
    ]);
  });

  it("accepts an operation code uses through any generated hook or its Document", () => {
    for (const use of [
      "useLedgerNameQuery();",
      "useLedgerNameLazyQuery();",
      "useLedgerNameSuspenseQuery();",
      "export const docs = [LedgerNameDocument];",
    ]) {
      expect(unusedNames({ ...QUERY, "app/index.tsx": use })).toEqual([]);
    }
  });

  it("matches a camelCase operation by the PascalCase names codegen gives it", () => {
    expect(
      unusedNames({
        "src/common/graphql/queries/addEntries.graphql":
          "mutation addEntries { add }",
        "src/screens/add.tsx": "useAddEntriesMutation();",
      }),
    ).toEqual([]);
  });

  it("does not count generated code or tests as a consumer", () => {
    expect(
      unusedNames({
        ...QUERY,
        "src/generated-graphql/graphql.tsx":
          "export function useLedgerNameQuery() {}",
        "src/common/__tests__/ledger.test.ts": "LedgerNameDocument;",
      }),
    ).toEqual(["LedgerName"]);
  });

  it("does not match an operation by a longer operation's hook", () => {
    expect(
      unusedNames({ ...QUERY, "app/index.tsx": "useLedgerNameListQuery();" }),
    ).toEqual(["LedgerName"]);
  });

  it("ignores fragments, which other documents spread", () => {
    expect(
      unusedNames({
        "src/common/graphql/queries/fields.graphql":
          "fragment LedgerFields on Ledger { id }",
      }),
    ).toEqual([]);
  });

  it("honours an allowlisted operation and reports an entry that matches nothing", () => {
    const { unused, stale } = report(QUERY, {
      LedgerName: "staged for a planned screen",
      Gone: "was deleted",
    });
    expect(unused).toEqual([]);
    expect(stale).toEqual(["Gone"]);
  });
});
