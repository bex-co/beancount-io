import { tool } from "ai";
import { z } from "zod";
import { logger } from "@/shared/logger";
import type { ToolContext } from "./types";
import { toolOutputSchema } from "./types";
import { runToolSafely } from "../utils/run-tool";
import { normalizeAgentRepoPath } from "./agent-repo-path";

const toolLogger = logger.child({ module: "tool:read-ledger-file" });

export const description =
  "Read one or more beancount ledger files in a single call. Returns content with 1-based line numbers. " +
  "Use start_line/end_line per file to limit tokens for large files.";

export const readLedgerFilesInputSchema = z.object({
  files: z
    .array(
      z.object({
        path: z
          .string()
          .describe("File path within the ledger repo, e.g. 'main.bean'"),
        start_line: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("First line to return (1-based). Default: 1"),
        end_line: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Last line to return (inclusive). Default: end of file"),
      }),
    )
    .min(1)
    .describe(
      "One or more files to read. Each entry may limit to a line range.",
    ),
});

const readLedgerFileSectionSchema = z.object({
  path: z.string(),
  startLine: z.number().int(),
  endLine: z.number().int(),
  totalLines: z.number().int(),
  content: z.string(),
});
type ReadLedgerFileSection = z.infer<typeof readLedgerFileSectionSchema>;

export const readLedgerFilesOutputSchema = toolOutputSchema(
  z.array(readLedgerFileSectionSchema),
);
export type ReadLedgerFilesOutput = z.infer<typeof readLedgerFilesOutputSchema>;

export async function executeReadLedgerFiles(
  ctx: Pick<ToolContext, "services" | "identity" | "ledgerId">,
  input: { files: { path: string; start_line?: number; end_line?: number }[] },
): Promise<ReadLedgerFilesOutput> {
  const { services, identity, ledgerId } = ctx;
  toolLogger.debug("Reading ledger files", { count: input.files.length });
  return runToolSafely({
    logger: toolLogger,
    message: "Failed to read files",
    execute: async (): Promise<ReadLedgerFileSection[]> => {
      const requestedFiles = input.files.map((file) => ({
        ...file,
        path: normalizeAgentRepoPath(file.path),
      }));
      const files = await services.ledgerRepo.getFilesContent({
        ledgerId,
        identity,
        paths: requestedFiles.map((file) => file.path),
      });
      const contentMap = new Map(files.map((f) => [f.path, f.content]));

      const sections: ReadLedgerFileSection[] = [];

      for (const { path, start_line, end_line } of requestedFiles) {
        const raw = contentMap.get(path);
        if (raw === undefined) {
          throw new Error(`file not found: ${path}`);
        }
        const lines = raw.split("\n");
        const s = (start_line ?? 1) - 1;
        const e = end_line ?? lines.length;
        const slice = lines.slice(s, e);
        sections.push({
          path,
          startLine: s + 1,
          endLine: s + slice.length,
          totalLines: lines.length,
          content: slice.join("\n"),
        });
      }

      return sections;
    },
  });
}

export function createReadLedgerFilesTool(ctx: ToolContext) {
  return tool({
    description,
    inputSchema: readLedgerFilesInputSchema,
    outputSchema: readLedgerFilesOutputSchema,
    execute: (input) =>
      executeReadLedgerFiles(
        {
          services: ctx.services,
          identity: ctx.identity,
          ledgerId: ctx.ledgerId,
        },
        input,
      ),
  });
}
