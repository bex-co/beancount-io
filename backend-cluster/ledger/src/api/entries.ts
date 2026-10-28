import Router from "@koa/router";
import {
  authMiddleware,
  giteaClientForRequest,
  directiveLimitExempt,
} from "@/server/auth";
import { successResponse } from "@/server/envelope";
import { checkDirectiveLimitForFileChanges } from "@/core/directive-limit";
import { entryInputToText, isDecimalNumber } from "@/foundation/rustledger";
import type { LedgerEntryInput } from "@/foundation/ledger-api-types/ledger-entry-input";
import { BadUserInputError, UnbalancedTransactionError } from "@/shared/errors";
import { ledgerIdOf, servicesForRequest } from "./service-context";
import {
  countLedgerErrors,
  projectNewLedgerErrors,
  refuseProjectedErrors,
} from "@/features/ledger/utils/new-ledger-errors";
import {
  checkTransactionBalance,
  scanInferredToleranceDefaults,
  type BalancePosting,
} from "@/features/ledger/utils/transaction-balance";
import { NotFoundDetailError } from "@/server/py-errors";
import type { ContentsResponse } from "@/features/gitea/client/gitea-api";
import { assertSafeRepoPath, toSafeRepoUrlPath } from "@/shared/safe-repo-path";
import { addEntriesCommitMessage } from "@/features/ledger/utils/commit-message";
import {
  assertEntryTokens,
  assertNoControlCharacters,
  isSingleDirective,
} from "@/features/ledger/utils/entry-tokens";
import {
  DEFAULT_ENTRY_POINT,
  type ReplacedSourceRange,
} from "@/foundation/rustledger";
import { addIncludes } from "@/features/ledger/utils/routed-includes";
import {
  lineEndingOf,
  withLineEnding,
} from "@/features/ledger/utils/line-ending";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "entries-api" });

/**
 * A file's text, or a refusal when its bytes are not valid UTF-8: decoding
 * leniently turned each undecodable byte into U+FFFD and wrote that back, and
 * the "is not UTF-8" error the file showed vanished with it (w21/679).
 */
function decodeUtf8Strictly(base64: string, path: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      Buffer.from(base64, "base64"),
    );
  } catch {
    throw new BadUserInputError(
      `${path} is not valid UTF-8 text, so adding to it would replace the bytes that cannot be decoded; re-save it as UTF-8 first`,
    );
  }
}

const newlines = (text: string) => text.split("\n").length - 1;

/**
 * The hashes the committed entries now carry, in request order, so a caller
 * can read, edit or delete what it just wrote (w23/060). Best-effort: the
 * commit has landed, so a failed parse costs the hashes, not the write — and
 * a partial list would not say which hash is which entry's.
 */
