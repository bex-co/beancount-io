import Router from "@koa/router";
import {
  authMiddleware,
  giteaClientForRequest,
  directiveLimitExempt,
} from "@/server/auth";
import { successResponse } from "@/server/envelope";
import { checkDirectiveLimitForFileChanges } from "@/core/directive-limit";
import { entryInputToText } from "@/foundation/rustledger";
import type { LedgerEntryInput } from "@/foundation/ledger-api-types/ledger-entry-input";
import { BadUserInputError, UnbalancedTransactionError } from "@/shared/errors";
import {
  checkTransactionBalance,
  scanInferredToleranceDefault,
  type BalancePosting,
} from "@/features/ledger/utils/transaction-balance";
import { NotFoundDetailError } from "@/server/py-errors";
import type { ContentsResponse } from "@/features/gitea/client/gitea-api";
import { assertSafeRepoPath, toSafeRepoUrlPath } from "@/shared/safe-repo-path";
import { addEntriesCommitMessage } from "@/features/ledger/utils/commit-message";

/**
 * Wire shape (Python `EntryAddBulkEntriesRequest`): a discriminated union of
 * `{type, item, filename?}` rows plus a request-level default `filename`.
 * File routing is the PYTHON rule — `entry.filename ?? request.filename ??
 * "main.bean"` — not the donor service's bcio-option routing (that rule lives
 * client-side in backend-v2, which sends explicit filenames here).
 *
 * Known input gaps vs the full Python union (documented, engine-side):
 * posting `cost`/`meta` and `custom`/`document` items are not renderable by
 * the engine's `entryInputToText`; backend-v2 never sends them on this wire.
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

export function setEntriesHandler(router: Router): void {
  // operationId: addBulkEntries — POST /entries/{o}/{r}/bulk → success(null)
  router.post(
    "/entries/:owner/:repo_name/bulk",
    authMiddleware,
    async (ctx) => {
      const { owner, repo_name: repoName } = ctx.params;
      const body = (ctx.request.body ?? {}) as {
        entries?: BulkEntryWire[];
        filename?: string | null;
        allowInvalid?: boolean | null;
      };
      const defaultFilename = body.filename || "main.bean";
      const allowInvalid = body.allowInvalid === true;
      const rows = body.entries ?? [];

      const client = giteaClientForRequest(ctx);

      // Fetch every target file first: the balance check below needs the
      // ledger's `inferred_tolerance_default`, which lives in file content.
      const currentContents = new Map<
        string,
        { current: string; sha: string }
      >();
      for (const [idx, row] of rows.entries()) {
        const target = row.filename || defaultFilename;
        assertSafeRepoPath(target, `entries[${idx}].filename`);
        if (currentContents.has(target)) continue;
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
          throw new NotFoundDetailError(`File ${target} not found`);
        }
        currentContents.set(target, {
          current: Buffer.from(file.content ?? "", "base64").toString("utf8"),
          sha: file.sha as string,
        });
      }

      // Like Beancount, refuse a transaction whose residual is outside the
      // ledger's tolerance — unless the caller records the imbalance
      // deliberately with `allowInvalid`. One posting per transaction may omit
      // its amount: the residual interpolates it, and the posting renders
      // elided, as written.
      if (!allowInvalid) {
        // Only the files this batch touches are scanned for the override; an
        // `inferred_tolerance_default` living in an unrelated file falls back
        // to Beancount's default (see scanInferredToleranceDefault).
        const toleranceDefault = scanInferredToleranceDefault(
          [...currentContents.values()].map(({ current }) => current),
        );
        rows.forEach((row, idx) => {
          if (row.type !== "transaction") return;
          const postings = (row.item as { postings?: unknown } | null)
            ?.postings;
          if (!Array.isArray(postings)) return;
          const check = checkTransactionBalance(
            postings as BalancePosting[],
            toleranceDefault,
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
      const byFile = new Map<string, string[]>();
      rows.forEach((row, idx) => {
        let text: string;
        try {
          text = entryInputToText(toEngineInput(row));
        } catch (err) {
          throw new BadUserInputError(
            `entry ${idx}: ${(err as Error).message}`,
          );
        }
        const target = row.filename || defaultFilename;
        assertSafeRepoPath(target, `entries[${idx}].filename`);
        const list = byFile.get(target) ?? [];
        list.push(text);
        byFile.set(target, list);
      });

      const updates: Array<{ path: string; content: string; sha: string }> = [];
      for (const [path, texts] of byFile) {
        const cached = currentContents.get(path);
        if (!cached) {
          throw new NotFoundDetailError(`File ${path} not found`);
        }
        // Python: current + "\n" + format_entries(directives); the engine's
        // entryInputToText is the format_entries block for one entry.
        const newContents = cached.current + "\n" + texts.join("");
        updates.push({
          path,
          content: Buffer.from(newContents, "utf8").toString("base64"),
          sha: cached.sha,
        });
      }

      if (updates.length > 0) {
        await checkDirectiveLimitForFileChanges(
          client,
          owner,
          repoName,
          Object.fromEntries(updates.map((u) => [u.path, u.content])),
          { exempt: directiveLimitExempt(ctx) },
        );
        await client.repos.repoChangeFiles(owner, repoName, {
          files: updates.map((u) => ({
            operation: "update" as const,
            path: u.path,
            content: u.content,
            sha: u.sha,
          })),
          message: addEntriesCommitMessage(rows.length),
        });
      }
      ctx.body = successResponse(null);
    },
  );
}
