import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { isNotFound, isRedirect } from "@tanstack/react-router";
import { GraphQLError, type DocumentNode } from "graphql";
import { afterEach, describe, expect, it } from "vitest";
import {
  GetLedgerFileDocument,
  type GetLedgerFileQuery,
  GetCommitDetailsDocument,
  GetLedgerEntryContextDocument,
  GetPullRequestDetailsDocument,
  type GetCommitDetailsQuery,
  type GetLedgerEntryContextQuery,
  type GetPullRequestDetailsQuery,
} from "@/graphql/definitions";
import { loadEntryRoute } from "@/features/journal/loaders/entry-loader";
import { loadCommitRoute } from "@/features/git/commits/loaders/commit-loader";
import { loadPullRequestRoute } from "@/features/git/pull-requests/loaders/pull-request-loader";
import { fileLoader } from "@/features/ledger-editor/file-editor/loader";

const owner = "synthetic";
const name = "books";
const entryData = {
  getLedgerEntryContext: {
    __typename: "EntryContext",
    slice: '2026-10-15 * "Synthetic purchase"',
    sha256sum: "synthetic-source-sha",
    entry: { type: "Transaction", date: "2026-10-15" },
    balances_before: null,
    balances_after: null,
    managed_source: null,
    generated_from: null,
  },
} satisfies GetLedgerEntryContextQuery;
const commitData = {
  getCommitDetails: {
    __typename: "CommitDetails",
    sha: "synthetic-commit",
    message: "Synthetic change",
    diff: null,
    parents: [],
    author: {
      __typename: "CommitAuthor",
      name: "Ada",
      email: "ada@example.com",
      date: "2026-10-15T12:00:00Z",
    },
    committer: null,
    files: [],
    stats: {
      __typename: "CommitStats",
      additions: 1,
      deletions: 0,
      total: 1,
    },
  },
} satisfies GetCommitDetailsQuery;
const pullData = {
  getPullRequestDetails: {
    __typename: "PullRequestDetails",
    number: 12,
    title: "Synthetic proposal",
    description: "Review the change",
    state: "open",
    author: "Ada",
    headBranch: "proposal",
    baseBranch: "main",
    diff: null,
    files: [],
  },
} satisfies GetPullRequestDetailsQuery;

const fileData = {
  getLedgerFile: {
    __typename: "LedgerFileContent",
    name: "README.md",
    path: "README.md",
    sha: "synthetic-file-sha",
    size: 9,
    type: "file",
    encoding: "base64",
    content: "U3ludGhldGlj",
    lastCommitSha: null,
    lastAuthorDate: null,
    lastCommitterDate: null,
  },
} satisfies GetLedgerFileQuery;

interface Lookup {
  kind: string;
  document: DocumentNode;
  operation: string;
  variables: Record<string, string | number>;
  data: Record<string, unknown>;
  field: string;
  href: string;
  load: (client: ApolloClient, href: string) => Promise<void>;
}

const lookups: Lookup[] = [
  {
    // w3/629: a missing or refused file path is a 404, not an indexable 200.
    kind: "file",
    document: GetLedgerFileDocument,
    operation: "GetLedgerFile",
    variables: { ledgerId: `${owner}/${name}`, path: "README.md" },
    data: fileData,
    field: "getLedgerFile",
    href: `/ledger/${owner}/${name}/files/blob/main/README.md?time=2026`,
    load: (client, href) =>
      (fileLoader as unknown as (input: unknown) => Promise<void>)({
        context: { client },
        params: {
          ledgerOwner: owner,
          ledgerName: name,
          branch: "main",
          _splat: "README.md",
        },
        location: { href },
      }),
  },
  {
    kind: "entry",
    document: GetLedgerEntryContextDocument,
    operation: "GetLedgerEntryContext",
    variables: { ledgerId: `${owner}/${name}`, entryHash: "synthetic-entry" },
    data: entryData,
    field: "getLedgerEntryContext",
    href: `/ledger/${owner}/${name}/entry/synthetic-entry?time=2026#source`,
    load: (client, href) =>
      loadEntryRoute({
        context: { client },
        params: {
          ledgerOwner: owner,
          ledgerName: name,
          entryHash: "synthetic-entry",
        },
        location: { href },
      }),
  },
  {
    kind: "commit",
    document: GetCommitDetailsDocument,
    operation: "GetCommitDetails",
    variables: { ledgerId: `${owner}/${name}`, sha: "synthetic-commit" },
    data: commitData,
    field: "getCommitDetails",
    href: `/ledger/${owner}/${name}/commit/synthetic-commit?time=2026#diff-file-main.bean`,
    load: (client, href) =>
      loadCommitRoute({
        context: { client },
        params: {
          ledgerOwner: owner,
          ledgerName: name,
          commitSha: "synthetic-commit",
        },
        location: { href },
      }),
  },
  {
    kind: "pull request",
    document: GetPullRequestDetailsDocument,
    operation: "GetPullRequestDetails",
    variables: { ledgerOwner: owner, ledgerName: name, prNumber: 12 },
    data: pullData,
    field: "getPullRequestDetails",
    href: `/ledger/${owner}/${name}/pull/12?time=2026#diff-file-main.bean`,
    load: (client, href) =>
      loadPullRequestRoute({
        context: { client },
        params: { ledgerOwner: owner, ledgerName: name, prNumber: "12" },
        location: { href },
      }),
  },
];

