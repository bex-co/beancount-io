import { tool } from "ai";
import { z } from "zod";
import { logger } from "@/shared/logger";
import type { ToolContext } from "./types";
import { toolOutputSchema } from "./types";
import { runToolSafely } from "../utils/run-tool";
import { normalizeAgentDirPath } from "./agent-repo-path";

const toolLogger = logger.child({ module: "tool:list-ledger-files" });

export const description =
  "List files and directories in the ledger repo, one directory level at a time, directories first.";

export const listLedgerFilesInputSchema = z.object({
  dir_path: z
    .string()
    .optional()
    .describe(
      "Directory to list; omit or '.' for root. A trailing '/' is fine.",
    ),
});

export const listLedgerFilesOutputSchema = toolOutputSchema(
  z.array(
    z.object({
      path: z.string(),
      name: z.string(),
      type: z.enum(["file", "dir"]),
      size: z.number(),
      sha: z.string(),
      lastCommitSha: z.string().nullable(),
    }),
  ),
);
export type ListLedgerFilesOutput = z.infer<typeof listLedgerFilesOutputSchema>;

export async function executeListLedgerFiles(
  ctx: Pick<ToolContext, "services" | "identity" | "ledgerId">,
  input: { dir_path?: string },
): Promise<ListLedgerFilesOutput> {
  const { services, identity, ledgerId } = ctx;
  toolLogger.debug("Listing ledger files", { dir_path: input.dir_path });
  return runToolSafely({
    logger: toolLogger,
    message: "Failed to list files",
    context: { dir_path: input.dir_path },
    execute: async () => {
      const entries = await services.ledgerRepo.listDirContent({
        ledgerId,
        identity,
        dirPath: normalizeAgentDirPath(input.dir_path),
      });
      // Everything the listing knows, as REST and GraphQL return it: sha is
      // the lock of a delete or update (w21/200).
      return entries.map((e) => ({
        path: e.path,
        name: e.name,
        type: e.type,
        size: e.size,
        sha: e.sha,
        lastCommitSha: e.lastCommitSha,
      }));
    },
  });
}

export function createListLedgerFilesTool(ctx: ToolContext) {
  return tool({
    description,
    inputSchema: listLedgerFilesInputSchema,
    outputSchema: listLedgerFilesOutputSchema,
    execute: (input) =>
      executeListLedgerFiles(
        {
          services: ctx.services,
          identity: ctx.identity,
          ledgerId: ctx.ledgerId,
        },
        input,
      ),
  });
}
