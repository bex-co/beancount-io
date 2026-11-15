/**
 * A write that includes a committed file the load never reached, on the live
 * engine through the real projection (w31/022). The repository holds
 * `qa/list.txt` (which includes `y.bean` beside it), `qa/y.bean` and
 * `qa/extra.ldg`, and `main.bean` includes none of them. The load reads the
 * `.bean` files and only the other files a committed include reaches, so the
 * preview of adding `include "qa/list.txt"` was refused "Included file not
 * found" although the commit loads it. Including the `.txt`, the `.ldg` or a
 * glob over `.ldg` files now previews clean, and the projected ledger loads
 * the files they reach; a file the repository lacks, a file the same write
 * deletes and a glob no file matches are still errors.
 *
 * Run by `verify-rustledger.ts` (live engine; not a jest test).
 */
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { committingRepo } from "./entry-move";

const MAIN =
  "2026-01-01 open Assets:Cash USD\n2026-01-01 open Expenses:Food USD\n";

const probe = (day: number, amount: string) =>
  `2026-08-${day} * "Probe"\n  Assets:Cash  -${amount} USD\n  Expenses:Food  ${amount} USD\n`;

function fail(message: string): never {
  throw new Error(`projected includes: ${message}`);
}

export async function verifyProjectedIncludes(): Promise<void> {
  const { factory } = committingRepo({
    "main.bean": MAIN,
    "qa/list.txt": 'include "y.bean"\n',
    "qa/y.bean": probe(30, "1.00"),
    "qa/extra.ldg": probe(31, "2.00"),
  });
  const service = new LedgerDataService(factory as never, {} as never);
  const params = { ledgerId: "synthetic/includes", userId: undefined };
  const overlays = (target: string, deletes: string[] = []) => [
    ...deletes.map((path) => ({ path, content: null })),
    {
      path: "main.bean",
      content: Buffer.from(`${MAIN}include "${target}"\n`).toString("base64"),
    },
  ];
  const preview = async (target: string, deletes: string[] = []) =>
    (
      await service.checkProjectedErrors({
        ...params,
        overlays: overlays(target, deletes),
      })
    ).map(
      (error) =>
        `${error.source?.filename}:${error.source?.lineno} ${error.message}`,
    );

  for (const [target, loaded] of [
    ["qa/list.txt", ["main.bean", "qa/list.txt", "qa/y.bean"]],
    ["./qa/list.txt", ["main.bean", "qa/list.txt", "qa/y.bean"]],
    ["qa/extra.ldg", ["main.bean", "qa/extra.ldg"]],
    ["qa/*.ldg", ["main.bean", "qa/extra.ldg"]],
  ] as const) {
    const errors = await preview(target);
    if (errors.length > 0) {
      fail(`include "${target}" previews ${JSON.stringify(errors)}`);
    }
    const sources = await service.projectedSourceFiles({
      ...params,
      overlays: overlays(target),
    });
    if (JSON.stringify(sources) !== JSON.stringify(loaded)) {
      fail(`include "${target}" loads ${JSON.stringify(sources)}`);
    }
  }
  console.log(
    "✓ a write that includes a committed .txt, .ldg or glob over .ldg files previews clean and loads them (w31/022)",
  );

  for (const [target, deletes, expected] of [
    ["qa/nope.txt", [], "main.bean:3 Included file not found: qa/nope.txt"],
    [
      "qa/list.txt",
      ["qa/list.txt"],
      "main.bean:3 Included file not found: qa/list.txt",
    ],
    [
      "qa/*.dat",
      [],
      'main.bean:3 include pattern "qa/*.dat" does not match any files',
    ],
  ] as const) {
    const errors = await preview(target, [...deletes]);
    if (JSON.stringify(errors) !== JSON.stringify([expected])) {
      fail(
        `include "${target}"${deletes.length ? " with it deleted" : ""} previews ${JSON.stringify(errors)}`,
      );
    }
  }
  console.log(
    "✓ an include of a missing or deleted file, or an unmatched glob, still previews its error (w31/022)",
  );
}
