import { tool } from "ai";
import { z } from "zod";
import { logger } from "@/shared/logger";
import type { LedgerChangeFileOperation } from "@/foundation/fava/Api";
import type { ToolContext } from "./types";
import { toolOutputSchema, withWriteOutcome } from "./types";
import { runToolSafely } from "../utils/run-tool";
import { normalizeAgentRepoPath } from "./agent-repo-path";
import {
  readBeanCheckErrors,
  summarizeWrite,
  toBeanCheckErrors,
  toWriteValidation,
  withPostWriteValidation,
} from "./write-validation";
import { unifiedDiff } from "./file-diff";

const toolLogger = logger.child({ module: "tool:edit-ledger-files" });

export const description =
  "Create, update, replace, or delete files in a single atomic commit.\n" +
  "  create: new text file — provide plain UTF-8 text content (NOT base64).\n" +
  "  update: str_replace on a text file — old_string must appear exactly once.\n" +
  "  replace: overwrite entire text file — provide plain UTF-8 text content (NOT base64).\n" +
  "  delete: remove a file.\n" +
  "  dry_run previews without committing: same refusal as the commit, plus a " +
  "unified diff per touched file and bean-check's verdict over the projected " +
  "contents — approve only what the preview shows, then send the identical " +
  "files with dry_run false.";

const fileOpSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("create"),
    path: z.string().describe("File path relative to ledger root"),
    content: z
      .string()
      .describe("Plain UTF-8 text content of the new file (NOT base64)."),
  }),
  z.object({
    operation: z.literal("update"),
    path: z.string().describe("File path relative to ledger root"),
    old_string: z
      .string()
      .describe(
        "Exact text to replace — must appear exactly once in the file.",
      ),
    new_string: z.string().describe("Replacement text."),
  }),
  z.object({
    operation: z.literal("replace"),
    path: z.string().describe("File path relative to ledger root"),
    content: z
      .string()
      .describe(
        "Plain UTF-8 text content to overwrite the entire file with (NOT base64).",
      ),
  }),
  z.object({
    operation: z.literal("delete"),
    path: z.string().describe("File path relative to ledger root"),
  }),
]);

export const editLedgerFilesInputSchema = z.object({
  description: z
    .string()
    .describe(
      "One sentence describing what these changes do. Shown to user for approval.",
    ),
  files: z.array(fileOpSchema).min(1),
  dry_run: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "If true, validates all operations and returns a preview without committing.",
    ),
});

export const editLedgerFilesOutputSchema = toolOutputSchema(
  withWriteOutcome({
    dry_run: z.boolean(),
    count: z.number().int(),
    operations: z.array(z.object({ operation: z.string(), path: z.string() })),
    diff: z
      .array(z.object({ path: z.string(), diff: z.string() }))
      .describe(
        "Unified diff per touched file for dry runs; empty on commits.",
      ),
  }),
);
export type EditLedgerFilesOutput = z.infer<typeof editLedgerFilesOutputSchema>;
type EditLedgerFilesResult = {
  summary: string;
  dry_run: boolean;
  count: number;
  operations: { operation: string; path: string }[];
  diff: { path: string; diff: string }[];
  wrote: { path: string }[];
  entryHashes: string[];
  validation: {
    errorsBefore: number;
    errorsAfter: number;
    newErrors: { message: string; source?: string }[];
  };
};

/**
 * The post-change contents for every touched path — the same transformation
 * the commit applies — so a dry run can diff and check the projection
 * without committing. `null` projects a deletion. Later ops chain onto
 * earlier ones for the same path.
 */
function projectContents(
  fileCache: Map<string, { content: string; sha: string }>,
  files: { operation: string; path: string; content?: string; old_string?: string; new_string?: string }[],
): Map<string, string | null> {
  const projected = new Map<string, string | null>();
  for (const file of files) {
    if (file.operation === "create" || file.operation === "replace") {
      projected.set(file.path, file.content ?? "");
      continue;
    }
    if (file.operation === "delete") {
      projected.set(file.path, null);
      continue;
    }
    const base = projected.has(file.path)
      ? projected.get(file.path)
      : fileCache.get(file.path)?.content;
    if (base === undefined || base === null) continue;
    projected.set(
      file.path,
      base.split(file.old_string ?? "").join(file.new_string ?? ""),
    );
  }
  return projected;
}