async function writtenEntryHashes(
  data: ReturnType<typeof servicesForRequest>["data"],
  ledgerId: string,
  overlays: { path: string; content: string }[],
  ranges: ReplacedSourceRange[],
): Promise<string[]> {
  try {
    const ids = await data.projectedEntryIds({
      ledgerId,
      userId: undefined,
      overlays,
      ranges,
      enforceInputLimits: false,
    });
    return ids.every((id): id is string => id !== null) ? ids : [];
  } catch (error) {
    log.warn("could not resolve the hashes of committed entries", {
      ledgerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Refuse a write whose entries the reparsed ledger would not contain. They sit
 * after text the parser cannot get past, so the ledger would never read them
 * and the caller would still be told they were saved (w21/682). An engine that
 * cannot answer is not a reason to refuse.
 */
async function assertEntriesAreRead(
  data: ReturnType<typeof servicesForRequest>["data"],
  ledgerId: string,
  updates: { path: string; content: string }[],
  ranges: ReplacedSourceRange[],
): Promise<void> {
  let ids: (string | null)[];
  try {
    ids = await data.projectedEntryIds({
      ledgerId,
      userId: undefined,
      overlays: updates.map(({ path, content }) => ({ path, content })),
      ranges,
      enforceInputLimits: false,
    });
  } catch {
    return;
  }
  if (ids.every((id) => id !== null)) return;
  throw new BadUserInputError(
    "The ledger would not read what is added: an earlier line in the file (such as a note with an unclosed quote) swallows it. Fix that line first.",
  );
}

/**
 * Wire shape (Python `EntryAddBulkEntriesRequest`): a discriminated union of
 * `{type, item, filename?}` rows plus a request-level default `filename`.
 * File routing is the PYTHON rule — `entry.filename ?? request.filename ??
 * "main.bean"` — not the donor service's bcio-option routing (that rule lives
 * client-side in backend-v2, which sends explicit filenames here).
 *
 * Known input gaps vs the full Python union (documented, engine-side):
 * `custom`/`document` items are not mapped by `toDirective` yet;
 * backend-v2 never sends them on this wire.
 */
interface BulkEntryWire {
  type: string;
  item: Record<string, unknown>;
  filename?: string | null;
}

function toEngineInput(row: BulkEntryWire): LedgerEntryInput {
  if (row.type === "note") {
    const { comment, ...rest } = row.item as { comment?: string };
    return {
      type: "note",
      entry: { ...rest, content: comment ?? "" },
    } as LedgerEntryInput;
  }
  return { type: row.type, entry: row.item } as LedgerEntryInput;
}

/**
 * Every amount a wire row carries, with the field path a refusal names.
 * Transactions carry posting units, prices, costs, and total prices;
 * balance, price and budget an `amount`; balance may carry a
 * bare-decimal `tolerance`; custom values may carry a number or an amount.
 */
function rowNumbers(row: BulkEntryWire): Array<[string, unknown]> {
  const item = (row.item ?? {}) as Record<string, unknown>;
  const numbers: Array<[string, unknown]> = [];
  const add = (path: string, holder: unknown) => {
    if (holder && typeof holder === "object" && "number" in holder) {
      numbers.push([path, (holder as { number: unknown }).number]);
    }
  };
  if (Array.isArray(item.postings)) {
    item.postings.forEach((posting: Record<string, unknown>, index) => {
      add(`postings[${index}].units.number`, posting?.units);
      add(`postings[${index}].price.number`, posting?.price);
      add(`postings[${index}].cost.number`, posting?.cost);
      add(`postings[${index}].totalPrice.number`, posting?.totalPrice);
    });
  }
  add("amount.number", item.amount);
  // A balance tolerance is a bare decimal, not an amount object (w23/m6/t009).
  if (item.tolerance !== undefined) {
    numbers.push(["tolerance", item.tolerance]);
  }
  if (Array.isArray(item.values)) {
    item.values.forEach((value: Record<string, unknown>, index) => {
      if (value?.kind === "number") {
        numbers.push([`values[${index}].value`, value.value]);
      } else if (value?.kind === "amount") {
        numbers.push([`values[${index}].number`, value.number]);
      }
    });
  }
  return numbers;
}

/**
 * Refuse any amount that is not a plain decimal before a file is read. Left
 * alone, a posting like `(12.50)` failed deep in the balance check as a 500 —
 * reported upstream as "service unavailable, retry" — and a balance, price or
 * budget amount like `abc` was committed as unparseable text.
 */
function assertDecimalAmounts(rows: BulkEntryWire[]): void {
  rows.forEach((row, idx) => {
    for (const [field, value] of rowNumbers(row)) {
      if (!isDecimalNumber(value)) {
        throw new BadUserInputError(
          `entry ${idx}: ${field} ${JSON.stringify(value)} is not a decimal number`,
        );
      }
    }
  });
}

export function setEntriesHandler(router: Router): void {
  // operationId: addBulkEntries — POST /entries/{o}/{r}/bulk →
  // success({entry_hashes})
  router.post(
    "/entries/:owner/:repo_name/bulk",
    authMiddleware,
    async (ctx) => {
      const { owner, repo_name: repoName } = ctx.params;
      const body = (ctx.request.body ?? {}) as {
        entries?: BulkEntryWire[];
        filename?: string | null;
        allowInvalid?: boolean | null;
        /** Run every check, commit nothing (w23/058). */
        dryRun?: boolean | null;
      };
      const defaultFilename = body.filename || "main.bean";
      const allowInvalid = body.allowInvalid === true;
      const dryRun = body.dryRun === true;
      const rows = body.entries ?? [];
      assertDecimalAmounts(rows);
      assertEntryTokens(rows);
      assertNoControlCharacters(rows);

      const client = giteaClientForRequest(ctx);

      // Fetch every target file first: the balance check below needs the
      // ledger's `inferred_tolerance_default`, which lives in file content.
      const currentContents = new Map<
        string,
        { current: string; sha: string }
      >();
      const readFile = async (target: string) => {
        const safeUrlPath = toSafeRepoUrlPath(target, "filename");
        let file: ContentsResponse | null = null;
        try {
          const res = await client.repos.repoGetContents(
            owner,
            repoName,
            safeUrlPath,
          );
          const data = res.data as ContentsResponse | ContentsResponse[] | null;
          file = data === null || Array.isArray(data) ? null : data;
        } catch (err) {
          if ((err as { status?: number }).status !== 404) throw err;
        }
        if (file === null) {
          // A routed file the write would create first: check against empty.
          if (dryRun) return { current: "", sha: "" };
          throw new NotFoundDetailError(`File ${target} not found`);
        }
        return {
          current: decodeUtf8Strictly(file.content ?? "", target),
          sha: file.sha as string,
        };
      };
      for (const [idx, row] of rows.entries()) {
        const target = row.filename || defaultFilename;
        assertSafeRepoPath(target, `entries[${idx}].filename`);
        if (currentContents.has(target)) continue;
        currentContents.set(target, await readFile(target));
      }

      // Like Beancount, refuse a transaction whose residual is outside the
      // ledger's tolerance — unless the caller records the imbalance
      // deliberately with `allowInvalid`. One posting per transaction may omit
      // its amount: the residual interpolates it, and the posting renders
      // elided, as written.
      if (!allowInvalid) {
        // Only the files this batch touches are scanned for the override; an
        // `inferred_tolerance_default` living in an unrelated file is missed
        // (see scanInferredToleranceDefaults).
        const toleranceDefaults = scanInferredToleranceDefaults(
          [...currentContents.values()].map(({ current }) => current),
        );
        rows.forEach((row, idx) => {
          if (row.type !== "transaction") return;
          const postings = (row.item as { postings?: unknown } | null)
            ?.postings;
          if (!Array.isArray(postings)) return;
          const check = checkTransactionBalance(
            postings as BalancePosting[],
            toleranceDefaults,
          );
          if (check.ok) return;
          if (check.value.kind === "unbalanced") {
            throw new UnbalancedTransactionError(
              `entry ${idx}: ${check.value.message}`,
              { residual: check.value.residuals.join(", "), entry: idx },
            );
          }
          throw new BadUserInputError(`entry ${idx}: ${check.value.message}`);
        });
      }

      // Build each entry's text (Python: build_directive → 400 "entry {idx}: {e}")
      const byFile = new Map<string, { index: number; text: string }[]>();
      rows.forEach((row, idx) => {
        let text: string;
        try {
          text = entryInputToText(toEngineInput(row));
        } catch (err) {
          throw new BadUserInputError(
            `entry ${idx}: ${(err as Error).message}`,
          );
        }
        // One entry in, one directive out — whatever the token rules miss.
        if (!isSingleDirective(text)) {
          throw new BadUserInputError(
            `entry ${idx}: renders as more than one directive`,
          );
        }
        const target = row.filename || defaultFilename;
        assertSafeRepoPath(target, `entries[${idx}].filename`);
        const list = byFile.get(target) ?? [];
        list.push({ index: idx, text });
        byFile.set(target, list);
      });

      // Routing can reach a file nothing includes — a new year's file under
      // per-year includes — whose entries would commit unseen by any report.
      // The entry point gains the include in the same commit, ahead of any
      // entry text, so the check below loads it too (w23/062).
      const { data } = servicesForRequest(ctx);
      const ledgerId = ledgerIdOf(ctx);
      const loaded = new Set(
        rows.length === 0
          ? []
          : await data.projectedSourceFiles({
              ledgerId,
              userId: undefined,
              overlays: [...currentContents].map(([path, { current }]) => ({
                path,
                content: Buffer.from(current, "utf8").toString("base64"),
              })),
              enforceInputLimits: false,
            }),
      );
      const included = [...byFile.keys()].filter((path) => !loaded.has(path));
      if (included.length > 0) {
        const entry =
          currentContents.get(DEFAULT_ENTRY_POINT) ??
          (await readFile(DEFAULT_ENTRY_POINT));
        currentContents.set(DEFAULT_ENTRY_POINT, {
          ...entry,
          current: addIncludes(entry.current, included),
        });
      }

      const updates: Array<{ path: string; content: string; sha: string }> = [];
      // Where each row's text lands, to find its hash once committed.
      const ranges: ReplacedSourceRange[] = [];
      // Per-file appended text for a dry run's preview (w23/m7/t002).
      const preview: Array<{ path: string; text: string }> = [];
      for (const [path, written] of byFile) {
        const cached = currentContents.get(path);
        if (!cached) {
          throw new NotFoundDetailError(`File ${path} not found`);
        }
        // Python: current + "\n" + format_entries(directives); the engine's
        // entryInputToText is the format_entries block for one entry.
        const eol = lineEndingOf(cached.current);
        let newContents = cached.current + eol;
        let appended = "";
        for (const { index, text: block } of written) {
          // The file's own line ending, so a CRLF file stays CRLF (w21/673).
          const text = withLineEnding(block, eol);
          ranges[index] = {
            file: path,
            startLine: newlines(newContents),
            lineCount: newlines(text.replace(/\n$/, "")) + 1,
          };
          newContents += text;
          appended += text;
        }
        preview.push({ path, text: appended });
        updates.push({
          path,
          content: Buffer.from(newContents, "utf8").toString("base64"),
          sha: cached.sha,
        });
      }
      const entryPoint = currentContents.get(DEFAULT_ENTRY_POINT);
      if (
        included.length > 0 &&
        entryPoint &&
        !byFile.has(DEFAULT_ENTRY_POINT)
      ) {
        updates.push({
          path: DEFAULT_ENTRY_POINT,
          content: Buffer.from(entryPoint.current, "utf8").toString("base64"),
          sha: entryPoint.sha,
        });
      }

      if (updates.length > 0) {
        // Check the projection, then commit — the text-append route's order
        // (w0/m2). A second `open` for an open account, or a balance against
        // an unopened one, used to be committed and only surfaced later as a
        // ledger error. `allowInvalid` records such entries deliberately.
        // The check always runs: the flag suppresses only the refusal, and
        // the projection is reported on the response either way (w23/161).
        const after = await data.checkProjectedErrors({
          ledgerId,
          userId: undefined,
          overlays: updates,
          enforceInputLimits: false,
        });
        const projection = await projectNewLedgerErrors(after, () =>
          data.getErrors({ ledgerId, userId: undefined }),
        );
        if (!allowInvalid) {
          refuseProjectedErrors(projection, "add");
          // A parse error already in the file (an unclosed quote) can swallow
          // what is written after it, and the same message at another line
          // counts as nothing new: look for the entries themselves (w21/682).
          if (after.length > 0) {
            await assertEntriesAreRead(data, ledgerId, updates, ranges);
          }
        }
        await checkDirectiveLimitForFileChanges(
          client,
          owner,
          repoName,
          Object.fromEntries(updates.map((u) => [u.path, u.content])),
          { exempt: directiveLimitExempt(ctx) },
        );
        // A caller that has to do something irreversible first — store a
        // receipt — asks whether the entries would be accepted, so a refusal
        // leaves nothing behind (w23/058).
        if (dryRun) {
          ctx.body = successResponse({
            entry_hashes: [],
            included_files: included,
            preview,
            errors_before: projection.errorsBefore,
            errors_after: projection.errorsAfter,
            new_errors: projection.newErrors,
          });
          return;
        }
        await client.repos.repoChangeFiles(owner, repoName, {
          files: updates.map((u) => ({
            operation: "update" as const,
            path: u.path,
            content: u.content,
            sha: u.sha,
          })),
          message: addEntriesCommitMessage(
            rows.length,
            [...byFile.values()].flatMap((written) =>
              written.map(({ text }) => text),
            ),
          ),
        });
        ctx.body = successResponse({
          entry_hashes: await writtenEntryHashes(
            data,
            ledgerId,
            updates.map(({ path, content }) => ({ path, content })),
            ranges,
          ),
          included_files: included,
          errors_before: projection.errorsBefore,
          errors_after: projection.errorsAfter,
          new_errors: projection.newErrors,
        });
        return;
      }
      // An empty batch changes nothing: the projection is today's errors,
      // before and after, with nothing new.
      const current = await data.getErrors({ ledgerId, userId: undefined });
      const currentCount = countLedgerErrors(current);
      ctx.body = successResponse({
        entry_hashes: [],
        included_files: [],
        errors_before: currentCount,
        errors_after: currentCount,
        new_errors: [],
      });
    },
  );
}
