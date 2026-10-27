import { z } from "@/shared/zod-openapi-setup";
import { HOST_PAGE_MAX } from "@/shared/host-page";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { ledgerPathSchema, ledgerIdOf } from "./schemas";
import {
  DRY_RUN_NAMES,
  resolveFlagAlias,
} from "@/features/ledger/utils/flag-alias";
import { PREVIEW_FLAG_DESCRIPTION } from "@/features/ledger/utils/preview-flag-description";

/**
 * REST null tolerance: an explicit null on an optional field means the
 * same as omitting it, normalized once here so every field spells it alike.
 */
const nullToUndefined = <Schema extends z.ZodTypeAny>(schema: Schema) =>
  schema.nullish().transform((value) => value ?? undefined);

/** The m7 preview flag twins, spread into each collaborator mutation input. */
const dryRunBody = {
  dryRun: nullToUndefined(z.boolean()).optional().openapi({
    description: PREVIEW_FLAG_DESCRIPTION,
  }),
  // Twin (w23/m9/t002): MCP spells it dry_run.
  dry_run: nullToUndefined(z.boolean()).optional().openapi({
    description: "Alias of dryRun, as MCP spells it.",
  }),
};

const userSchema = z.object({
  id: z.number().optional(),
  login: z.string().optional(),
  fullName: z.string().optional(),
  email: z.string().optional(),
  active: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  created: z.string().optional(),
  lastLogin: z.string().optional(),
});
const permissionSchema = z.enum(["read", "write", "admin"]);
const collaboratorListSchema = z.array(
  userSchema.extend({ permission: permissionSchema.optional() }),
);
const collaboratorPermissionSchema = z.object({
  permission: z.string().optional(),
  roleName: z.string().optional(),
  user: userSchema.optional(),
});
const collaboratorPreviewSchema = z
  .object({
    collaborator: z.string().openapi({
      description: "Whose access would change.",
    }),
    current: permissionSchema.nullable().openapi({
      description:
        "Their current access, null when no grant could be confirmed.",
    }),
    requested: permissionSchema.nullable().openapi({
      description:
        "The access the call asks for, null for removals and the repository default.",
    }),
    warnings: z.array(z.string()).openapi({
      description: "What would happen, in plain words.",
    }),
  })
  .openapi("CollaboratorPreview", {
    description:
      "The would-be access change a collaborator mutation preview renders; present only on previews.",
  });
export const collaboratorResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  dryRun: z.boolean().optional().openapi({
    description:
      "True when this is a collaborator mutation preview: the checks ran and nothing changed. Commits echo false.",
  }),
  preview: collaboratorPreviewSchema.optional().openapi({
    description:
      "The rendered would-be access change; present only on previews.",
  }),
});
export const collaboratorListQuery = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(HOST_PAGE_MAX).default(10),
  })
  .strict();
const collaboratorName = z.string().min(1);
export const collaboratorPermissionQuery = z
  .object({ collaborator: collaboratorName })
  .strict();
export const collaboratorUpdateInput = z
  .object({
    collaborator: collaboratorName,
    permission: permissionSchema.nullish(),
    ...dryRunBody,
  })
  .strict();
export const collaboratorDeleteInput = z
  .object({ collaborator: collaboratorName, ...dryRunBody })
  .strict();
export const collaboratorLeaveInput = z.object({ ...dryRunBody }).strict();
const collaboratorPath = ledgerPathSchema.extend({
  collaborator: collaboratorName,
});

