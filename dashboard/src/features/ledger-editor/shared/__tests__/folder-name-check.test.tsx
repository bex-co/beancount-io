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
  fireEvent,
  render,
  screen,
  waitFor,
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
import type { EditorProps } from "@monaco-editor/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import CreateFilePage from "@/features/ledger-editor/create-file";
import UploadFilesPage from "@/features/ledger-editor/upload-files";

/**
 * Create File and Upload Files check a new name against the folder's listing
 * (w4/1036). A failed read used to look like an empty folder: `main.bean` was
 * offered for writing with no clash message and no way to read the folder
 * again. The real forms, Apollo query, router and translations run; only the
 * network answers and Monaco are replaced.
 */
vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => true,
}));
vi.mock("@/common/providers/ledger-provider", () => ({
  useLedger: () => ({
    ledgerName: "Books",
    ledgerData: { permissions: { pull: true, push: true } },
  }),
}));
vi.mock("@/common/components/monaco-editor", () => ({
  MonacoEditor: (props: EditorProps) => (
    <textarea
      aria-label="File contents"
      value={props.value ?? ""}
      onChange={(event) => props.onChange?.(event.target.value, {} as never)}
    />
  ),
}));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

/** How the next folder read answers. */
type Lookup = "fail" | "notFound" | string[] | Promise<string[]>;

const entry = (name: string) => ({
  __typename: "LedgerFileContent" as const,
  name,
  path: name,
  sha: "synthetic-sha",
  size: 42,
  type: "file",
  encoding: "base64",
  content: null,
  lastCommitSha: null,
  lastAuthorDate: null,
  lastCommitterDate: null,
});

async function setup(form: "new" | "upload", lookups: Lookup[], dir = "") {
  const requests: string[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push(operation.operationName ?? "");
          const next = lookups.shift() ?? "fail";
          const answer = (names: string[]) => {
            observer.next({
              data: { getLedgerDirContent: names.map(entry) },
            });
            observer.complete();
          };
          if (operation.operationName !== "GetLedgerDirContent") {
            observer.error(new Error(`Unexpected ${operation.operationName}`));
          } else if (next === "fail") {
            observer.error(new Error("Synthetic connection failure"));
          } else if (next === "notFound") {
            observer.next({
              errors: [
                {
                  message: `Directory '${dir}' not found`,
                  extensions: { code: "NOT_FOUND" },
                },
              ],
            });
            observer.complete();
          } else if (Array.isArray(next)) {
            answer(next);
          } else {
            void next.then(answer);
          }
        }),
    ),
  });
  clients.push(client);
  const localization = createLocalization();
  await localization.changeLanguage("en");
  const t = localization.i18n.t;
  const root = createRootRoute({ component: () => <Outlet /> });
  const router = createRouter({
    routeTree: root.addChildren([
      createRoute({
        getParentRoute: () => root,
        path: "/ledger/$ledgerOwner/$ledgerName/files/new/$branch/$",
        component: CreateFilePage,
      }),
      createRoute({
        getParentRoute: () => root,
        path: "/ledger/$ledgerOwner/$ledgerName/files/upload/$branch/$",
        component: UploadFilesPage,
      }),
      createRoute({
        getParentRoute: () => root,
        path: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
        component: () => <h1>Files destination</h1>,
      }),
    ]),
    history: createMemoryHistory({
      initialEntries: [
        `/ledger/alice/books/files/${form}/main${dir ? `/${dir}` : ""}`,
      ],
    }),
  });
  await router.load();
  render(
    <LocalizationProvider localization={localization}>
      <ApolloProvider client={client}>
        <RouterProvider router={router} />
      </ApolloProvider>
    </LocalizationProvider>,
  );
  const user = userEvent.setup();
  const checkFailed = () =>
    screen.queryByText(t("ledgerEditor.folderNamesFailed"));
  const checking = () =>
    screen.queryByText(t("ledgerEditor.folderNamesChecking"));
  const tryAgain = () =>
    screen.getByRole("button", { name: t("common.tryAgain") });
  const clash = () => screen.queryByText(t("ledgerEditor.fileAlreadyExists"));
  /** Press Try Again, and wait for that read to fail again. */
  const retryFails = async () => {
    const attempts = requests.length;
    await user.click(tryAgain());
    await waitFor(() => expect(requests).toHaveLength(attempts + 1));
    await waitFor(() => expect(tryAgain()).toBeEnabled());
  };
  return {
    t,
    client,
    requests,
    user,
    checkFailed,
    checking,
    tryAgain,
    clash,
    retryFails,
  };
}

