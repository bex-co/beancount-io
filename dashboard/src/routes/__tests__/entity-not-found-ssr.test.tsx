// @vitest-environment node
import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  HeadContent,
  Outlet,
  type AnyRoute,
} from "@tanstack/react-router";
import {
  createRequestHandler,
  defaultRenderHandler,
} from "@tanstack/react-router/ssr/server";
import { describe, expect, it, vi } from "vitest";
import type { RouterContext } from "@/common/types/router-context";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import NotFoundPage from "@/common/root-route/not-found-page";
import ErrorPage from "@/common/root-route/error-page";
import { Route as RootRoute } from "@/routes/__root";
import { Route as AccountRoute } from "@/routes/ledger.$ledgerOwner.$ledgerName.account.$accountName";
import { Route as EntryRoute } from "@/routes/ledger.$ledgerOwner.$ledgerName.entry.$entryHash";
import { Route as CommitRoute } from "@/routes/ledger.$ledgerOwner.$ledgerName.commit.$commitSha";
import { Route as PullRoute } from "@/routes/ledger.$ledgerOwner.$ledgerName.pull.$prNumber";
import { Route as ProfileRoute } from "@/routes/ledger.$username";
import { Route as FileRoute } from "@/routes/ledger.$ledgerOwner.$ledgerName.files.blob.$branch.$";
import { Route as DirectoryRoute } from "@/routes/ledger.$ledgerOwner.$ledgerName.files.tree.$branch.$";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.mock("@/common/root-route/shell-component", () => ({
  ShellComponent: () => null,
}));
vi.mock("@/common/root-route/root-component", () => ({
  RootComponent: () => null,
}));
vi.mock("@/common/server-fn", () => ({
  fetchUserProfile: vi.fn(async () => ({ status: "signed-out" as const })),
  toAuthContext: () => ({
    userProfile: null,
    authStatus: "signed-out" as const,
  }),
}));
vi.mock("@/i18n/detect-language", () => ({ detectLanguage: () => "en" }));

// Keep actual file-route loaders, validation, heads and not-found components.
// Success bodies and the surrounding shell are bounded; they do not decide
// whether a matched entity exists or which HTTP status/metadata it receives.
vi.mock("@/features/reports/account", () => ({
  default: () => <p>Existing account body</p>,
}));
vi.mock("@/features/journal/pages/entry-page", () => ({
  default: () => <p>Existing entry body</p>,
}));
vi.mock("@/features/git/commits/pages/commit-detail-page", () => ({
  default: () => <p>Existing commit body</p>,
}));
vi.mock("@/features/git/pull-requests/pages/pr-review-page", () => ({
  default: () => <p>Existing pull body</p>,
}));
vi.mock("@/features/ledger-editor/file-editor", () => ({
  default: () => <p>Existing file body</p>,
}));
vi.mock("@/features/ledger-editor/directory-browse", () => ({
  default: () => <p>Existing directory body</p>,
}));
vi.mock(
  "@/features/user-profile/pages/user-profile-page",
  async (original) => ({
    ...(await original<object>()),
    default: () => <p>Existing profile body</p>,
  }),
);

const origin = "https://beancount.io";
const ledger = "/ledger/alice/books";
const entities = [
  {
    name: "account",
    path: `${ledger}/account/Assets:Cash`,
    operation: "GetLedgerAccounts",
  },
  {
    name: "entry",
    path: `${ledger}/entry/known-entry`,
    operation: "GetLedgerEntryContext",
  },
  {
    name: "commit",
    path: `${ledger}/commit/known-commit`,
    operation: "GetCommitDetails",
  },
  {
    name: "pull",
    path: `${ledger}/pull/7`,
    operation: "GetPullRequestDetails",
  },
  { name: "profile", path: "/ledger/alice", operation: "GetUserProfile" },
  {
    // w3/629: a stale file link was an indexable 200.
    name: "file",
    path: `${ledger}/files/blob/main/README.md`,
    operation: "GetLedgerFile",
  },
] as const;

