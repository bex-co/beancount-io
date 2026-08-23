import { z } from "@/shared/zod-openapi-setup";
import { NotFoundError } from "@/shared/errors";
import { json, ledgerIdOf, ledgerPathSchema } from "./schemas";
import { v1Route } from "./route";

const filePathSchema = ledgerPathSchema.extend({
  path: z.string().min(1).openapi({
    description:
      "Path of the file within the ledger repository. May contain slashes.",
    example: "2026/january.bean",
  }),
});

const listQuerySchema = z.object({
  dir: z.string().optional().openapi({
    description: "Directory to list, relative to the repository root",
    example: "2026",
  }),
});

const putBodySchema = z
  .object({
    content: z.string().openapi({
      description: "The file's full new content, as UTF-8 text",
      example: "2026-01-01 open Assets:Bank:Checking USD\n",
    }),
    message: z.string().min(1).optional().openapi({
      description: "Commit message; defaults to a generated one",
      example: "Add January transactions",
    }),
    sha: z.string().optional().openapi({
      description:
        "Blob SHA the edit is based on. Send the SHA from a prior GET to update an existing file; omit it to create a new one.",
    }),
  })
  .openapi("FileWrite", { description: "New content for one ledger file" });

const deleteBodySchema = z
  .object({
    message: z.string().min(1).optional(),
    sha: z.string().optional().openapi({
      description: "Blob SHA of the file being deleted, from a prior GET",
    }),
  })
  .openapi("FileDelete", { description: "Delete one ledger file" });

const dirEntrySchema = z
  .object({
    path: z.string(),
    name: z.string(),
    type: z.enum(["file", "dir"]),
  })
  .openapi("LedgerDirEntry", {
    description: "One file or directory at a level of the repository",
  });

const commitAckSchema = z
  .object({ ok: z.literal(true), path: z.string() })
  .openapi("FileCommitAck", {
    description: "Acknowledgement that a file change was committed",
  });

const fileSchema = z
  .object({
    path: z.string(),
    content: z.string(),
    sha: z.string(),
  })
  .openapi("LedgerFile", { description: "One ledger file and its blob SHA" });

/**
 * The file surface: list a directory, read a file, write one, delete one.
 *
 * A ledger *is* its files — plain text under git — so this is the endpoint
 * family that makes v1 more than a reporting API. All four go through
 * `LedgerRepoService`, which is the same implementation the MCP file tools use
 * (w1/m19 moved them onto it); the GraphQL twins still reach Fava their own
 * way, which is a convergence the op table records honestly rather than a gap
 * this milestone can close.
 *
 * Writes commit through the git proxy's own path, so the free-tier directive
 * limit that w1/m17 moved into the proxy applies here too — it is enforced once,
 * where the commit lands, not re-implemented per surface.
 */
export const FILE_ROUTES = [
  v1Route({
    method: "get",
    path: "/v1/ledgers/{owner}/{name}/files",
    summary: "List files and directories",
    description:
      "One directory level, directories first then files by name. Pass `dir` to descend; omit it for the repository root.",
    params: ledgerPathSchema,
    query: listQuerySchema,
    responses: {
      200: json("Directory contents", z.array(dirEntrySchema)),
    },
    handler: async ({ layers }, { identity, params, query }) =>
      layers.services.ledgerRepo.listDirContent({
        ledgerId: ledgerIdOf(params),
        identity,
        dirPath: query.dir,
      }),
  }),

  v1Route({
    method: "get",
    path: "/v1/ledgers/{owner}/{name}/files/{*path}",
    summary: "Read a file",
    description:
      "The file's content as UTF-8 text, with the blob SHA to pass back when updating it.",
    params: filePathSchema,
    responses: {
      200: json("The file", fileSchema),
    },
    handler: async ({ layers }, { identity, params }) => {
      const files = await layers.services.ledgerRepo.getFilesContent({
        ledgerId: ledgerIdOf(params),
        identity,
        paths: [params.path],
      });
      const file = files[0];
      if (!file) throw new NotFoundError("File", params.path);
      return file;
    },
  }),

  v1Route({
    method: "put",
    path: "/v1/ledgers/{owner}/{name}/files/{*path}",
    summary: "Create or replace a file",
    description:
      "Writes the file and commits it. Include the `sha` from a prior GET to replace an existing file; omit it to create a new one.",
    params: filePathSchema,
    body: putBodySchema,
    responses: {
      200: json("The commit succeeded", commitAckSchema),
    },
    handler: async ({ layers }, { identity, params, body }) => {
      await layers.services.ledgerRepo.changeFiles({
        ledgerId: ledgerIdOf(params),
        identity,
        operations: [
          {
            operation: body.sha ? "update" : "create",
            path: params.path,
            content: body.content,
            ...(body.sha ? { sha: body.sha } : {}),
          },
        ],
        message: body.message ?? `Update ${params.path}`,
      });
      return { ok: true as const, path: params.path };
    },
  }),

  v1Route({
    method: "delete",
    path: "/v1/ledgers/{owner}/{name}/files/{*path}",
    summary: "Delete a file",
    description: "Removes the file and commits the deletion.",
    params: filePathSchema,
    body: deleteBodySchema,
    responses: {
      200: json("The deletion was committed", commitAckSchema),
    },
    handler: async ({ layers }, { identity, params, body }) => {
      await layers.services.ledgerRepo.changeFiles({
        ledgerId: ledgerIdOf(params),
        identity,
        operations: [
          {
            operation: "delete",
            path: params.path,
            ...(body.sha ? { sha: body.sha } : {}),
          },
        ],
        message: body.message ?? `Delete ${params.path}`,
      });
      return { ok: true as const, path: params.path };
    },
  }),
] as const;
