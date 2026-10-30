import { requestPlatform } from "@/server/api/request-platform";
import { z } from "@/shared/zod-openapi-setup";
import {
  LEDGER_DESCRIPTION_MAX,
  LedgerTemplate,
} from "@/features/ledger/workflow/ledger-workflow.types";
import { setupCatalog, type PresetId } from "@/features/ledger/setup";
import {
  CREATE_REQUEST_ID_MAX,
  SETUP_TITLE_MAX,
} from "@/features/ledger/setup/build-ledger";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { ledgerPathSchema, ledgerIdOf, dryRunBody } from "./schemas";
import { withResolvedPreview } from "@/features/ledger/utils/flag-alias";
import {
  NEW_LEDGER_NAME_PATTERN,
  newLedgerNameRule,
} from "@/shared/ledger-slug";
const name = z
  .string()
  .max(100)
  .regex(NEW_LEDGER_NAME_PATTERN, {
    error: (issue) => newLedgerNameRule(String(issue.input)),
  })
  // The schema carries the length; the pattern, the exact rule (w23/064).
  .describe(
    "Lowercase letters, numbers, and underscores, joined by single hyphens.",
  );
const description = z
  .string()
  .max(
    LEDGER_DESCRIPTION_MAX,
    `A ledger description can be at most ${LEDGER_DESCRIPTION_MAX} characters`,
  )
  .nullish()
  .describe(
    `A short description shown with the ledger, up to ${LEDGER_DESCRIPTION_MAX} characters.`,
  );