function responseData(operation: string, missing: boolean) {
  switch (operation) {
    case "GetLedgerAccounts":
      return {
        getLedgerAccounts: missing ? [] : ["Assets:Cash", "Assets:Closed"],
      };
    case "GetLedgerEntryContext":
      return {
        getLedgerEntryContext: missing
          ? null
          : {
              slice: '2026-10-15 * "Synthetic entry"',
              sha256sum: "synthetic-sha",
              entry: { type: "Transaction" },
              balances_before: {},
              balances_after: {},
              managed_source: null,
            },
      };
    case "GetCommitDetails":
      return {
        getCommitDetails: missing
          ? null
          : {
              sha: "known-commit",
              message: "Synthetic change",
              author: {
                name: "Synthetic",
                email: "person@example.test",
                date: "2026-10-15",
              },
              committer: {
                name: "Synthetic",
                email: "person@example.test",
                date: "2026-10-15",
              },
              files: [],
              stats: { additions: 0, deletions: 0, total: 0 },
              diff: "",
              parents: [],
            },
      };
    case "GetPullRequestDetails":
      return {
        getPullRequestDetails: missing
          ? null
          : {
              number: 7,
              title: "Synthetic proposal",
              description: "",
              state: "open",
              author: "alice",
              headBranch: "proposal",
              baseBranch: "main",
              files: [],
              diff: "",
            },
      };
    case "GetLedgerDirContent":
      return { getLedgerDirContent: [] };
    case "GetLedgerFile":
      return {
        getLedgerFile: missing
          ? null
          : {
              name: "README.md",
              path: "README.md",
              sha: "synthetic-sha",
              size: 9,
              type: "file",
              encoding: "base64",
              content: "U3ludGhldGlj",
              lastCommitSha: null,
              lastAuthorDate: null,
              lastCommitterDate: null,
            },
      };
    case "GetUserProfile":
      return {
        getUserProfile: missing
          ? null
          : {
              profile: {
                username: "alice",
                fullName: "Synthetic Alice",
                avatarUrl: null,
                bio: null,
                location: null,
                website: null,
                followersCount: 0,
                followingCount: 0,
                starredReposCount: 0,
                created: "2026-01-01T00:00:00Z",
              },
              isFollowing: false,
              activities: [],
              repositories: [],
            },
      };
    default:
      throw new Error(`Unexpected operation ${operation}`);
  }
}

async function serve(
  path: string,
  options: {
    missing?: boolean;
    code?: string;
    codeOperation?: string;
    networkError?: boolean;
  } = {},
) {
  const requests: Array<{ name: string; variables: Record<string, unknown> }> =
    [];
  const client = new ApolloClient({
    ssrMode: true,
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            name: operation.operationName,
            variables: { ...operation.variables },
          });
          if (options.networkError)
            observer.error(new Error("Synthetic network failure"));
          else if (
            options.code &&
            (!options.codeOperation ||
              operation.operationName === options.codeOperation)
          ) {
            observer.next({
              errors: [
                {
                  message: "Synthetic lookup failure",
                  extensions: { code: options.code },
                },
              ],
            });
            observer.complete();
          } else {
            observer.next({
              data: responseData(
                operation.operationName,
                options.missing ?? false,
              ),
            });
            observer.complete();
          }
        }),
    ),
  });
  const localization = createLocalization();
  const root = createRootRouteWithContext<RouterContext>()({
    head: RootRoute.options.head,
    notFoundComponent: NotFoundPage,
    errorComponent: ErrorPage,
    shellComponent: ({ children }) => (
      <html>
        <head>
          <HeadContent />
        </head>
        <body>{children}</body>
      </html>
    ),
    component: Outlet,
  });
  const ledgerRoute = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName",
    component: Outlet,
  });
  function clone(source: AnyRoute, parent: AnyRoute, routePath: string) {
    return createRoute({
      ...source.options,
      getParentRoute: () => parent,
      path: routePath,
    });
  }
  const routes = ledgerRoute.addChildren([
    clone(AccountRoute, ledgerRoute, "account/$accountName"),
    clone(EntryRoute, ledgerRoute, "entry/$entryHash"),
    clone(CommitRoute, ledgerRoute, "commit/$commitSha"),
    clone(PullRoute, ledgerRoute, "pull/$prNumber"),
    clone(FileRoute, ledgerRoute, "files/blob/$branch/$"),
    clone(DirectoryRoute, ledgerRoute, "files/tree/$branch/$"),
  ]);
  const router = createRouter({
    routeTree: root.addChildren([
      routes,
      clone(ProfileRoute, root, "/ledger/$username"),
    ]),
    context: { client, localization, userProfile: null },
    isServer: true,
    Wrap: ({ children }) => (
      <LocalizationProvider localization={localization}>
        <ApolloProvider client={client}>{children}</ApolloProvider>
      </LocalizationProvider>
    ),
  });
  try {
    const response = await createRequestHandler({
      request: new Request(new URL(path, origin)),
      createRouter: () => router,
    })(defaultRenderHandler);
    const html = await response.text();
    const robots = [...html.matchAll(/<meta\b[^>]*>/g)]
      .map(([tag]) => tag)
      .filter((tag) => /name="robots"/.test(tag));
    return { response, html, robots, requests, router };
  } finally {
    client.stop();
  }
}

