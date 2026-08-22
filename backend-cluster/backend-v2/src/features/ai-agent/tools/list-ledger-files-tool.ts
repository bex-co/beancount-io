import { tool } from "ai";
import { z } from "zod";
import { logger } from "@/shared/logger";
import type { ToolContext } from "./types";
import { toolOutputSchema } from "./types";
import { runToolSafely } from "../utils/run-tool";

const toolLogger = logger.child({ module: "tool:list-ledger-files" });

export const description =
  "List files and directories in the ledger repo. Use to discover structure before reading or editing.";

export const listLedgerFilesInputSchema = z.object({
  dir_path: z
    .string()
    .optional()
    .describe("Directory path to list. Omit for root."),
});

export const listLedgerFilesOutputSchema = toolOutputSchema(
  z.array(z.object({ path: z.string(), type: z.enum(["file", "dir"]) })),
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
        dirPath: input.dir_path,
      });
      return entries.map((e) => ({ path: e.path, type: e.type }));
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
        { services: ctx.services, identity: ctx.identity, ledgerId: ctx.ledgerId },
        input,
      ),
  });
}
