import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { ledgerPathSchema, ledgerIdOf } from "./schemas";

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
export const collaboratorResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export const collaboratorListQuery = z
  .object({
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(10),
  })
  .strict();
export const collaboratorPermissionQuery = z
  .object({ collaborator: z.string() })
  .strict();
export const collaboratorUpdateInput = z
  .object({ collaborator: z.string(), permission: permissionSchema.nullish() })
  .strict();
export const collaboratorDeleteInput = z
  .object({ collaborator: z.string() })
  .strict();
export const collaboratorLeaveInput = z.object({}).strict();
const collaboratorPath = ledgerPathSchema.extend({ collaborator: z.string() });

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
      "Requires ledger.admin and current permission to change collaborators. Existing collaborator limits apply. An omitted or null permission uses the repository service's default.",
    params: collaboratorPath,
    body: collaboratorUpdateInput.omit({ collaborator: true }),
    responses: {
      200: json("Membership update result", collaboratorResultSchema),
    },
    handler: async ({ layers }, { identity, params, body }) =>
      layers.workflows.ledgerCollaborators.addOrUpdateCollaborator({
        identity,
        ledgerId: ledgerIdOf(params),
        collaborator: params.collaborator,
        permission: body.permission ?? undefined,
      }),
  }),
  v1Route({
    method: "delete",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/collaborators/{collaborator}",
    summary: "Delete a ledger collaborator",
    description:
      "Requires ledger.admin and current permission to change collaborators.",
    params: collaboratorPath,
    responses: {
      200: json("Membership removal result", collaboratorResultSchema),
    },
    handler: async ({ layers }, { identity, params }) =>
      layers.workflows.ledgerCollaborators.deleteCollaborator({
        identity,
        ledgerId: ledgerIdOf(params),
        collaborator: params.collaborator,
      }),
  }),
  v1Route({
    method: "post",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/leave",
    summary: "Leave a ledger",
    description:
      "Requires ledger.admin and the current leave relationship. Removes only the authenticated caller from the ledger.",
    params: ledgerPathSchema,
    body: collaboratorLeaveInput,
    responses: { 200: json("Self-removal result", collaboratorResultSchema) },
    handler: async ({ layers }, { identity, params }) =>
      layers.workflows.ledgerCollaborators.leaveLedger({
        identity,
        ledgerId: ledgerIdOf(params),
      }),
  }),
];