const ledgerSetupInput = z
  .object({
    preset: z
      .enum(
        setupCatalog.presets.map((preset) => preset.id) as [
          PresetId,
          ...PresetId[],
        ],
      )
      .describe("Setup preset id (ADR021)."),
    title: z.string().max(SETUP_TITLE_MAX).optional(),
    operatingCurrency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    historyStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    capabilities: z
      .record(z.string(), z.enum(["enabled", "declined", "deferred"]))
      .optional(),
    accounts: z
      .array(
        z
          .object({
            name: z.string(),
            currency: z
              .string()
              .regex(/^[A-Z]{3}$/)
              .optional(),
            openingState: z.enum(["unknown", "zero", "known"]).optional(),
            amount: z
              .string()
              .regex(/^[+-]?\d+(\.\d+)?$/)
              .optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();
export const ledgerCreateInput = z
  .object({
    name,
    description,
    private: z
      .boolean()
      .nullish()
      .describe(
        "true or omitted keeps the ledger visible only to its owner and collaborators; false makes it public, readable by anyone.",
      ),
    template: z
      .nativeEnum(LedgerTemplate)
      .nullish()
      .describe(
        "STARTER (the default) has options and accounts without transactions; SAMPLE has demonstration transactions.",
      ),
    setup: ledgerSetupInput.nullish(),
    requestId: z.string().min(1).max(CREATE_REQUEST_ID_MAX).nullish(),
  })
  .strict();
export const ledgerPreviewInput = z
  .object({ setup: ledgerSetupInput })
  .strict();
export const ledgerPreviewResultSchema = z.object({
  preset: z.string(),
  operatingCurrency: z.string(),
  historyStart: z.string(),
  accounts: z.array(z.string()),
  files: z.record(z.string(), z.string()),
  validation: z.object({
    ok: z.boolean(),
    errors: z.array(
      z.object({ message: z.string(), source: z.string().optional() }),
    ),
  }),
});
export const ledgerUpdateInput = z
  .object({
    name: name.nullish(),
    description,
    private: z
      .boolean()
      .nullish()
      .describe(
        "true makes the ledger visible only to its owner and collaborators; false makes it public, readable by anyone; omitted leaves it as it is.",
      ),
    ...dryRunBody,
  })
  .strict();
export const ledgerDeleteInput = z
  .object({
    ...dryRunBody,
  })
  .strict();
const ledgerDeletePreviewSchema = z
  .object({
    ledgerId: z.string().openapi({
      description: "The ledger that would be destroyed.",
    }),
    name: z.string().openapi({ description: "Its current name." }),
    description: z.string().nullable().openapi({
      description: "Its current description, null when unset.",
    }),
    private: z.boolean().openapi({ description: "Its current visibility." }),
    empty: z.boolean().openapi({
      description: "Whether it holds any content.",
    }),
    size: z.number().openapi({ description: "Its current size in bytes." }),
    warnings: z.array(z.string()).openapi({
      description:
        "What makes the irreversibility unmissable: permanent deletion and linked-bank cleanup.",
    }),
  })
  .openapi("LedgerDeletePreview", {
    description:
      "The destroy summary a deleteLedger preview renders; present only on previews.",
  });
export const ledgerDeleteResultSchema = z.object({
  ledgerId: z.string(),
  dryRun: z.boolean().optional().openapi({
    description:
      "True when this is a deleteLedger preview: the checks ran and nothing was destroyed. Commits echo false.",
  }),
  preview: ledgerDeletePreviewSchema.optional().openapi({
    description:
      "The destroy summary; present only on deleteLedger previews.",
  }),
});
const ledgerUpdatePreviewSchema = z
  .object({
    name: z
      .object({ from: z.string(), to: z.string() })
      .optional()
      .openapi({ description: "Current and new name, when renaming." }),
    description: z
      .object({ from: z.string().nullable(), to: z.string() })
      .optional()
      .openapi({ description: "Current and new description, when changing it." }),
    private: z
      .object({ from: z.boolean(), to: z.boolean() })
      .optional()
      .openapi({ description: "Current and new visibility, when changing it." }),
    warnings: z.array(z.string()).openapi({
      description:
        "What deserves a second look — a rename's URL change, a flip to public.",
    }),
  })
  .openapi("LedgerUpdatePreview", {
    description:
      "The current→new diff an updateLedger preview renders; only provided fields appear.",
  });
export const ledgerResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  fullName: z.string(),
  sshUrl: z.string(),
  httpUrl: z.string(),
  empty: z.boolean(),
  private: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  size: z.number(),
  description: z.string().nullish(),
  permissions: z
    .object({ admin: z.boolean(), pull: z.boolean(), push: z.boolean() })
    .optional(),
  isStarred: z.boolean().optional(),
  dryRun: z.boolean().optional().openapi({
    description:
      "True when this is an updateLedger preview: the checks ran and nothing was committed. Reads and creates omit it.",
  }),
  preview: ledgerUpdatePreviewSchema.optional().openapi({
    description:
      "The rendered current→new diff; present only on updateLedger previews.",
  }),
});
export const LEDGER_LIFECYCLE_ROUTES = [
  v1Route({
    method: "post",
    path: "/api-gateway/v1/ledgers",
    operationId: "createLedger",
    summary: "Create a ledger",
    description:
      "Create a ledger for the authenticated user under existing administrative account authority and tier limits. STARTER (the default, including null) contains options and accounts without transactions or opening balances; SAMPLE contains demonstration transactions. Existing ledgers are unchanged. Refused with FORBIDDEN for a ledger-pinned credential: a created ledger would land outside the pin, where the creating credential could never see, use, or delete it.",
    body: ledgerCreateInput,
    responses: { 200: json("Created ledger", ledgerResultSchema) },
    handler: async ({ layers }, { identity, body, ctx }) =>
      layers.workflows.ledger.createLedger({
        identity,
        input: body,
        platform: requestPlatform(ctx.headers),
      }),
  }),
  v1Route({
    method: "post",
    path: "/api-gateway/v1/ledgers/preview",
    operationId: "previewLedgerSetup",
    summary: "Preview a ledger setup without creating it",
    description:
      "Return the files, account list, and validation result a setup specification (ADR021) would create, without creating anything. Uses the same LEDGER_CREATE authority as creation.",
    body: ledgerPreviewInput,
    responses: {
      200: json("Setup preview", ledgerPreviewResultSchema),
    },
    handler: async ({ layers }, { identity, body }) =>
      layers.workflows.ledger.previewLedgerSetup({
        identity,
        setup: body.setup,
      }),
  }),
  v1Route({
    method: "put",
    path: "/api-gateway/v1/ledgers/{owner}/{name}",
    operationId: "updateLedger",
    summary: "Update a ledger",
    description:
      "Update ledger name, description, or visibility. Requires current administrative authority over the addressed ledger and respects the credential pin. Pass dryRun to preview the current→new diff without committing.",
    params: ledgerPathSchema,
    body: ledgerUpdateInput,
    responses: { 200: json("Updated ledger", ledgerResultSchema) },
    handler: async ({ layers }, { identity, params, body }) => {
      return layers.workflows.ledger.updateLedger({
        identity,
        ledgerId: ledgerIdOf(params),
        input: withResolvedPreview(body),
      });
    },
  }),
  v1Route({
    method: "delete",
    path: "/api-gateway/v1/ledgers/{owner}/{name}",
    operationId: "deleteLedger",
    summary: "Delete a ledger",
    description:
      "Delete the repository and perform the existing linked-bank cleanup. Requires current administrative authority and respects the credential pin. Pass dryRun to preview the destroy summary without destroying anything.",
    params: ledgerPathSchema,
    body: ledgerDeleteInput,
    responses: {
      200: json("Deleted ledger identifier", ledgerDeleteResultSchema),
    },
    handler: async ({ layers }, { identity, params, body }) => {
      return layers.workflows.ledger.deleteLedger({
        identity,
        ledgerId: ledgerIdOf(params),
        input: withResolvedPreview(body),
      });
    },
  }),
];
