import { z } from "@/shared/zod-openapi-setup";
import { NotFoundError } from "@/shared/errors";
import { resolveCommitMessage } from "@/features/ledger/utils/commit-message-alias";
import { DELETE_INCLUDE_GUARD_DESCRIPTION } from "@/features/ledger/utils/include-references";
import { assertAmountsFitEngineDecimal } from "@/features/ledger/utils/engine-decimal";
import {
  ALLOW_INVALID_NAMES,
  DRY_RUN_NAMES,
  resolveFlagAlias,
} from "@/features/ledger/utils/flag-alias";
import { gateFileWrite } from "@/features/ledger/utils/file-write-gate";
import { PREVIEW_FLAG_DESCRIPTION } from "@/features/ledger/utils/preview-flag-description";
import { ledgerIdOf, ledgerPathSchema } from "./schemas";
import { json } from "@/server/rest/v1-schemas";
import { v1Route } from "@/server/rest/v1-route";

const filePathSchema = ledgerPathSchema.extend({
  path: z.string().min(1).openapi({
    description:
      "Path of the file within the ledger repository. May contain slashes.",
    example: "2026/january.bean",
  }),
});

const listQuerySchema = z
  .object({
    dir: z.string().optional().openapi({
      description: "Directory to list, relative to the repository root",
      example: "2026",
    }),
  })
  .strict();

const dryRunBody = {
  dryRun: z.boolean().optional().openapi({
    description: PREVIEW_FLAG_DESCRIPTION,
  }),
  // Twin (w23/m9/t002): MCP spells it dry_run.
  dry_run: z
    .boolean()
    .optional()
    .openapi({ description: "Alias of dryRun, as MCP spells it." }),
};

// File writes refuse new bean-check errors like entry writes (w23/m15);
// `allowInvalid` commits deliberately.
const allowInvalidBody = {
  allowInvalid: z.boolean().optional().openapi({
    description:
      "Commit even when the change adds bean-check errors (VALIDATION_FAILED), instead of refusing.",
  }),
  // Twin: MCP spells it allow_invalid.
  allow_invalid: z
    .boolean()
    .optional()
    .openapi({ description: "Alias of allowInvalid, as MCP spells it." }),
};

const putBodySchema = z
  .object({
    content: z.string().openapi({
      description:
        "The file's full new content, as UTF-8 text; at most 1 MiB (1,048,576 UTF-8 bytes).",
      example: "2026-01-01 open Assets:Bank:Checking USD\n",
    }),
    message: z.string().optional().openapi({
      description:
        'Commit message; "Create <path>" or "Update <path>" when omitted or empty',
      example: "Add January transactions",
    }),
    description: z.string().optional().openapi({
      description: "Alias of message, as the MCP file tools spell it.",
    }),
    sha: z.string().optional().openapi({
      description:
        "Blob SHA the edit is based on. Send the SHA from a prior GET to update an existing file; omit it to create a new one.",
    }),
    ...dryRunBody,
    ...allowInvalidBody,
  })
  .openapi("FileWrite", {
    description:
      "New content for one ledger file, at most 1 MiB of UTF-8 bytes",
  });

const deleteBodySchema = z
  .object({
    message: z.string().optional(),
    description: z.string().optional().openapi({
      description: "Alias of message, as the MCP file tools spell it.",
    }),
    sha: z.string().optional().openapi({
      description: "Blob SHA of the file being deleted, from a prior GET",
    }),
    ...dryRunBody,
    ...allowInvalidBody,
  })
  .openapi("FileDelete", { description: "Delete one ledger file" });

const dirEntrySchema = z
  .object({
    path: z.string(),
    name: z.string(),
    type: z.enum(["file", "dir"]),
    size: z.number().int().openapi({ description: "Size in bytes" }),
    sha: z.string().openapi({
      description:
        "Blob SHA: send it back as the optimistic lock of a delete or update",
    }),
    lastCommitSha: z.string().nullable().openapi({
      description: "The commit that last touched the entry, when known",
    }),
  })
  .openapi("LedgerDirEntry", {
    description: "One file or directory at a level of the repository",
  });

const commitAckSchema = z
  .object({
    ok: z.literal(true),
    path: z.string(),
    dryRun: z.boolean().openapi({
      description:
        "True when this was a preview: the checks ran and nothing was committed.",
    }),
  })
  .openapi("FileCommitAck", {
    description:
      "Acknowledgement that a file change was committed — or, on a dry run, that it would be",
  });