function expectNotFound(result: Awaited<ReturnType<typeof serve>>) {
  expect(result.response.status).toBe(404);
  expect(result.response.headers.get("Location")).toBeNull();
  expect(result.robots).toHaveLength(1);
  expect(result.robots[0]).toContain("noindex");
  expect(result.html).not.toMatch(/rel="canonical"/);
  expect(result.html).not.toContain("Existing account body");
}

describe("directory routes through the actual SSR boundary", () => {
  const treePath = `${ledger}/files/tree/main`;

  it("answers the repository root with 200, including an empty root", async () => {
    const result = await serve(treePath);
    expect(result.response.status).toBe(200);
    expect(result.html).toContain("Existing directory body");
    expect(result.requests).toEqual([
      {
        name: "GetLedgerDirContent",
        variables: { ledgerId: "alice/books", dirPath: null },
      },
    ]);
  });

  it("answers a missing folder with 404, noindex and a parent link", async () => {
    const result = await serve(`${treePath}/imports/missing`, {
      code: "NOT_FOUND",
    });
    expectNotFound(result);
    expect(result.html).toContain("Folder not found: imports/missing");
    expect(result.html).toContain("Browse parent directory");
    expect(result.html).toContain(`href="${treePath}/imports"`);
    expect(result.html).not.toContain("Existing directory body");
    expect(result.html).not.toContain("Try Again");
  });

  it("redirects a file path to the blob route", async () => {
    const result = await serve(`${treePath}/README.md`, {
      code: "NOT_FOUND",
      codeOperation: "GetLedgerDirContent",
    });
    expect(result.response.status).toBe(307);
    const location = new URL(result.response.headers.get("Location")!, origin);
    expect(location.pathname).toBe(`${ledger}/files/blob/main/README.md`);
    expect(result.requests).toEqual([
      {
        name: "GetLedgerDirContent",
        variables: { ledgerId: "alice/books", dirPath: "README.md" },
      },
      {
        name: "GetLedgerFile",
        variables: { ledgerId: "alice/books", path: "README.md" },
      },
    ]);
  });

  it("leaves an unsupported branch at 404 without looking up files", async () => {
    const result = await serve(`${ledger}/files/tree/old/imports`);
    expectNotFound(result);
    expect(result.html).toContain("Browse files on main");
    expect(result.requests).toEqual([]);
  });

  it("only probes for a file after a missing directory result", async () => {
    const result = await serve(`${treePath}/imports`, { code: "FORBIDDEN" });
    expectNotFound(result);
    expect(result.requests.map((request) => request.name)).toEqual([
      "GetLedgerDirContent",
    ]);
  });

  it("hands an inconclusive read to the directory retry view", async () => {
    const result = await serve(`${treePath}/imports`, { networkError: true });
    expect(result.response.status).toBe(200);
    const directory = result.router.state.matches.find((match) =>
      match.routeId.includes("/files/tree/"),
    );
    expect(directory?.loaderData).toEqual({ readFailed: true });
    expect(result.requests.map((request) => request.name)).toEqual([
      "GetLedgerDirContent",
    ]);
  });
});

