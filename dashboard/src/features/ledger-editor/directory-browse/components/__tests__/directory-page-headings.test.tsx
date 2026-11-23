import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { base64Encode } from "@/common/lib/utils/encode";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import LedgerDirectoryPage from "../../index";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => true,
}));
vi.mock("@/common/hooks/use-auth-status", () => ({
  useAuthStatus: () => "signed-in",
}));
vi.mock("@/common/providers/ledger-provider", () => ({
  useLedger: () => ({
    ledgerData: {
      permissions: { pull: true, push: true },
      httpUrl: "https://example.invalid/git/alice/books.git",
      sshUrl: "git@example.invalid:alice/books.git",
    },
  }),
}));

const readme = `# Synthetic ledger

## Accounts

### Imports

###### Deep note

<h1 id="raw-title">Raw HTML title</h1>

<h2>Raw HTML section</h2>

Read the **ledger instructions** before importing.
`;
const entry = (path: string, type = "file") => ({
  __typename: "LedgerFileContent" as const,
  name: path.split("/").at(-1)!,
  path,
  type,
  sha: `synthetic-${path}`,
  size: 42,
  encoding: "base64",
  content: null,
  lastCommitSha: null,
  lastAuthorDate: null,
  lastCommitterDate: null,
});
const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
  vi.restoreAllMocks();
});

async function setup({
  path = "",
  language = "en" as "en" | "de",
  state = "ready" as "ready" | "loading" | "empty" | "error" | "missing",
  recoverOnRetry = false,
} = {}) {
  const requests: Array<{ name: string; variables: Record<string, unknown> }> =
    [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            name: operation.operationName,
            variables: operation.variables,
          });
          if (operation.operationName === "GetLedgerDirContent") {
            if (state === "loading") return;
            if (state === "missing") {
              observer.next({
                errors: [
                  {
                    message: "Synthetic missing directory",
                    extensions: { code: "NOT_FOUND" },
                  },
                ],
              });
              observer.complete();
              return;
            }
            if (
              state === "error" &&
              (!recoverOnRetry ||
                requests.filter(({ name }) => name === "GetLedgerDirContent")
                  .length === 1)
            ) {
              observer.error(new Error("Synthetic directory failure"));
              return;
            }
            const folder = operation.variables.dirPath;
            observer.next({
              data: {
                getLedgerDirContent:
                  state === "empty"
                    ? []
                    : folder
                      ? [entry(`${folder}/FY2024.bean`)]
                      : [
                          entry("README.md"),
                          entry("main.bean"),
                          entry("FY2024", "dir"),
                        ],
              },
            });
          } else if (operation.operationName === "GetLedgerFile") {
            observer.next({
              data: {
                getLedgerFile: {
                  ...entry("README.md"),
                  content: base64Encode(readme),
                  size: new TextEncoder().encode(readme).length,
                },
              },
            });
          } else {
            observer.error(
              new Error(`Unexpected operation: ${operation.operationName}`),
            );
            return;
          }
          observer.complete();
        }),
    ),
  });
  clients.push(client);
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const root = createRootRoute({ component: () => <Outlet /> });
  const directoryRoute = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
    component: LedgerDirectoryPage,
  });
  const fileRoute = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
    component: () => <h1>File destination</h1>,
  });
  const commitsRoute = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/commits",
    component: () => <h1>History destination</h1>,
  });
  const sshRoute = createRoute({
    getParentRoute: () => root,
    path: "/settings/ssh-keys",
    component: () => <h1>SSH settings destination</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([
      directoryRoute,
      fileRoute,
      commitsRoute,
      sshRoute,
    ]),
    history: createMemoryHistory({
      initialEntries: [
        `/ledger/alice/books/files/tree/main${path ? `/${path}` : ""}`,
      ],
    }),
  });
  await router.load();
  const view = render(
    <LocalizationProvider localization={localization}>
      <ApolloProvider client={client}>
        <RouterProvider router={router} />
      </ApolloProvider>
    </LocalizationProvider>,
  );
  await waitFor(() =>
    expect(requests.some(({ name }) => name === "GetLedgerDirContent")).toBe(
      true,
    ),
  );
  if (state === "empty")
    await screen.findByText(
      localization.i18n.t("ledgerEditor.thisDirectoryIsEmpty"),
    );
  else if (state === "error")
    await screen.findByText(
      localization.i18n.t("ledgerEditor.failedToLoadDirectory"),
    );
  else if (state === "ready")
    await screen.findByRole("link", {
      name: path ? /^FY2024\.bean/ : /^FY2024$/,
    });
  return { ...view, router, requests, localization };
}

