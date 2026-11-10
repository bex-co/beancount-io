import "reflect-metadata";
import { graphql, type GraphQLSchema } from "graphql";
import { buildSchema } from "type-graphql";
import { LedgerRepoQueryResolver } from "../ledger-repo-resolver.query";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { AuthorizationService } from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { UnauthenticatedError } from "@/shared/errors";

/**
 * w1/223. `listCommits` and `getCommitDetails` answer anonymously on a public
 * ledger (w3/497), but `getLatestLedgerCommit` carried `@Authenticated()` and
 * refused before the repository-read check that admits such a visitor. Run
 * through the real decorators, scope gate and authorization service.
 */
const PUBLIC_LEDGER = "open_ledger/example";
const PRIVATE_LEDGER = "alice/private";
const MEMBER = {
  userId: "usr_member",
  method: "session" as const,
  scopes: new Set<string>(),
};

let schema: GraphQLSchema;
let resolver: LedgerRepoQueryResolver;
let repoGetAllCommits: jest.Mock;
let getPublicApiClient: jest.Mock;

beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerRepoQueryResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: false,
  });
});

beforeEach(() => {
  repoGetAllCommits = jest.fn().mockResolvedValue({
    data: {
      success: true,
      data: [{ sha: "f281c34", commit: { message: "Add example" } }],
    },
  });
  getPublicApiClient = jest.fn().mockResolvedValue({
    repo: { repoGetAllCommits },
  });
  // Public ledgers are readable by everyone, private ones by members.
  const authorization = new AuthorizationService(
    {
      check: jest.fn(
        async ({ user, object }) =>
          object === `ledger:${PUBLIC_LEDGER}` ||
          user === `user:${MEMBER.userId}`,
      ),
    },
    jest.fn(),
  );
  resolver = new LedgerRepoQueryResolver(
    new LedgerRepoService({ getPublicApiClient } as never, authorization),
  );
});

const latest = (ledgerId: string, identity?: typeof MEMBER) =>
  graphql({
    schema,
    source: `query($ledgerId: String!) { getLatestLedgerCommit(ledgerId: $ledgerId) { sha message } }`,
    variableValues: { ledgerId },
    contextValue: {
      identity,
      getCurrentIdentity: () => {
        if (!identity) throw new UnauthenticatedError();
        return identity;
      },
    },
  });

it("answers a public ledger's latest commit to an anonymous visitor", async () => {
  const result = await latest(PUBLIC_LEDGER);
  expect(result.errors).toBeUndefined();
  expect(result.data).toEqual({
    getLatestLedgerCommit: { sha: "f281c34", message: "Add example" },
  });
  expect(getPublicApiClient).toHaveBeenCalledWith(PUBLIC_LEDGER, undefined);
});

it("keeps a private ledger's latest commit from an anonymous visitor", async () => {
  const result = await latest(PRIVATE_LEDGER);
  expect(result.data).toEqual({ getLatestLedgerCommit: null });
  expect(result.errors?.[0]?.originalError).toBeInstanceOf(
    UnauthenticatedError,
  );
  expect(repoGetAllCommits).not.toHaveBeenCalled();
});

it("serves a private ledger's latest commit to a member", async () => {
  const result = await latest(PRIVATE_LEDGER, MEMBER);
  expect(result.errors).toBeUndefined();
  expect(getPublicApiClient).toHaveBeenCalledWith(
    PRIVATE_LEDGER,
    MEMBER.userId,
  );
});
