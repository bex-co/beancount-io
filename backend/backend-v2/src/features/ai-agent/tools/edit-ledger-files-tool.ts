import { tool } from "ai";
import { z } from "zod";
import { logger } from "@/shared/logger";
import type { LedgerChangeFileOperation } from "@/foundation/fava/Api";
import type { ToolContext } from "./types";
import { toolOutputSchema } from "./types";
import { runToolSafely } from "../utils/run-tool";

const toolLogger = logger.child({ module: "tool:edit-ledger-files" });

export const description =
  "Create, update, replace, or delete files in a single atomic commit.\n" +
  "  create: new text file — provide plain UTF-8 text content (NOT base64).\n" +
  "  update: str_replace on a text file — old_string must appear exactly once.\n" +
  "  replace: overwrite entire text file — provide plain UTF-8 text content (NOT base64).\n" +
  "  delete: remove a file.";

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
  z.object({
    dry_run: z.boolean(),
    count: z.number().int(),
    operations: z.array(z.object({ operation: z.string(), path: z.string() })),
  }),
);
export type EditLedgerFilesOutput = z.infer<typeof editLedgerFilesOutputSchema>;
type EditLedgerFilesResult = {
  dry_run: boolean;
  count: number;
  operations: { operation: string; path: string }[];
};

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
      const pathsToFetch = [
        ...new Set(
          files
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
      for (const f of files) {
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
        return {
          dry_run: true,
          count: operations.length,
          operations: ops,
        };
      }

      await services.ledgerRepo.changeFiles({
        ledgerId,
        identity,
        operations,
        message: `AI edit: ${description}`,
      });

      toolLogger.info("File operations committed", {
        userId: identity.userId,
        fileCount: files.length,
      });
      return {
        dry_run: false,
        count: operations.length,
        operations: ops,
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
