import { z } from "@/shared/zod-openapi-setup";
import type { ICommitsService } from "../service/commits-service";
import type { ILedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import type { Identity } from "@/server/api/identity";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import {
  ledgerPathSchema,
  ledgerIdOf,
} from "@/features/ledger/api/rest/v1/schemas";

type Params = {
  identity: Identity;
  ledgerId: string;
  query: {
    branchName?: string;
    branch?: string;
    page?: number;
    limit?: number;
    sha?: string;
  };
};
type Services = { commits: ICommitsService; ledgerRepo: ILedgerRepoService };

export const COMMIT_READS = [
  {
    name: "latestLedgerCommit",
    segment: "latest-commit",
    summary: "Read the latest commit on a ledger branch",
    query: z.object({ branchName: z.string().default("main") }),
    fetch: (services: Services, { identity, ledgerId, query }: Params) =>
      services.ledgerRepo.getLatestCommit({
        identity,
        ledgerId,
        branchName: query.branchName,
      }),
  },
  {
    name: "ledgerCommits",
    segment: "commits",
    summary: "List commits with branch and pagination controls",
    query: z.object({
      branch: z.string().default("main"),
      page: z.coerce.number().int().default(1),
      limit: z.coerce.number().int().default(30),
    }),
    fetch: (services: Services, { identity, ledgerId, query }: Params) =>
      services.commits.listCommits({
        identity,
        ledgerId,
        branch: query.branch,
        page: query.page,
        limit: query.limit,
      }),
  },
  {
    name: "ledgerCommitDetails",
    segment: "commit-details",
    summary: "Read commit metadata, parents, file statistics, and unified diff",
    query: z.object({ sha: z.string() }),
    fetch: (services: Services, { identity, ledgerId, query }: Params) =>
      services.commits.getCommitDetails({
        identity,
        ledgerId,
        sha: query.sha ?? "",
      }),
  },
] as const;

export const COMMIT_ROUTES = COMMIT_READS.map((read) =>
  v1Route<z.infer<typeof ledgerPathSchema>, Params["query"], unknown>({
    method: "get",
    path: `/api-gateway/v1/ledgers/{owner}/{name}/${read.segment}`,
    summary: read.summary,
    description: read.summary,
    params: ledgerPathSchema,
    query: read.query,
    responses: { 200: json(read.summary) },
    handler: async ({ layers }, { identity, params, query, ctx }) => {
      const result = await read.fetch(layers.services, {
        identity,
        ledgerId: ledgerIdOf(params),
        query,
      });
      if (result === null) {
        // An empty repository has a successful JSON null result, not a 204.
        ctx.type = "application/json";
        ctx.body = "null";
        ctx.status = 200;
        return;
      }
      return result;
    },
  }),
);