async function createForm(lookups: Lookup[], dir = "") {
  const page = await setup("new", lookups, dir);
  const filename = await screen.findByPlaceholderText(
    page.t("ledgerEditor.nameYourFile"),
  );
  const contents = screen.getByRole("textbox", { name: "File contents" });
  const save = () =>
    screen.getByRole("button", { name: page.t("common.save") });
  const draft = async (name: string) => {
    fireEvent.change(filename, { target: { value: name } });
    fireEvent.change(contents, { target: { value: "; café 4.00995 BTC\n" } });
  };
  return { ...page, filename, contents, save, draft };
}

async function uploadForm(lookups: Lookup[]) {
  const page = await setup("upload", lookups);
  await screen.findByText(page.t("ledgerEditor.chooseYourFiles"));
  const comment = screen.getByLabelText(page.t("ledgerEditor.commitMessage"));
  const upload = () =>
    screen.getByRole("button", { name: page.t("ledgerEditor.uploadFiles") });
  /** Stage a file the way the browser's picker hands it over. */
  const choose = (name: string) => {
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    let staged = [new File(["; synthetic comment\n"], name)];
    Object.defineProperty(input, "files", {
      configurable: true,
      get: () => ({
        length: staged.length,
        item: (index: number) => staged[index] ?? null,
        [Symbol.iterator]: function* () {
          yield* staged;
        },
      }),
    });
    Object.defineProperty(input, "value", {
      configurable: true,
      get: () => (staged.length > 0 ? staged[0].name : ""),
      set: () => {
        staged = [];
      },
    });
    fireEvent.change(input);
  };
  const staged = (name: string) =>
    screen.queryByRole("button", {
      name: new RegExp(name.replace(".", "\\.")),
    });
  return { ...page, comment, upload, choose, staged };
}

