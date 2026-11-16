/**
 * A write that deletes, moves or adds a document file, on the live engine
 * through the real projection (w31/027). The repository holds the only file
 * under the `option "documents"` root and the file a `document` names. The
 * projection checked both against the committed tree, so deleting or renaming
 * either previewed clean, and the commit then reported `Document root … does
 * not exist` and `Document file not found`. Each now previews its error, and
 * a write that adds the files with the option and the `document` previews
 * clean.
 *
 * Run by `verify-rustledger.ts` (live engine; not a jest test).
 */
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { committingRepo } from "./entry-move";

const OPENS = "2026-01-01 open Assets:Cash USD\n";
const MAIN = `${OPENS}option "documents" "qa-docs"\n2026-10-05 document Assets:Cash "qa-ref.txt"\n`;
const STATEMENT = "qa-docs/Assets/Cash/2026-09-01.qa.txt";
const ROOT_GONE = "main.bean:2 Document root 'qa-docs' does not exist";
const REF_GONE = "main.bean:3 Document file not found: qa-ref.txt";

type Overlay = { path: string; content: string | null };
const write = (path: string, text: string): Overlay => ({
  path,
  content: Buffer.from(text).toString("base64"),
});
const remove = (path: string): Overlay => ({ path, content: null });

function fail(message: string): never {
  throw new Error(`projected documents: ${message}`);
}

async function preview(
  files: Record<string, string>,
  overlays: Overlay[],
): Promise<string[]> {
  const { factory } = committingRepo({ ...files });
  const service = new LedgerDataService(factory as never, {} as never);
  const errors = await service.checkProjectedErrors({
    ledgerId: "synthetic/documents",
    userId: undefined,
    overlays,
  });
  return errors.map(
    (error) =>
      `${error.source?.filename}:${error.source?.lineno} ${error.message}`,
  );
}

export async function verifyProjectedDocuments(): Promise<void> {
  const repo = {
    "main.bean": MAIN,
    [STATEMENT]: "statement\n",
    "qa-ref.txt": "reference\n",
  };
  for (const [label, overlays, expected] of [
    ["an unchanged ledger", [write("main.bean", MAIN)], []],
    ["deleting the root's last file", [remove(STATEMENT)], [ROOT_GONE]],
    ["deleting the document's file", [remove("qa-ref.txt")], [REF_GONE]],
    [
      "renaming the root's last file",
      [write("moved/2026-09-01.qa.txt", "statement\n"), remove(STATEMENT)],
      [ROOT_GONE],
    ],
    [
      "renaming the document's file",
      [write("elsewhere/qa-ref.txt", "reference\n"), remove("qa-ref.txt")],
      [REF_GONE],
    ],
  ] as const) {
    const errors = await preview(repo, [...overlays]);
    if (JSON.stringify(errors) !== JSON.stringify(expected)) {
      fail(`${label} previews ${JSON.stringify(errors)}`);
    }
  }
  console.log(
    "✓ a write that deletes or renames a document file previews the root and file it loses (w31/027)",
  );

  const bare = { "main.bean": OPENS };
  const added = await preview(bare, [
    write("main.bean", MAIN),
    write(STATEMENT, "statement\n"),
    write("qa-ref.txt", "reference\n"),
  ]);
  if (added.length > 0) {
    fail(`adding the files with the option previews ${JSON.stringify(added)}`);
  }
  const missing = await preview(bare, [write("main.bean", MAIN)]);
  if (JSON.stringify(missing) !== JSON.stringify([ROOT_GONE, REF_GONE])) {
    fail(`the option without its files previews ${JSON.stringify(missing)}`);
  }
  console.log(
    "✓ a write that adds the document files with the option and the document previews clean (w31/027)",
  );
}
