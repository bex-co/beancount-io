import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import {
  cleanup,
  fireEvent,
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
import { createContext, useContext } from "react";
import type { EditorProps } from "@monaco-editor/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { base64Encode } from "@/common/lib/utils/encode";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { toast } from "sonner";
import CreateFilePage from "../index";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
const access = vi.hoisted(() => ({ canWrite: true }));
vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => true,
}));
vi.mock("@/common/providers/ledger-provider", () => ({
  useLedger: () => ({
    ledgerName: "Books",
    ledgerData: {
      permissions: { pull: true, push: access.canWrite },
    },
  }),
}));
// Monaco's value/change surface is the only editor boundary replaced here.
vi.mock("@/common/components/monaco-editor", () => ({
  MonacoEditor: (props: EditorProps) => (
    <textarea
      aria-label="File contents"
      value={props.value ?? ""}
      onChange={(event) => props.onChange?.(event.target.value, {} as never)}
    />
  ),
}));

const Revision = createContext(0);
function PageFixture() {
  useContext(Revision);
  return <CreateFilePage />;
}
const clients: ApolloClient[] = [];
beforeEach(() => {
  access.canWrite = true;
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
  vi.restoreAllMocks();
});

async function setup({
  dir = "",
  language = "en" as "en" | "de",
  canWrite = true,
  failFirstSave = false,
  twinOnSave = null as string | null,
} = {}) {
  access.canWrite = canWrite;
  const mutations: Array<Record<string, unknown>> = [];
  const requests: Array<{ name: string; variables: Record<string, unknown> }> =
    [];
  const file = (path: string, content: string | null = null) => ({
    __typename: "LedgerFileContent" as const,
    name: path.split("/").at(-1)!,
    path,
    sha: "synthetic-sha",
    size: 42,
    type: "file",
    encoding: "base64",
    content,
    lastCommitSha: null,
    lastAuthorDate: null,
    lastCommitterDate: null,
  });
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
            observer.next({
              data: {
                getLedgerDirContent: [file(`${dir ? `${dir}/` : ""}main.bean`)],
              },
            });
          } else if (operation.operationName === "CreateLedgerFile") {
            mutations.push(operation.variables);
            if (failFirstSave && mutations.length === 1) {
              observer.error(new Error("Synthetic connection failure"));
              return;
            }
            if (twinOnSave) {
              observer.next({
                errors: [
                  {
                    message: `File conflict: ${String(operation.variables.path)} already exists as ${twinOnSave}`,
                    extensions: { code: "CONFLICT" },
                  },
                ],
              });
              observer.complete();
              return;
            }
            observer.next({
              data: {
                createLedgerFile: file(
                  String(operation.variables.path),
                  String(operation.variables.content),
                ),
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
  const createRouteFixture = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/files/new/$branch/$",
    component: PageFixture,
  });
  const tree = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
    component: () => <h1>Files destination</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([createRouteFixture, tree]),
    history: createMemoryHistory({
      initialEntries: [
        `/ledger/alice/books/files/new/main${dir ? `/${dir}` : ""}`,
      ],
    }),
  });
  await router.load();
  const contents = (revision: number) => (
    <LocalizationProvider localization={localization}>
      <ApolloProvider client={client}>
        <Revision.Provider value={revision}>
          <RouterProvider router={router} />
        </Revision.Provider>
      </ApolloProvider>
    </LocalizationProvider>
  );
  const view = render(contents(0));
  await screen.findByRole("heading", {
    level: 1,
    name: localization.i18n.t("ledgerEditor.createFile"),
  });
  await waitFor(() =>
    expect(requests.some(({ name }) => name === "GetLedgerDirContent")).toBe(
      true,
    ),
  );
  return {
    router,
    mutations,
    requests,
    localization,
    filename: () =>
      screen.getByPlaceholderText(
        localization.i18n.t("ledgerEditor.nameYourFile"),
      ),
    save: () =>
      screen.getByRole("button", { name: localization.i18n.t("common.save") }),
    refreshPermission: () => view.rerender(contents(1)),
  };
}

