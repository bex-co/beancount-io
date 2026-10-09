import fs from "fs";
import path from "path";

import { selectTransactionMenuActions } from "../screens/transaction-detail-screen/selectors/select-transaction-detail";
import { shouldShowTransactionWriteActions } from "../screens/transaction-detail-screen/selectors/select-transaction-write-actions";

const screenSource = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "screens",
    "transaction-detail-screen",
    "transaction-detail-screen.tsx",
  ),
  "utf8",
);

const entryContextSource = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "screens",
    "transactions-screen",
    "entry-context",
    "index.tsx",
  ),
  "utf8",
);

function entryContextMountCondition(): string {
  const mount = screenSource.indexOf("<EntryContext");
  expect(mount > 0).toBe(true);
  const before = screenSource.slice(0, mount);
  const conditional = before.lastIndexOf("{");
  const guard = before
    .slice(conditional + 1)
    .split("?")[0]
    .trim();
  const declaration = screenSource.match(
    new RegExp(`const ${guard} = ([^;]+);`),
  );
  expect(declaration !== null).toBe(true);
  return declaration![1];
}

describe("transaction detail entry context for readers", () => {
  it("mounts the read-only context panel without requiring write access", () => {
    const condition = entryContextMountCondition();
    expect(condition.includes("canWrite")).toBe(false);
    expect(condition.includes("isGenerated")).toBe(true);
  });

  it("keeps the context panel free of write controls", () => {
    expect(/useLedgerAccess|canWrite|Mutation/.test(entryContextSource)).toBe(
      false,
    );
  });

  it("still withholds edit/delete from a reader who can see the context", () => {
    const sha256sum = "abc123";
    const readerWrite = shouldShowTransactionWriteActions(false, sha256sum);
    expect(readerWrite).toBe(false);
    expect(
      selectTransactionMenuActions({
        isGenerated: false,
        showWriteActions: readerWrite,
      }),
    ).toEqual(["shareLink", "copyLink"]);
  });

  it("preserves writer actions on the same source-backed entry", () => {
    const writerWrite = shouldShowTransactionWriteActions(true, "abc123");
    expect(
      selectTransactionMenuActions({
        isGenerated: false,
        showWriteActions: writerWrite,
      }),
    ).toEqual(["shareLink", "copyLink", "deleteTransaction"]);
  });
});