export async function executeEditLedgerFiles(
  ctx: Pick<ToolContext, "services" | "identity" | "ledgerId">,
  input: z.infer<typeof editLedgerFilesInputSchema>,
): Promise<EditLedgerFilesOutput> {
  const { services, identity, ledgerId } = ctx;
  const { description, files, dry_run } = input;

  toolLogger.debug("Executing file operations", {
    description,
    fileCount: files.length,
    dry_run,
  });

  return runToolSafely({
    logger: toolLogger,
    message: "Failed to commit file operations",
    level: "error",
    formatError: (msg) => `commit failed: ${msg}`,
    execute: async (): Promise<EditLedgerFilesResult> => {
      const normalizedFiles = files.map((file) => ({
        ...file,
        path: normalizeAgentRepoPath(file.path),
      }));
      const pathsToFetch = [
        ...new Set(
          normalizedFiles
            .filter(
              (f) =>
                f.operation === "update" ||
                f.operation === "replace" ||
                f.operation === "delete",
            )
            .map((f) => f.path),
        ),
      ];
      const fileCache = new Map<string, { content: string; sha: string }>();
      if (pathsToFetch.length > 0) {
        const cachedFiles = await services.ledgerRepo.getFilesContent({
          ledgerId,
          identity,
          paths: pathsToFetch,
        });
        for (const file of cachedFiles) {
          fileCache.set(file.path, { content: file.content, sha: file.sha });
        }
      }

      const operations: LedgerChangeFileOperation[] = [];
      for (const f of normalizedFiles) {
        if (f.operation === "create") {
          operations.push({
            operation: "create",
            path: f.path,
            content: Buffer.from(f.content).toString("base64"),
          });
          continue;
        }

        const cached = fileCache.get(f.path);
        if (!cached) throw new Error(`${f.path}: file not found`);

        if (f.operation === "replace") {
          operations.push({
            operation: "update",
            path: f.path,
            content: Buffer.from(f.content).toString("base64"),
            sha: cached.sha,
          });
          continue;
        }

        if (f.operation === "delete") {
          operations.push({
            operation: "delete",
            path: f.path,
            sha: cached.sha,
          });
          continue;
        }

        // update (str_replace)
        const count = cached.content.split(f.old_string).length - 1;
        if (count === 0)
          throw new Error(`${f.path}: old_string not found in file`);
        if (count > 1)
          throw new Error(
            `${f.path}: old_string matches ${count} times (must match exactly once — add more context lines)`,
          );
        operations.push({
          operation: "update",
          path: f.path,
          content: Buffer.from(
            cached.content.replace(f.old_string, f.new_string),
          ).toString("base64"),
          sha: cached.sha,
        });
      }

      const ops = operations.map((op) => ({
        operation: op.operation,
        path: op.path,
      }));

      if (dry_run) {
        // The preview must refuse exactly what the commit would: the service
        // runs the same write authorization and path validation, then stops
        // before the repository call. Without this, a create-only preview
        // never authorized at all, and read-only callers previewed happily.
        await services.ledgerRepo.changeFiles({
          ledgerId,
          identity,
          operations,
          message: `AI edit: ${description}`,
          dryRun: true,
        });
        // Build the post-change contents in memory — the same transformation
        // the commit below applies — and check THAT ledger: no commit, no
        // branch, just bean-check over the projection.
        const projected = projectContents(fileCache, normalizedFiles);
        const diff = [...projected].map(([path, after]) => ({
          path,
          diff: unifiedDiff(
            path,
            fileCache.get(path)?.content ?? null,
            after,
          ),
        }));
        const before = await readBeanCheckErrors(services, identity, ledgerId);
        const projectedErrors = toBeanCheckErrors(
          await services.ledgerRepo.checkProjectedFiles({
            ledgerId,
            identity,
            overlays: [...projected].map(([path, content]) => ({
              path,
              content,
            })),
          }),
        );
        const validation = toWriteValidation(before, projectedErrors);
        // `diff` leads the payload so the serialized text content is the
        // diff followed by the one-line summary.
        return {
          diff,
          summary: summarizeWrite(
            `Dry run: ${operations.length} change(s) previewed (${ops.map((op) => op.path).join(", ")}) — not committed`,
            validation,
          ),
          dry_run: true,
          count: operations.length,
          operations: ops,
          wrote: [],
          entryHashes: [],
          validation,
        };
      }

      const { validation } = await withPostWriteValidation(
        services,
        identity,
        ledgerId,
        () =>
          services.ledgerRepo.changeFiles({
            ledgerId,
            identity,
            operations,
            message: `AI edit: ${description}`,
          }),
      );

      toolLogger.info("File operations committed", {
        userId: identity.userId,
        fileCount: files.length,
      });
      const wrote = ops.map((op) => ({ path: op.path }));
      return {
        summary: summarizeWrite(
          `Committed ${operations.length} change(s) to ${ops.map((op) => op.path).join(", ")}`,
          validation,
        ),
        dry_run: false,
        count: operations.length,
        operations: ops,
        diff: [],
        wrote,
        entryHashes: [],
        validation,
      };
    },
  });
}

export function createEditLedgerFilesTool(ctx: ToolContext) {
  return tool({
    description,
    inputSchema: editLedgerFilesInputSchema,
    outputSchema: editLedgerFilesOutputSchema,
    needsApproval: true,
    execute: async ({ description, files }) =>
      executeEditLedgerFiles(
        { services: ctx.services, identity: ctx.identity, ledgerId: ctx.ledgerId },
        {
          description,
          files,
          dry_run: false,
        },
      ),
  });
}
