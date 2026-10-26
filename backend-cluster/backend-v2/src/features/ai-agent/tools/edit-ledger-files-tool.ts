import { tool } from "ai";
import { z } from "zod";
import { logger } from "@/shared/logger";
import {
  BadUserInputError,
  ConflictError,
  NotFoundError,
} from "@/shared/errors";
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
import { unifiedDiff } from "@/shared/unified-diff";
import { assertWritableText } from "@/shared/file-content";
import { assertAmountsFitEngineDecimal } from "@/features/ledger/utils/engine-decimal";
import { resolveCommitMessage } from "@/features/ledger/utils/commit-message-alias";
import {
  DELETE_INCLUDE_GUARD_BATCH_NOTE,
  DELETE_INCLUDE_GUARD_DESCRIPTION,
} from "@/features/ledger/utils/include-references";

/** Commits one edit call makes before a lost race is the caller's (w23/017). */
const MAX_COMMIT_ATTEMPTS = 3;

const toolLogger = logger.child({ module: "tool:edit-ledger-files" });

const description =
  "Create, update, replace, or delete files in a single atomic commit.\n" +
  "  create: new text file — provide plain UTF-8 text content (NOT base64).\n" +
  "  update: str_replace on a text file — old_string must appear exactly once.\n" +
  "  Several operations on one path apply in order, each to the text the previous one produced.\n" +
  "  replace: overwrite entire text file — provide plain UTF-8 text content (NOT base64).\n" +
  "  delete: remove a file — refused when still `include`d by another file. " +
    DELETE_INCLUDE_GUARD_BATCH_NOTE +
    "\n" +
  "  Each new/resulting file is limited to 1 MiB of UTF-8 bytes, including dry runs.\n" +
  "  dry_run previews without committing: same refusal as the commit, plus a " +
  "unified diff per touched file and bean-check's verdict over the projected " +
  "contents — approve only what the preview shows, then send the identical " +
  "files with dry_run false.";

const filePath = z.string().describe("File path relative to ledger root");
const oldString = z
  .string()
  .min(1, "old_string must not be empty")
  .describe("Exact text to replace — must appear exactly once in the file.");
const newString = z.string().describe("Replacement text.");
const baseSha = z
  .string()
  .optional()
  .describe(
    "The file's `sha` from readLedgerFiles: refused if the file changed since. Without it, concurrent changes are overwritten.",
  );

const fileOpSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("create"),
    path: filePath,
    content: z
      .string()
      .describe("Plain UTF-8 text content of the new file (NOT base64)."),
  }),
  z.object({
    operation: z.literal("update"),
    path: filePath,
    old_string: oldString,
    new_string: newString,
  }),
  z.object({
    operation: z.literal("replace"),
    path: filePath,
    content: z
      .string()
      .describe(
        "Plain UTF-8 text content to overwrite the entire file with (NOT base64).",
      ),
    sha: baseSha,
  }),
  z.object({
    operation: z.literal("delete"),
    path: filePath,
    sha: baseSha,
  }),
]);

export const editLedgerFilesInputSchema = z.object({
  description: z
    .string()
    .optional()
    .describe(
      "One sentence describing what these changes do. Shown to the user for approval and used verbatim as the commit message.",
    ),
  // Alias (w23/m3/t002): REST, GraphQL, and rename spell the commit message
  // `message`; one of the two is required.
  message: z
    .string()
    .optional()
    .describe("Alias of description, as REST and GraphQL spell it."),
  files: z.array(fileOpSchema).min(1),
  dry_run: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "If true, validates all operations and returns a preview without committing.",
    ),
});

type FileOperation = z.infer<typeof fileOpSchema>;