function pageHeading(name: string) {
  const headings = screen.getAllByRole("heading", { level: 1 });
  expect(headings).toHaveLength(1);
  expect(headings[0]).toHaveAccessibleName(name);
  return headings[0];
}

describe("directory page heading and real embedded README", () => {
  it("retries only the directory read and renders the result in place", async () => {
    const { router, requests, localization } = await setup({
      path: "FY2024",
      state: "error",
      recoverOnRetry: true,
    });
    const user = userEvent.setup();
    const originalUrl = router.state.location.href;
    await user.click(
      screen.getByRole("button", {
        name: localization.i18n.t("common.tryAgain"),
      }),
    );
    expect(
      await screen.findByRole("link", { name: /^FY2024\.bean/ }),
    ).toBeVisible();
    expect(router.state.location.href).toBe(originalUrl);
    expect(requests).toEqual([
      {
        name: "GetLedgerDirContent",
        variables: { ledgerId: "alice/books", dirPath: "FY2024" },
      },
      {
        name: "GetLedgerDirContent",
        variables: { ledgerId: "alice/books", dirPath: "FY2024" },
      },
    ]);
  });

  it("offers the parent when a mounted directory read reports a missing folder", async () => {
    const { localization } = await setup({
      path: "FY2024/missing",
      state: "missing",
    });
    expect(
      await screen.findByRole("heading", {
        name: "Folder not found: FY2024/missing",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: localization.i18n.t("ledgerEditor.browseParentDirectory"),
      }),
    ).toHaveAttribute("href", "/ledger/alice/books/files/tree/main/FY2024");
    expect(
      screen.queryByRole("button", {
        name: localization.i18n.t("common.tryAgain"),
      }),
    ).toBeNull();
  });
  it.each(["en", "de"] as const)(
    "names the %s root Files page and nests Markdown and raw HTML README headings below it",
    async (language) => {
      const { localization, requests } = await setup({ language });
      await screen.findByRole("heading", { name: "Synthetic ledger" });
      pageHeading(localization.i18n.t("ledgerEditor.files"));
      for (const [name, level] of [
        ["Synthetic ledger", 2],
        ["Accounts", 3],
        ["Imports", 4],
        ["Deep note", 6],
        ["Raw HTML title", 2],
        ["Raw HTML section", 3],
      ] as const) {
        expect(
          screen.getByRole("heading", { name, level }),
        ).toBeInTheDocument();
      }
      expect(screen.getByText("ledger instructions").tagName).toBe("STRONG");
      expect(requests).toEqual([
        {
          name: "GetLedgerDirContent",
          variables: { ledgerId: "alice/books", dirPath: null },
        },
        {
          name: "GetLedgerFile",
          variables: { ledgerId: "alice/books", path: "README.md" },
        },
      ]);
    },
  );

  it.each(["en", "de"] as const)(
    "names a %s nested folder without relying on README content",
    async (language) => {
      const { localization, requests } = await setup({
        path: "FY2024",
        language,
      });
      const heading = pageHeading(
        `${localization.i18n.t("ledgerEditor.files")} FY2024`,
      );
      expect(
        within(heading).getByRole("link", { name: "FY2024" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "Synthetic ledger" }),
      ).not.toBeInTheDocument();
      expect(requests).toEqual([
        {
          name: "GetLedgerDirContent",
          variables: { ledgerId: "alice/books", dirPath: "FY2024" },
        },
      ]);
    },
  );

  it.each(
    (["en", "de"] as const).flatMap((language) =>
      (["loading", "empty", "error"] as const).map(
        (state) => [language, state] as const,
      ),
    ),
  )(
    "keeps a %s folder breadcrumb h1 in the %s state",
    async (language, state) => {
      const { localization } = await setup({ path: "FY2024", state, language });
      const heading = pageHeading(
        `${localization.i18n.t("ledgerEditor.files")} FY2024`,
      );
      expect(
        within(heading).getByRole("link", { name: "FY2024" }),
      ).toBeInTheDocument();
    },
  );

  it.each(["en", "de"] as const)(
    "preserves %s listing, breadcrumb, Back, README edit, history, and clone navigation",
    async (language) => {
      const { router, localization, requests } = await setup({ language });
      const t = localization.i18n.t.bind(localization.i18n);
      const user = userEvent.setup();
      await screen.findByRole("heading", { name: "Synthetic ledger" });
      const folder = () => screen.getByRole("link", { name: /^FY2024$/ });
      expect(
        screen.getAllByRole("link").map((link) => link.textContent?.trim()),
      ).toEqual([
        t("ledgerEditor.files"),
        "FY2024",
        "main.bean42 B",
        "README.md42 B",
      ]);
      expect(folder()).toHaveAttribute(
        "href",
        "/ledger/alice/books/files/tree/main/FY2024",
      );

      await user.click(folder());
      await screen.findByRole("link", { name: /^FY2024\.bean/ });
      const heading = pageHeading(`${t("ledgerEditor.files")} FY2024`);
      await user.click(
        within(heading).getByRole("link", { name: t("ledgerEditor.files") }),
      );
      await screen.findByRole("heading", { name: "Synthetic ledger" });
      expect(router.state.matches.at(-1)?.params._splat || "").toBe("");

      await user.click(folder());
      await screen.findByRole("link", { name: /^FY2024\.bean/ });
      await user.click(screen.getByRole("button", { name: t("common.back") }));
      await screen.findByRole("heading", { name: "Synthetic ledger" });
      await user.click(screen.getByRole("button", { name: t("common.edit") }));
      await screen.findByRole("heading", { name: "File destination" });
      expect(router.state.matches.at(-1)?.params).toMatchObject({
        ledgerOwner: "alice",
        ledgerName: "books",
        branch: "main",
        _splat: "README.md",
      });
      expect(router.state.location.search).toMatchObject({ editMode: true });

      await act(async () => router.history.back());
      await screen.findByRole("heading", { name: "Synthetic ledger" });
      await user.click(folder());
      await user.click(
        await screen.findByRole("link", { name: /^FY2024\.bean/ }),
      );
      await screen.findByRole("heading", { name: "File destination" });
      expect(router.state.matches.at(-1)?.params).toMatchObject({
        ledgerOwner: "alice",
        ledgerName: "books",
        branch: "main",
        _splat: "FY2024/FY2024.bean",
      });
      await act(async () => router.history.back());
      await screen.findByRole("link", { name: /^FY2024\.bean/ });
      await user.click(
        screen.getByRole("button", { name: t("commits.versionHistory") }),
      );
      await screen.findByRole("heading", { name: "History destination" });
      expect(router.state.location.pathname).toBe(
        "/ledger/alice/books/commits",
      );

      await act(async () => router.history.back());
      await screen.findByRole("link", { name: /^FY2024\.bean/ });
      await user.click(
        screen.getByRole("button", { name: t("ledgerEditor.gitClone") }),
      );
      const dialog = screen.getByRole("dialog", {
        name: t("ledgerEditor.cloneRepository"),
      });
      expect(
        within(dialog).getByRole("textbox", {
          name: `SSH ${t("ledgerEditor.cloneRepository")}`,
        }),
      ).toHaveValue("git@example.invalid:alice/books.git");
      await user.click(within(dialog).getByRole("tab", { name: "HTTP" }));
      expect(
        within(dialog).getByRole("textbox", {
          name: `HTTP ${t("ledgerEditor.cloneRepository")}`,
        }),
      ).toHaveValue("https://example.invalid/git/alice/books.git");
      await user.click(
        within(dialog).getByRole("link", {
          name: t("ledgerEditor.manageSshKeys"),
        }),
      );
      await screen.findByRole("heading", { name: "SSH settings destination" });
      expect(router.state.location.pathname).toBe("/settings/ssh-keys");
      // Every request names this ledger, except the one question the HTTP tab
      // asks the deployment (is it self-hosted) to word its sign-in hint.
      expect(
        requests
          .filter(({ name }) => name !== "DeploymentInfo")
          .every(({ variables }) => variables.ledgerId === "alice/books"),
      ).toBe(true);
    },
  );
});