const messages = {
  en: {
    empty: "Remove the empty folder name (// or a trailing /)",
    git: "Files inside .git can't be edited",
  },
  de: {
    empty:
      "Entfernen Sie den leeren Ordnernamen (// oder ein abschließendes /)",
    git: "Dateien innerhalb von .git können nicht bearbeitet werden",
  },
};

describe("Create File normalized targets through the real form and mutation", () => {
  it.each(["en", "de"] as const)(
    "trims only the outside whitespace in the %s mutation path and commit message",
    async (language) => {
      const { filename, save, mutations, localization } = await setup({
        dir: "FY2024",
        language,
      });
      fireEvent.change(filename(), {
        target: { value: "  bank exports/給与 明細.bean  " },
      });
      fireEvent.change(screen.getByRole("textbox", { name: "File contents" }), {
        target: { value: "; Original یادداشت\n" },
      });
      expect(filename()).toHaveValue("  bank exports/給与 明細.bean  ");
      await userEvent.setup().click(save());
      await screen.findByRole("heading", { name: "Files destination" });
      const path = "FY2024/bank exports/給与 明細.bean";
      expect(mutations).toEqual([
        {
          ledgerId: "alice/books",
          path,
          content: base64Encode("; Original یادداشت\n"),
          message: localization.i18n.t("ledgerEditor.createFileCommit", {
            path,
          }),
        },
      ]);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    },
  );

  it.each(
    (["en", "de"] as const).flatMap((language) =>
      ["a//b.bean", "dir/"].map((path) => [language, path] as const),
    ),
  )(
    "explains the %s empty segment in %s without using the traversal message",
    async (language, path) => {
      const { filename, save, mutations } = await setup({ language });
      fireEvent.change(filename(), { target: { value: path } });
      expect(screen.getByRole("alert")).toHaveTextContent(
        messages[language].empty,
      );
      expect(filename()).toHaveAttribute("aria-invalid", "true");
      expect(filename()).toHaveAccessibleDescription(messages[language].empty);
      expect(save()).toBeDisabled();
      fireEvent.click(save());
      expect(mutations).toEqual([]);
    },
  );

  it.each(
    (["en", "de"] as const).flatMap((language) =>
      [
        ["", ".git/config"],
        ["", "nested/.git/hooks/pre-commit"],
        ["nested/.git", "config"],
      ].map(([dir, path]) => [language, dir, path] as const),
    ),
  )(
    "blocks a %s reserved target from current directory %s and name %s before mutation",
    async (language, dir, path) => {
      const { filename, save, mutations } = await setup({ language, dir });
      fireEvent.change(filename(), { target: { value: path } });
      expect(screen.getByRole("alert")).toHaveTextContent(
        messages[language].git,
      );
      expect(save()).toBeDisabled();
      fireEvent.click(save());
      expect(mutations).toEqual([]);
    },
  );

  it.each(["en", "de"] as const)(
    "allows an ordinary %s .gitignore filename and returns to its original directory after saving",
    async (language) => {
      const { filename, save, mutations, localization, router, requests } =
        await setup({ language, dir: "FY2024" });
      fireEvent.change(filename(), { target: { value: ".gitignore" } });
      fireEvent.change(screen.getByRole("textbox", { name: "File contents" }), {
        target: { value: "*.log\n" },
      });
      expect(save()).toBeEnabled();
      await userEvent.setup().click(save());
      await screen.findByRole("heading", { name: "Files destination" });
      expect(mutations).toEqual([
        {
          ledgerId: "alice/books",
          path: "FY2024/.gitignore",
          content: base64Encode("*.log\n"),
          message: localization.i18n.t("ledgerEditor.createFileCommit", {
            path: "FY2024/.gitignore",
          }),
        },
      ]);
      expect(router.state.matches.at(-1)?.params).toMatchObject({
        ledgerOwner: "alice",
        ledgerName: "books",
        branch: "main",
        _splat: "FY2024",
      });
      expect(
        requests.filter(({ name }) => name === "GetLedgerDirContent"),
      ).toEqual([
        {
          name: "GetLedgerDirContent",
          variables: { ledgerId: "alice/books", dirPath: "FY2024" },
        },
        {
          name: "GetLedgerDirContent",
          variables: { ledgerId: "alice/books", dirPath: "FY2024" },
        },
      ]);
    },
  );

  it.each(["en", "de"] as const)(
    "retains %s collision-after-trim and traversal validation without mutation",
    async (language) => {
      const { filename, save, mutations, localization } = await setup({
        language,
      });
      fireEvent.change(filename(), { target: { value: "  main.bean  " } });
      expect(await screen.findByRole("alert")).toHaveTextContent(
        localization.i18n.t("ledgerEditor.fileAlreadyExists"),
      );
      expect(filename()).toHaveValue("  main.bean  ");
      expect(save()).toBeDisabled();
      fireEvent.change(filename(), { target: { value: "../escape.bean" } });
      expect(screen.getByRole("alert")).toHaveTextContent(
        localization.i18n.t("ledgerEditor.invalidFilePath"),
      );
      expect(save()).toBeDisabled();
      fireEvent.click(save());
      expect(mutations).toEqual([]);
    },
  );

  it.each(["en", "de"] as const)(
    "keeps a %s draft on Stay and leaves only after explicit discard",
    async (language) => {
      const { filename, mutations, localization, router } = await setup({
        language,
        dir: "FY2024",
      });
      const text = "; unsaved یادداشت\n";
      fireEvent.change(filename(), { target: { value: "  draft.bean  " } });
      fireEvent.change(screen.getByRole("textbox", { name: "File contents" }), {
        target: { value: text },
      });
      const user = userEvent.setup();
      await user.click(
        screen.getByRole("button", {
          name: localization.i18n.t("common.cancel"),
        }),
      );
      const dialog = await screen.findByRole("dialog", {
        name: localization.i18n.t("ledgerEditor.unsavedChanges"),
      });
      await user.click(
        within(dialog).getByRole("button", {
          name: localization.i18n.t("ledgerEditor.stay"),
        }),
      );
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(filename()).toHaveValue("  draft.bean  ");
      expect(
        screen.getByRole("textbox", { name: "File contents" }),
      ).toHaveValue(text);
      expect(router.state.location.pathname).toContain(
        "/files/new/main/FY2024",
      );
      await user.click(
        screen.getByRole("button", {
          name: localization.i18n.t("common.cancel"),
        }),
      );
      await user.click(
        within(await screen.findByRole("dialog")).getByRole("button", {
          name: localization.i18n.t("ledgerEditor.leaveWithoutSaving"),
        }),
      );
      await screen.findByRole("heading", { name: "Files destination" });
      expect(router.state.matches.at(-1)?.params).toMatchObject({
        _splat: "FY2024",
      });
      expect(mutations).toEqual([]);
    },
  );

  // A macOS or Windows clone keeps one of two names that differ only by
  // letter case or an invisible character; the server refuses the second
  // (w21/770), and the form offered it with Save enabled (w2/113).
  it.each(["Main.bean", "MAIN.BEAN", "ma\u200bin.bean"])(
    "names main.bean as the existing spelling of %j and keeps Save disabled",
    async (name) => {
      const { filename, save, mutations, localization } = await setup();
      fireEvent.change(filename(), { target: { value: name } });
      expect(await screen.findByRole("alert")).toHaveTextContent(
        localization.i18n.t("ledgerEditor.fileExistsAs", {
          name: "main.bean",
        }),
      );
      expect(save()).toBeDisabled();
      fireEvent.click(save());
      expect(mutations).toEqual([]);
    },
  );

  it("names the twin the server refused instead of advising a refresh", async () => {
    const { filename, save, mutations, localization } = await setup({
      twinOnSave: "receipts",
    });
    // A nested path is checked only by the server.
    fireEvent.change(filename(), { target: { value: "Receipts/new.bean" } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(mutations).toHaveLength(1));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        localization.i18n.t("ledgerEditor.fileExistsAs", { name: "receipts" }),
      ),
    );
    expect(filename()).toHaveValue("Receipts/new.bean");
  });

  it("cancels a clean form without a draft prompt", async () => {
    const { localization, mutations } = await setup();
    await userEvent.setup().click(
      screen.getByRole("button", {
        name: localization.i18n.t("common.cancel"),
      }),
    );
    await screen.findByRole("heading", { name: "Files destination" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mutations).toEqual([]);
  });

  it("denies a reader's direct route and preserves the parent-directory link", async () => {
    const { localization, mutations } = await setup({
      canWrite: false,
      dir: "FY2024",
    });
    expect(
      screen.queryByPlaceholderText(
        localization.i18n.t("ledgerEditor.nameYourFile"),
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "File contents" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: localization.i18n.t("common.save"),
      }),
    ).not.toBeInTheDocument();
    const browse = screen.getByRole("link", {
      name: localization.i18n.t("ledgerEditor.browseParentDirectory"),
    });
    expect(browse).toHaveAttribute(
      "href",
      "/ledger/alice/books/files/tree/main/FY2024",
    );
    await userEvent.setup().click(browse);
    await screen.findByRole("heading", { name: "Files destination" });
    expect(mutations).toEqual([]);
  });

  it("preserves a draft and disables the write when permission is lost", async () => {
    const { filename, save, refreshPermission, mutations } = await setup();
    fireEvent.change(filename(), { target: { value: " notes.bean " } });
    fireEvent.change(screen.getByRole("textbox", { name: "File contents" }), {
      target: { value: "; preserve draft\n" },
    });
    access.canWrite = false;
    refreshPermission();
    expect(filename()).toHaveValue(" notes.bean ");
    expect(screen.getByRole("textbox", { name: "File contents" })).toHaveValue(
      "; preserve draft\n",
    );
    expect(save()).toBeDisabled();
    fireEvent.click(save());
    expect(mutations).toEqual([]);
  });

  it("retains a failed save's draft and guard, then retries the same normalized write", async () => {
    const expectedError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { filename, save, localization, mutations, router } = await setup({
      failFirstSave: true,
      dir: "FY2024",
    });
    const draft = "; original Café یادداشت\n";
    fireEvent.change(filename(), { target: { value: " retry.bean " } });
    fireEvent.change(screen.getByRole("textbox", { name: "File contents" }), {
      target: { value: draft },
    });
    const user = userEvent.setup();
    await user.click(save());
    await waitFor(() =>
      expect(expectedError).toHaveBeenCalledWith(
        "Failed to create file:",
        expect.objectContaining({ message: "Synthetic connection failure" }),
      ),
    );
    expect(filename()).toHaveValue(" retry.bean ");
    expect(screen.getByRole("textbox", { name: "File contents" })).toHaveValue(
      draft,
    );
    expect(save()).toBeEnabled();
    expect(router.state.location.pathname).toContain("/files/new/main/FY2024");
    await user.click(
      screen.getByRole("button", {
        name: localization.i18n.t("common.cancel"),
      }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: localization.i18n.t("ledgerEditor.unsavedChanges"),
    });
    await user.click(
      within(dialog).getByRole("button", {
        name: localization.i18n.t("ledgerEditor.stay"),
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await user.click(save());
    await screen.findByRole("heading", { name: "Files destination" });
    const expected = {
      ledgerId: "alice/books",
      path: "FY2024/retry.bean",
      content: base64Encode(draft),
      message: localization.i18n.t("ledgerEditor.createFileCommit", {
        path: "FY2024/retry.bean",
      }),
    };
    expect(mutations).toEqual([expected, expected]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