const editLedgerFilesOutputSchema = toolOutputSchema(
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
 * Refuses a batch whose changes to one path cannot fold into the single
 * operation the commit sends for that path — before any request (w23/028).
 */
function assertFoldable(files: FileOperation[]): void {
  const seen = new Map<string, FileOperation["operation"][]>();
  for (const file of files) {
    const prior = seen.get(file.path) ?? [];
    const refuse = (problem: string) => {
      throw new BadUserInputError(
        `${file.path}: ${problem} in one call`,
        "files",
        "Send each file once with its final change: chain several `old_string` edits to it, or give its whole new content.",
      );
    };
    if (file.operation === "create" && prior.includes("create"))
      refuse("is created twice");
    if (file.operation === "delete" && prior.includes("create"))
      refuse("is created and deleted");
    if (prior.at(-1) === "delete" && file.operation !== "create")
      refuse(
        file.operation === "delete"
          ? "is deleted twice"
          : "is changed after it is deleted",
      );
    seen.set(file.path, [...prior, file.operation]);
  }
}

/**
 * Folds every change to one path into the one operation the commit sends for
 * it, and returns the post-change contents (`null` projects a deletion) that a
 * dry run diffs and checks. Later changes chain onto earlier ones, so the
 * preview and the commit apply the same edits and refuse the same inputs.
 * One operation per path was a correctness requirement, not a nicety: each
 * Gitea operation writes the whole file, so two edits built from the original
 * text committed only the last (w23/028).
 */
function foldOperations(
  fileCache: Map<string, { content: string; sha: string; lossy?: true }>,
  files: FileOperation[],
): {
  operations: LedgerChangeFileOperation[];
  projected: Map<string, string | null>;
} {
  // `create` marks a new file; one created again after this call deleted it
  // is an overwrite of the existing file.
  const touched = new Map<
    string,
    { content: string | null; create: boolean }
  >();
  for (const f of files) {
    const state = touched.get(f.path);
    const current = state ? state.content : fileCache.get(f.path)?.content;
    if (f.operation === "create") {
      touched.set(f.path, {
        content: f.content,
        create: !(current === null && fileCache.has(f.path)),
      });
      continue;
    }
    // Categorized rather than left to the boundary's message sniffing,
    // which made this NOT_FOUND only because of its wording (w5/051).
    if (current === undefined || current === null)
      throw new NotFoundError("File", f.path);
    // A whole-file write or a delete from an old read would drop whatever
    // landed since; the caller's `sha` names the version it read (w23/039).
    if (
      (f.operation === "replace" || f.operation === "delete") &&
      f.sha !== undefined &&
      f.sha !== fileCache.get(f.path)?.sha
    )
      throw new ConflictError(
        "File",
        `${f.path} changed since you read it; re-read it and retry`,
      );
    const create = state?.create ?? false;
    if (f.operation === "replace") {
      touched.set(f.path, { content: f.content, create });
      continue;
    }
    if (f.operation === "delete") {
      touched.set(f.path, { content: null, create });
      continue;
    }
    // update (str_replace), matched against the text earlier edits produced
    if (!state) assertWritableText({ path: f.path, ...fileCache.get(f.path) });
    const count = current.split(f.old_string).length - 1;
    if (count === 0)
      // The file exists; it is the argument that does not match it. The
      // same wording used to read as NOT_FOUND, as if the file were gone.
      throw new BadUserInputError(
        `${f.path}: old_string does not occur in the file`,
        "old_string",
        "Read the file's current text with `readLedgerFiles` and copy `old_string` from it exactly, whitespace included.",
      );
    if (count > 1)
      // The caller's to fix by sending more context. As a plain Error it
      // read as a server fault with a hint to retry (w5/036).
      throw new BadUserInputError(
        `${f.path}: old_string matches ${count} times (must match exactly once — add more context lines)`,
        "old_string",
        "Extend `old_string` with neighbouring lines until it is unique in the file, or use `replace` to overwrite the whole file.",
      );
    const at = current.indexOf(f.old_string);
    touched.set(f.path, {
      content:
        current.slice(0, at) +
        f.new_string +
        current.slice(at + f.old_string.length),
      create,
    });
  }

  const operations: LedgerChangeFileOperation[] = [];
  const projected = new Map<string, string | null>();
  for (const [path, { content, create }] of touched) {
    // A change that leaves the file as it is commits nothing: it made an
    // empty commit reported as "Committed 1 change(s)" (w23/052).
    if (!create && content === fileCache.get(path)?.content) continue;
    projected.set(path, content);
    const sha = fileCache.get(path)?.sha;
    if (content === null) operations.push({ operation: "delete", path, sha });
    // A create over a file that exists stays a create, so the preview and
    // the commit refuse it as they always have.
    else if (create) operations.push({ operation: "create", path, content });
    else operations.push({ operation: "update", path, content, sha });
  }
  return { operations, projected };
}

export async function executeEditLedgerFiles(
  ctx: Pick<ToolContext, "services" | "identity" | "ledgerId">,
  input: z.infer<typeof editLedgerFilesInputSchema>,
): Promise<EditLedgerFilesOutput> {
  const { services, identity, ledgerId } = ctx;
  const { files, dry_run } = input;
  const description = resolveCommitMessage(input, { required: true });

  toolLogger.debug("Executing file operations", {
    description,
    fileCount: files.length,
    dry_run,
  });

  return runToolSafely({
    logger: toolLogger,
    message: "Failed to commit file operations",
    level: "error",
    // A preview commits nothing, so its refusal must not say a commit failed.
    formatError: (msg) =>
      `${dry_run ? "preview refused" : "commit failed"}: ${msg}`,
    execute: async (): Promise<EditLedgerFilesResult> => {
      const normalizedFiles = files.map((file) => ({
        ...file,
        path: normalizeAgentRepoPath(file.path),
      }));
      assertFoldable(normalizedFiles);
      // Only the new text is checked: an untouched long literal already in
      // the file is the projection's to report, not this edit's (w23/081).
      for (const file of normalizedFiles) {
        if (file.operation === "create" || file.operation === "replace") {
          assertAmountsFitEngineDecimal(file.content);
        } else if (file.operation === "update") {
          assertAmountsFitEngineDecimal(file.new_string);
        }
      }
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
      // Reads each file and builds the commit from what it holds now. Run
      // again when a concurrent write wins the commit, so exact-text edits
      // land on the new content instead of failing the call (w23/017).
      const prepare = async () => {
        const fileCache = new Map<
          string,
          { content: string; sha: string; lossy?: true }
        >();
        if (pathsToFetch.length > 0) {
          const cachedFiles = await services.ledgerRepo.getFilesContent({
            ledgerId,
            identity,
            paths: pathsToFetch,
          });
          for (const { path, ...file } of cachedFiles) {
            fileCache.set(path, file);
          }
        }

        return { fileCache, ...foldOperations(fileCache, normalizedFiles) };
      };
      const { fileCache, operations, projected } = await prepare();
      // Only exact-text edits and creations are re-applied after a lost race:
      // a whole-file `replace` or a `delete` would silently overwrite or drop
      // the change that won, so those surface the conflict instead.
      const retryable = normalizedFiles.every(
        (f) => f.operation === "update" || f.operation === "create",
      );

      const ops = operations.map((op) => ({
        operation: op.operation,
        path: op.path,
      }));

      if (operations.length === 0) {
        // Every change left its file as it was (w23/052). The write is still
        // authorized, so a caller the commit would refuse is refused here.
        await services.ledgerRepo.changeFiles({
          ledgerId,
          identity,
          operations: [],
          message: description,
          dryRun: true,
        });
        const errors = await readBeanCheckErrors(services, identity, ledgerId);
        return {
          diff: [],
          summary: "No changes — nothing committed",
          dry_run,
          count: 0,
          operations: [],
          wrote: [],
          entryHashes: [],
          validation: toWriteValidation(errors, errors),
        };
      }

      if (dry_run) {
        // The preview must refuse exactly what the commit would: the service
        // runs the same write authorization and path validation, then stops
        // before the repository call. Without this, a create-only preview
        // never authorized at all, and read-only callers previewed happily.
        await services.ledgerRepo.changeFiles({
          ledgerId,
          identity,
          operations,
          message: description,
          dryRun: true,
        });
        // Check the post-change contents the commit below would write: no
        // commit, no branch, just bean-check over the projection.
        const diff = [...projected].map(([path, after]) => ({
          path,
          diff: unifiedDiff(path, fileCache.get(path)?.content ?? null, after),
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
        async () => {
          let attempt = operations;
          for (let tries = 1; ; tries += 1) {
            try {
              return await services.ledgerRepo.changeFiles({
                ledgerId,
                identity,
                operations: attempt,
                message: description,
              });
            } catch (error) {
              if (
                !retryable ||
                tries >= MAX_COMMIT_ATTEMPTS ||
                !(error instanceof ConflictError)
              )
                throw error;
              attempt = (await prepare()).operations;
              // The winner made the same change: nothing is left to commit.
              if (attempt.length === 0) return;
            }
          }
        },
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
    execute: async ({ description, message, files }) =>
      executeEditLedgerFiles(
        {
          services: ctx.services,
          identity: ctx.identity,
          ledgerId: ctx.ledgerId,
        },
        {
          description,
          message,
          files,
          dry_run: false,
        },
      ),
  });
}

// --- one MCP tool per kind of file change (ADR 019, 2026-10-18; w1/m38) ----
//
// MCP exposes create, update, and delete as separate tools, each taking a batch
// of its own kind in one atomic commit. They map onto the shared executor's
// per-file operations; the in-product agent keeps the combined tool above.

const fullContent = z
  .string()
  .describe("Plain UTF-8 text content of the whole file (NOT base64).");

const PREVIEW_NOTE =
  " Each new/resulting file is limited to 1 MiB of UTF-8 bytes, including dry runs. dry_run previews without committing: the same refusal as the commit, plus a unified diff per touched file and bean-check's verdict over the projected contents.";

/** One kind of file change: a batch of `file` items, committed together. */
function fileOperation<F extends z.ZodType>(
  file: F,
  description: string,
  toOperation: (file: z.output<F>) => FileOperation,
) {
  const schema = z.object({
    description: editLedgerFilesInputSchema.shape.description,
    message: editLedgerFilesInputSchema.shape.message,
    files: z.array(file).min(1),
    dry_run: editLedgerFilesInputSchema.shape.dry_run,
  });
  return {
    schema: schema as z.ZodObject,
    description: description + PREVIEW_NOTE,
    outputSchema: editLedgerFilesOutputSchema,
    execute: (
      ctx: Pick<ToolContext, "services" | "identity" | "ledgerId">,
      input: unknown,
    ) => {
      const { files, ...rest } = schema.parse(input);
      return executeEditLedgerFiles(ctx, {
        ...rest,
        files: files.map(toOperation),
      });
    },
  };
}

export const LEDGER_FILE_OPERATIONS = {
  create: fileOperation(
    z.object({ path: filePath, content: fullContent }).strict(),
    "Create new text files in one atomic commit; each file gets plain UTF-8 content.",
    (file) => ({ operation: "create", ...file }),
  ),
  update: fileOperation(
    z.union([
      z
        .object({
          path: filePath,
          old_string: oldString,
          new_string: newString,
        })
        .strict(),
      z.object({ path: filePath, content: fullContent, sha: baseSha }).strict(),
    ]),
    "Change existing text files in one atomic commit: per file, either replace an exact text (old_string must appear exactly once) with new_string, or overwrite the whole file with content (pass its sha from readLedgerFiles to refuse it if the file changed since). Several items for one file apply in order, each to the text the previous one produced.",
    (file) =>
      "content" in file
        ? { operation: "replace", ...file }
        : { operation: "update", ...file },
  ),
  delete: fileOperation(
    z.object({ path: filePath, sha: baseSha }).strict(),
    "Delete files in one atomic commit; pass each file's sha from readLedgerFiles to refuse the delete if it changed since. " +
      DELETE_INCLUDE_GUARD_DESCRIPTION,
    (file) => ({ operation: "delete", ...file }),
  ),
};