const fileSchema = z
  .object({
    path: z.string(),
    content: z.string(),
    sha: z.string(),
    lossy: z.literal(true).optional().openapi({
      description:
        "Present when the file is not valid UTF-8: `content` shows U+FFFD for its undecodable bytes, so writing it back would replace them.",
    }),
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
    path: "/api-gateway/v1/ledgers/{owner}/{name}/files",
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
    path: "/api-gateway/v1/ledgers/{owner}/{name}/files/{*path}",
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
    path: "/api-gateway/v1/ledgers/{owner}/{name}/files/{*path}",
    summary: "Create or replace a file",
    description:
      "Writes at most 1 MiB (1,048,576 UTF-8 bytes) and commits it. Include the `sha` from a prior GET to replace an existing file; omit it to create a new one. The complete JSON request is separately limited to 2 MiB. `dryRun` previews without committing: same checks, no commit. Like entry writes, a change that would add bean-check errors the ledger did not have is refused with VALIDATION_FAILED naming each (`dryRun` refuses it too); `allowInvalid` commits it deliberately, e.g. one step of a multi-step edit. Errors the ledger already had never block.",
    params: filePathSchema,
    body: putBodySchema,
    responses: {
      200: json("The commit succeeded", commitAckSchema),
    },
    handler: async ({ layers }, { identity, params, body }) => {
      // The whole content is new text on a create-or-replace PUT (w23/081).
      assertAmountsFitEngineDecimal(body.content);
      const dryRun = resolveFlagAlias(
        { primary: body.dry_run, legacy: body.dryRun },
        DRY_RUN_NAMES,
      );
      const write = {
        ledgerId: ledgerIdOf(params),
        identity,
        operations: [
          {
            operation: body.sha ? ("update" as const) : ("create" as const),
            path: params.path,
            content: body.content,
            ...(body.sha ? { sha: body.sha } : {}),
          },
        ],
        // An empty message is an omitted one, as the ledger service reads it
        // (w21/553); a write with no sha creates the file.
        message:
          resolveCommitMessage(body, { required: false }) ||
          `${body.sha ? "Update" : "Create"} ${params.path}`,
      };
      // The service's dry run first: authorization, path, size and create
      // conflicts refuse before the gate, and a preview ends here (below).
      await layers.services.ledgerRepo.changeFiles({ ...write, dryRun: true });
      await gateFileWrite(
        layers.services,
        identity,
        write.ledgerId,
        [{ path: params.path, content: body.content }],
        resolveFlagAlias(
          { primary: body.allow_invalid, legacy: body.allowInvalid },
          ALLOW_INVALID_NAMES,
        ),
      );
      if (!dryRun) await layers.services.ledgerRepo.changeFiles(write);
      return { ok: true as const, path: params.path, dryRun };
    },
  }),

  v1Route({
    method: "delete",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/files/{*path}",
    summary: "Delete a file",
    description:
      "Removes the file and commits the deletion. " +
      DELETE_INCLUDE_GUARD_DESCRIPTION +
      " `dryRun` previews without committing: same checks, no commit. " +
      "Like entry writes, a change that would add bean-check errors the ledger did not have is refused with VALIDATION_FAILED naming each (`dryRun` refuses it too); `allowInvalid` commits it deliberately, e.g. one step of a multi-step edit. Errors the ledger already had never block.",
    params: filePathSchema,
    body: deleteBodySchema,
    responses: {
      200: json("The deletion was committed", commitAckSchema),
    },
    handler: async ({ layers }, { identity, params, body }) => {
      const dryRun = resolveFlagAlias(
        { primary: body.dry_run, legacy: body.dryRun },
        DRY_RUN_NAMES,
      );
      const write = {
        ledgerId: ledgerIdOf(params),
        identity,
        operations: [
          {
            operation: "delete" as const,
            path: params.path,
            ...(body.sha ? { sha: body.sha } : {}),
          },
        ],
        message:
          resolveCommitMessage(body, { required: false }) ||
          `Delete ${params.path}`,
      };
      await layers.services.ledgerRepo.changeFiles({ ...write, dryRun: true });
      await gateFileWrite(
        layers.services,
        identity,
        write.ledgerId,
        [{ path: params.path, content: null }],
        resolveFlagAlias(
          { primary: body.allow_invalid, legacy: body.allowInvalid },
          ALLOW_INVALID_NAMES,
        ),
      );
      if (!dryRun) await layers.services.ledgerRepo.changeFiles(write);
      return { ok: true as const, path: params.path, dryRun };
    },
  }),
] as const;