export const COLLABORATOR_ROUTES = [
  v1Route({
    method: "get",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/collaborators",
    summary: "List ledger collaborators",
    description:
      "Requires ledger.admin and current permission to inspect collaborators. Defaults to page 1 and limit 10.",
    params: ledgerPathSchema,
    query: collaboratorListQuery,
    responses: {
      200: json("Collaborators with their permissions", collaboratorListSchema),
    },
    handler: async ({ layers }, { identity, params, query }) =>
      layers.workflows.ledgerCollaborators.listCollaborators({
        identity,
        ledgerId: ledgerIdOf(params),
        ...query,
      }),
  }),
  v1Route({
    method: "get",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/collaborators/permission",
    summary: "Read a ledger collaborator's permission",
    description:
      "Requires ledger.admin and current permission to inspect collaborators.",
    params: ledgerPathSchema,
    query: collaboratorPermissionQuery,
    responses: {
      200: json(
        "Collaborator permission and user",
        collaboratorPermissionSchema,
      ),
    },
    handler: async ({ layers }, { identity, params, query }) =>
      layers.workflows.ledgerCollaborators.getCollaboratorPermission({
        identity,
        ledgerId: ledgerIdOf(params),
        ...query,
      }),
  }),
  v1Route({
    method: "put",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/collaborators/{collaborator}",
    summary: "Add or update a ledger collaborator",
    description:
      "Requires ledger.admin and current permission to change collaborators. Existing collaborator limits apply. An omitted or null permission uses the repository service's default. Pass dryRun to preview the would-be grant without granting anything.",
    params: collaboratorPath,
    body: collaboratorUpdateInput.omit({ collaborator: true }),
    responses: {
      200: json("Membership update result", collaboratorResultSchema),
    },
    handler: async ({ layers }, { identity, params, body }) => {
      // The workflow sees its own contract only: the twins fold into dryRun
      // and the alias key is dropped (w23/m9/t002).
      const { dry_run, dryRun, ...rest } = body;
      return layers.workflows.ledgerCollaborators.addOrUpdateCollaborator({
        identity,
        ledgerId: ledgerIdOf(params),
        collaborator: params.collaborator,
        permission: rest.permission ?? undefined,
        input: {
          dryRun: resolveFlagAlias(
            { primary: dry_run, legacy: dryRun },
            DRY_RUN_NAMES,
          ),
        },
      });
    },
  }),
  v1Route({
    method: "delete",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/collaborators/{collaborator}",
    summary: "Delete a ledger collaborator",
    description:
      "Requires ledger.admin and current permission to change collaborators. Pass dryRun to preview the would-be revocation without revoking anything.",
    params: collaboratorPath,
    body: collaboratorDeleteInput.omit({ collaborator: true }),
    responses: {
      200: json("Membership removal result", collaboratorResultSchema),
    },
    handler: async ({ layers }, { identity, params, body }) => {
      // The workflow sees its own contract only: the twins fold into dryRun
      // and the alias key is dropped (w23/m9/t002).
      const { dry_run, dryRun } = body;
      return layers.workflows.ledgerCollaborators.deleteCollaborator({
        identity,
        ledgerId: ledgerIdOf(params),
        collaborator: params.collaborator,
        input: {
          dryRun: resolveFlagAlias(
            { primary: dry_run, legacy: dryRun },
            DRY_RUN_NAMES,
          ),
        },
      });
    },
  }),
  v1Route({
    method: "post",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/leave",
    summary: "Leave a ledger",
    description:
      "Requires ledger.admin and the current leave relationship. Removes only the authenticated caller from the ledger. Pass dryRun to preview the would-be self-removal without leaving.",
    params: ledgerPathSchema,
    body: collaboratorLeaveInput,
    responses: { 200: json("Self-removal result", collaboratorResultSchema) },
    handler: async ({ layers }, { identity, params, body }) => {
      // The workflow sees its own contract only: the twins fold into dryRun
      // and the alias key is dropped (w23/m9/t002).
      const { dry_run, dryRun } = body;
      return layers.workflows.ledgerCollaborators.leaveLedger({
        identity,
        ledgerId: ledgerIdOf(params),
        input: {
          dryRun: resolveFlagAlias(
            { primary: dry_run, legacy: dryRun },
            DRY_RUN_NAMES,
          ),
        },
      });
    },
  }),
];
