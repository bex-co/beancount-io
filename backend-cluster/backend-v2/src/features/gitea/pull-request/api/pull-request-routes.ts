import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { ledgerPathSchema } from "@/features/ledger/api/rest/v1/schemas";
export const pullRequestCreateInput = z
  .object({
    title: z.string().min(1, "title must not be empty"),
    description: z
      .string()
      .min(1, "description must not be empty — describe what the pull request changes and why"),
    baseBranch: z.string().default("main"),
    clearCommitMessage: z
      .string()
      .min(
        1,
        "clearCommitMessage must not be empty — it becomes the commit message for the pull request branch",
      ),
    fastForward: z
      .boolean()
      .nullish()
      .describe(
        "Skip the diff-less verification and open the pull request even when the branch does not differ from base",
      ),
    changes: z.array(
      z.object({ path: z.string(), content: z.string() }).strict(),
    ),
  })
  .strict();
export const pullRequestNumberQuery = z
  .object({ prNumber: z.coerce.number().int() })
  .strict();
export const pullRequestResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  prNumber: z.number().int().optional(),
  prUrl: z.string().optional(),
  baseBranch: z
    .string()
    .optional()
    .describe("The created PR's actual base ref, read back — never a default"),
  headBranch: z
    .string()
    .optional()
    .describe("The created PR's actual head ref, read back — never a default"),
});
const pullRequestDetailsSchema = z.object({
  number: z.number().int(),
  title: z.string(),
  description: z.string(),
  state: z.string(),
  author: z.string(),
  headBranch: z.string(),
  baseBranch: z.string(),
  files: z.array(
    z.object({
      filename: z.string(),
      additions: z.number().int(),
      deletions: z.number().int(),
      changes: z.number().int(),
    }),
  ),
  diff: z.string().optional(),
});
const path = ledgerPathSchema.extend({ prNumber: z.coerce.number().int() });
export const PULL_REQUEST_ROUTES = [
  v1Route({
    method: "get",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/pull-requests/{prNumber}",
    summary: "Inspect a pull request",
    description:
      "Read metadata, file statistics, and diff under the current repository read permission.",
    params: path,
    responses: { 200: json("Pull request details", pullRequestDetailsSchema) },
    handler: async ({ layers }, { identity, params }) =>
      layers.workflows.pullRequest.getPullRequestDetails(
        params.owner,
        params.name,
        params.prNumber,
        identity,
      ),
  }),
  v1Route({
    method: "post",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/pull-requests",
    summary: "Create a pull request from file changes",
    description:
      "Create a branch from baseBranch (default main — say so when the target is not main), apply complete file contents under clearCommitMessage, verify the branch differs from base unless fastForward skips verification, and open a pull request using the existing workflow. Empty title/description and a missing commit message are refused.",
    params: ledgerPathSchema,
    body: pullRequestCreateInput,
    responses: { 200: json("Creation result", pullRequestResultSchema) },
    handler: async ({ layers }, { identity, params, body }) =>
      layers.workflows.pullRequest.createPullRequestFromPatch(
        {
          ledgerOwner: params.owner,
          ledgerName: params.name,
          ...body,
          fastForward: body.fastForward ?? undefined,
        },
        identity,
      ),
  }),
  ...(["approve", "reject"] as const).map((operation) =>
    v1Route({
      method: "post",
      path: `/api-gateway/v1/ledgers/{owner}/{name}/pull-requests/{prNumber}/${operation}`,
      summary:
        operation === "approve"
          ? "Merge a pull request"
          : "Close a pull request",
      description:
        "Applies immediately using current repository write authority. Repository failures retain the GraphQL success/message result.",
      params: path,
      body: z.object({}).strict(),
      responses: { 200: json("Review result", pullRequestResultSchema) },
      handler: async ({ layers }, { identity, params }) =>
        operation === "approve"
          ? layers.workflows.pullRequest.approvePullRequest(
              params.owner,
              params.name,
              params.prNumber,
              identity,
            )
          : layers.workflows.pullRequest.rejectPullRequest(
              params.owner,
              params.name,
              params.prNumber,
              identity,
            ),
    }),
  ),
];