describe("Create File's name check when the folder read fails", () => {
  it("holds Save, retries only the folder read, and restores the clash", async () => {
    const page = await createForm(["fail", "fail", ["main.bean"]]);
    await page.draft("main.bean");

    await waitFor(() => expect(page.checkFailed()).toBeInTheDocument());
    expect(page.clash()).toBeNull();
    expect(page.save()).toBeDisabled();
    expect(page.filename).toHaveAccessibleDescription(
      page.t("ledgerEditor.folderNamesFailed") +
        " " +
        page.t("common.tryAgain"),
    );

    // A failed retry keeps the explanation, and focus on Try Again.
    await page.retryFails();
    expect(page.checkFailed()).toBeInTheDocument();
    expect(page.tryAgain()).toHaveFocus();
    expect(page.save()).toBeDisabled();

    // A successful one reinstates the clash the healthy read shows.
    await page.user.click(page.tryAgain());
    await waitFor(() => expect(page.clash()).toBeInTheDocument());
    expect(page.checkFailed()).toBeNull();
    expect(page.save()).toBeDisabled();
    expect(page.filename).toHaveValue("main.bean");
    expect(page.contents).toHaveValue("; café 4.00995 BTC\n");

    fireEvent.change(page.filename, { target: { value: "new.bean" } });
    expect(page.save()).toBeEnabled();
    expect(page.requests).toEqual([
      "GetLedgerDirContent",
      "GetLedgerDirContent",
      "GetLedgerDirContent",
    ]);
  });

  it("says it is checking while the first read is pending", async () => {
    let release!: (names: string[]) => void;
    const page = await createForm([
      new Promise<string[]>((resolve) => (release = resolve)),
    ]);
    await page.draft("main.bean");

    expect(page.checking()).toBeInTheDocument();
    expect(page.save()).toBeDisabled();
    await act(async () => release(["main.bean"]));
    await waitFor(() => expect(page.clash()).toBeInTheDocument());
    expect(page.checking()).toBeNull();
  });

  it("allows a new name once an empty folder has been read", async () => {
    const page = await createForm([[]]);
    await page.draft("new.bean");
    await waitFor(() => expect(page.save()).toBeEnabled());
    expect(page.checkFailed()).toBeNull();
    expect(page.checking()).toBeNull();
  });

  it("allows a nested name, which never clashes, even when the read failed", async () => {
    const page = await createForm(["fail"]);
    await page.draft("reports/new.bean");
    await waitFor(() => expect(page.checkFailed()).toBeInTheDocument());
    expect(page.save()).toBeEnabled();
  });

  it("treats a folder that does not exist yet as empty, not failed", async () => {
    const page = await createForm(["notFound"], "FY2030");
    await page.draft("main.bean");
    await waitFor(() => expect(page.save()).toBeEnabled());
    expect(page.checkFailed()).toBeNull();
    expect(page.clash()).toBeNull();
  });

  it("keeps a listing it already read when a later refresh fails", async () => {
    const page = await createForm([["main.bean"], "fail"]);
    await page.draft("main.bean");
    await waitFor(() => expect(page.clash()).toBeInTheDocument());

    await act(async () => {
      await page.client.refetchQueries({ include: "active" }).catch(() => {});
    });
    // The refresh was sent and failed; the listing already read still counts.
    expect(page.requests.length).toBeGreaterThan(1);
    expect(page.clash()).toBeInTheDocument();
    expect(page.checkFailed()).toBeNull();
    expect(page.save()).toBeDisabled();
  });
});

describe("Upload Files' name check when the folder read fails", () => {
  it("holds Upload, keeps the staged file, and restores the clash on retry", async () => {
    const page = await uploadForm(["fail", "fail", ["main.bean"]]);
    await page.user.type(page.comment, "synthetic upload");
    page.choose("main.bean");

    await waitFor(() => expect(page.checkFailed()).toBeInTheDocument());
    expect(page.clash()).toBeNull();
    expect(page.upload()).toBeDisabled();

    await page.retryFails();
    expect(page.tryAgain()).toHaveFocus();
    expect(page.upload()).toBeDisabled();

    await page.user.click(page.tryAgain());
    await waitFor(() => expect(page.clash()).toBeInTheDocument());
    expect(
      screen.getByText(page.t("ledgerEditor.removeExistingFiles")),
    ).toBeInTheDocument();
    expect(page.checkFailed()).toBeNull();
    expect(page.upload()).toBeDisabled();
    expect(page.staged("main.bean")).toBeInTheDocument();
    expect(page.comment).toHaveValue("synthetic upload");
    expect(page.requests.every((name) => name === "GetLedgerDirContent")).toBe(
      true,
    );
  });

  it("says it is checking while the first read is pending", async () => {
    let release!: (names: string[]) => void;
    const page = await uploadForm([
      new Promise<string[]>((resolve) => (release = resolve)),
    ]);
    page.choose("main.bean");

    expect(page.checking()).toBeInTheDocument();
    expect(page.upload()).toBeDisabled();
    await act(async () => release(["main.bean"]));
    await waitFor(() => expect(page.clash()).toBeInTheDocument());
    expect(page.checking()).toBeNull();
  });

  it("allows a new file once an empty folder has been read", async () => {
    const page = await uploadForm([[]]);
    page.choose("new.bean");
    await waitFor(() => expect(page.upload()).toBeEnabled());
    expect(page.checkFailed()).toBeNull();
  });
});