describe("matched entity routes through the actual SSR boundary", () => {
  it.each(entities)(
    "serves a real $name as 200 with its existing metadata",
    async ({ name, path }) => {
      const result = await serve(path);
      expect(result.response.status).toBe(200);
      expect(result.response.headers.get("Location")).toBeNull();
      expect(result.robots).toEqual([]);
      expect(result.html).toContain(`Existing ${name} body`);
      const titles = [...result.html.matchAll(/<title>(.*?)<\/title>/g)].map(
        (match) => match[1],
      );
      expect(titles).toEqual([
        {
          account: "Assets:Cash - books",
          entry: "Entry - books",
          commit: "Commit known-c - books",
          pull: "Pull Request #7 - books",
          profile: "alice - User Profile",
          file: "README.md · Files - books",
        }[name],
      ]);
    },
  );

  it("accepts a closed account without filtering the account query", async () => {
    const result = await serve(`${ledger}/account/Assets%3AClosed`);
    expect(result.response.status).toBe(200);
    expect(result.html).toContain("Existing account body");
  });

  it("preserves an aggregate ancestor linked from existing reports", async () => {
    const result = await serve(`${ledger}/account/Assets`);
    expect(result.response.status).toBe(200);
    expect(result.robots).toEqual([]);
    expect(result.html).toContain("Existing account body");
  });

  it.each(["Assets:Nope:Missing", "NotARoot:Foo"])(
    "answers an unknown account %s with 404 and Accounts navigation",
    async (account) => {
      const result = await serve(
        `${ledger}/account/${encodeURIComponent(account)}`,
      );
      expectNotFound(result);
      expect(result.html).toContain(account);
      expect(result.html).toContain('href="/ledger/alice/books/accounts"');
    },
  );

  it.each(entities)(
    "answers an absent $name with noindex and 404 before rendering",
    async ({ name, path }) => {
      const result = await serve(path, { missing: true });
      expectNotFound(result);
      expect(result.html).not.toContain(`Existing ${name} body`);
      if (name === "profile") {
        expect(result.html).toContain("User not found");
        expect(result.html).toContain("Go to dashboard");
        expect(result.html).not.toContain("Try again");
        expect(result.html).not.toContain("alice - User Profile");
      }
    },
  );

  it.each(
    entities.flatMap((entity) =>
      ["NOT_FOUND", "BAD_USER_INPUT", "FORBIDDEN"].map((code) => ({
        ...entity,
        code,
      })),
    ),
  )("maps $name $code to an honest not-found", async ({ path, code }) =>
    expectNotFound(await serve(path, { code })),
  );

  it.each(entities)(
    "keeps the $name login redirect with the safe query return path",
    async ({ path }) => {
      const requested = `${path}?time=2026`;
      const result = await serve(requested, { code: "UNAUTHENTICATED" });
      expect(result.response.status).toBe(307);
      const target = new URL(result.response.headers.get("Location")!, origin);
      expect(target.pathname).toBe("/auth/login");
      expect(target.searchParams.get("next")).toBe(requested);
    },
  );

  it.each(entities)(
    "keeps network failures on $name as errors",
    async ({ path }) => {
      const result = await serve(path, { networkError: true });
      expect(result.response.status).toBe(500);
      expect(result.html).not.toContain("Existing account body");
    },
  );

  it.each(entities)(
    "keeps service failures on $name as errors rather than missing entities",
    async ({ path }) => {
      const result = await serve(path, { code: "INTERNAL_SERVER_ERROR" });
      expect(result.response.status).toBe(500);
      expect(result.html).not.toContain("Existing account body");
    },
  );
});
