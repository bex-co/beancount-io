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
import { BadUserInputError } from "@/shared/errors";
import { NotFoundDetailError } from "@/server/py-errors";
import type { ContentsResponse } from "@/features/gitea/client/gitea-api";
import { assertSafeRepoPath, toSafeRepoUrlPath } from "@/shared/safe-repo-path";

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
      };
      const defaultFilename = body.filename || "main.bean";
      const rows = body.entries ?? [];

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

      const client = giteaClientForRequest(ctx);
      const updates: Array<{ path: string; content: string; sha: string }> = [];
      for (const [path, texts] of byFile) {
        const safeUrlPath = toSafeRepoUrlPath(path, "filename");
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
          throw new NotFoundDetailError(`File ${path} not found`);
        }
        const current = Buffer.from(file.content ?? "", "base64").toString(
          "utf8",
        );
        // Python: current + "\n" + format_entries(directives); the engine's
        // entryInputToText is the format_entries block for one entry.
        const newContents = current + "\n" + texts.join("");
        updates.push({
          path,
          content: Buffer.from(newContents, "utf8").toString("base64"),
          sha: file.sha as string,
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
          message: `Add ${rows.length} entries`,
        });
      }
      ctx.body = successResponse(null);
    },
  );
}