const clients: ApolloClient[] = [];
afterEach(() => clients.splice(0).forEach((client) => client.stop()));

function network(
  response: { data?: Record<string, unknown>; errors?: GraphQLError[] } | Error,
) {
  const requests: Array<{ name: string; variables: Record<string, unknown> }> =
    [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            name: operation.operationName,
            variables: { ...operation.variables },
          });
          if (response instanceof Error) observer.error(response);
          else {
            observer.next(response);
            observer.complete();
          }
        }),
    ),
  });
  clients.push(client);
  return { client, requests };
}

describe.each(lookups)("$kind route lookup", (lookup) => {
  it("primes the component's exact cache entry and reuses it without another read", async () => {
    const { client, requests } = network({ data: lookup.data });
    await expect(lookup.load(client, lookup.href)).resolves.toBeUndefined();
    expect(requests).toEqual([
      { name: lookup.operation, variables: lookup.variables },
    ]);
    expect(
      client.readQuery({ query: lookup.document, variables: lookup.variables }),
    ).toEqual(lookup.data);
    await lookup.load(client, lookup.href);
    const componentRead = await client.query({
      query: lookup.document,
      variables: lookup.variables,
    });
    expect(componentRead.data).toEqual(lookup.data);
    expect(requests).toHaveLength(1);
  });

  it("turns a null entity response into not-found", async () => {
    const { client } = network({ data: { [lookup.field]: null } });
    await expect(lookup.load(client, lookup.href)).rejects.toSatisfy(
      isNotFound,
    );
  });

  it.each(["NOT_FOUND", "BAD_USER_INPUT", "FORBIDDEN"])(
    "turns a real Apollo %s response into not-found",
    async (code) => {
      const { client } = network({
        errors: [
          new GraphQLError("Synthetic denial", { extensions: { code } }),
        ],
      });
      await expect(lookup.load(client, lookup.href)).rejects.toSatisfy(
        isNotFound,
      );
    },
  );

  it("redirects an authentication failure with the full safe return URL", async () => {
    const { client } = network({
      errors: [
        new GraphQLError("Sign in", {
          extensions: { code: "UNAUTHENTICATED" },
        }),
      ],
    });
    let caught: unknown;
    try {
      await lookup.load(client, lookup.href);
    } catch (error) {
      caught = error;
    }
    expect(isRedirect(caught)).toBe(true);
    expect(caught).toMatchObject({
      options: { to: "/auth/login", search: { next: lookup.href } },
    });
  });

  it("preserves genuine network failures for the error boundary", async () => {
    const error = new Error("Synthetic network failure");
    const { client } = network(error);
    await expect(lookup.load(client, lookup.href)).rejects.toBe(error);
  });
});

it("treats an entry context with no entry as not-found", async () => {
  const { client } = network({
    data: {
      getLedgerEntryContext: {
        ...entryData.getLedgerEntryContext,
        entry: null,
      },
    },
  });
  await expect(lookups[0].load(client, lookups[0].href)).rejects.toSatisfy(
    isNotFound,
  );
});

describe("pull request number validation before querying", () => {
  it.each([
    "",
    "0",
    "-1",
    "+1",
    "1.5",
    "1e2",
    "12junk",
    " 12",
    "12\n",
    "NaN",
    "Infinity",
    "2147483648",
    "9007199254740992",
  ])("refuses %j without domain work", async (prNumber) => {
    const { client, requests } = network({ data: pullData });
    await expect(
      loadPullRequestRoute({
        context: { client },
        params: { ledgerOwner: owner, ledgerName: name, prNumber },
        location: {
          href: `/ledger/${owner}/${name}/pull/${encodeURIComponent(prNumber)}`,
        },
      }),
    ).rejects.toSatisfy(isNotFound);
    expect(requests).toHaveLength(0);
  });

  it.each([
    ["00012", 12],
    ["2147483647", 2147483647],
  ] as const)(
    "accepts %s as the exact positive GraphQL Int %s",
    async (prNumber, expected) => {
      const { client, requests } = network({
        data: {
          getPullRequestDetails: {
            ...pullData.getPullRequestDetails,
            number: expected,
          },
        },
      });
      await loadPullRequestRoute({
        context: { client },
        params: { ledgerOwner: owner, ledgerName: name, prNumber },
        location: { href: `/ledger/${owner}/${name}/pull/${prNumber}` },
      });
      expect(requests).toEqual([
        {
          name: "GetPullRequestDetails",
          variables: {
            ledgerOwner: owner,
            ledgerName: name,
            prNumber: expected,
          },
        },
      ]);
    },
  );
});
