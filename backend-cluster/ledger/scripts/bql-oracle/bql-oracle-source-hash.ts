/**
 * The hash of the oracle's inputs, computed the same way as
 * `source_hash()` in `generate-bql-oracle.py`: the bytes of `queries.json`,
 * then each fixture file as `<posix relative path> NUL <bytes> NUL`, in order
 * of that relative path. CI runs no Python, so this is how a query or fixture
 * edited without regenerating `bql-oracle.json` is noticed.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function fixtureFiles(root: string, prefix = ""): string[] {
  return readdirSync(join(root, prefix)).flatMap((name) => {
    const relative = prefix === "" ? name : `${prefix}/${name}`;
    return statSync(join(root, relative)).isDirectory()
      ? fixtureFiles(root, relative)
      : [relative];
  });
}

export function computeSourceHash(
  queriesPath: string,
  fixturesDir: string,
): string {
  const digest = createHash("sha256");
  digest.update(readFileSync(queriesPath));
  // Plain code-unit order, the same as Python's sort over these ASCII paths.
  for (const relative of fixtureFiles(fixturesDir).sort()) {
    digest.update(relative);
    digest.update("\0");
    digest.update(readFileSync(join(fixturesDir, relative)));
    digest.update("\0");
  }
  return digest.digest("hex");
}

export const REGENERATE_COMMAND =
  "../../cli/.venv/bin/python scripts/bql-oracle/generate-bql-oracle.py";

/** Throws a message that says what to run when the oracle no longer matches its inputs. */
export function assertOracleCurrent(
  recorded: string | undefined,
  queriesPath: string,
  fixturesDir: string,
): void {
  if (recorded === computeSourceHash(queriesPath, fixturesDir)) return;
  throw new Error(
    "bql-oracle.json is out of date: queries.json or fixtures/ changed after it was generated.\n" +
      `  Regenerate it from backend-cluster/ledger and commit the result:\n    ${REGENERATE_COMMAND}\n` +
      "  (needs beanquery 0.2.0; see scripts/bql-oracle/README.md)",
  );
}
