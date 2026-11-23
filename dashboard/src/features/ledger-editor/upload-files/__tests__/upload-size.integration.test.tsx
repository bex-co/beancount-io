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
  act,
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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { base64Encode } from "@/common/lib/utils/encode";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import UploadFilesPage from "../index";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
const access = vi.hoisted(() => ({ canWrite: true }));
vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => true,
}));
vi.mock("@/common/hooks/use-auth-status", () => ({
  useAuthStatus: () => "signed-in",
}));
vi.mock("@/common/providers/ledger-provider", () => ({
  useLedger: () => ({
    ledgerName: "Books",
    ledgerData: { permissions: { pull: true, push: access.canWrite } },
  }),
}));
const Revision = createContext(0);
function PageFixture() {
  useContext(Revision);
  return <UploadFilesPage />;
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
  language = "en" as "en" | "de",
  dir = "FY2024/帳簿 exports",
  canWrite = true,
  failFirstUpload = false,
  failRefresh = false,
  holdUploads = false,
} = {}) {
  const held: Array<() => void> = [];
  access.canWrite = canWrite;
  const requests: Array<{ name: string; variables: Record<string, unknown> }> =
    [];
  const mutations: Array<Record<string, unknown>> = [];
  const reads = vi.spyOn(FileReader.prototype, "readAsDataURL");
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            name: operation.operationName,
            variables: operation.variables,
          });
          if (operation.operationName === "CreateLedgerFile") {
            mutations.push(operation.variables);
            if (holdUploads) {
              const variables = operation.variables;
              held.push(() => {
                observer.next({
                  data: {
                    createLedgerFile: {
                      __typename: "LedgerFileContent",
                      name: String(variables.path).split("/").at(-1),
                      path: variables.path,
                      content: variables.content,
                      type: "file",
                      encoding: "base64",
                      size: 0,
                      sha: "synthetic-sha",
                      lastCommitSha: null,
                      lastAuthorDate: null,
                      lastCommitterDate: null,
                      notLoaded: null,
                    },
                  },
                });
                observer.complete();
              });
              return;
            }
            if (failFirstUpload && mutations.length === 1) {
              observer.error(new Error("Synthetic upload failure"));
              return;
            }
            observer.next({
              data: {
                createLedgerFile: {
                  __typename: "LedgerFileContent",
                  name: String(operation.variables.path).split("/").at(-1),
                  path: operation.variables.path,
                  content: operation.variables.content,
                  type: "file",
                  encoding: "base64",
                  size: 0,
                  sha: "synthetic-sha",
                  lastCommitSha: null,
                  lastAuthorDate: null,
                  lastCommitterDate: null,
                  notLoaded: null,
                },
              },
            });
          } else if (operation.operationName === "GetLedgerDirContent") {
            // The first read is the page's own; later ones refresh after writes.
            if (failRefresh && mutations.length > 0) {
              observer.error(new Error("Synthetic refresh failure"));
              return;
            }
            observer.next({ data: { getLedgerDirContent: [] } });
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
  const uploadRoute = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/files/upload/$branch/$",
    component: PageFixture,
  });
  const treeRoute = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
    component: () => <h1>Files destination</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([uploadRoute, treeRoute]),
    history: createMemoryHistory({
      initialEntries: [
        `/ledger/alice/books/files/upload/main${dir ? `/${encodeURI(dir)}` : ""}`,
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
    name: localization.i18n.t("ledgerEditor.uploadFiles"),
  });
  const picker = () =>
    view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const upload = () =>
    screen.getByRole("button", {
      name: localization.i18n.t("ledgerEditor.uploadFiles"),
    });
  const drop = (files: File[]) => {
    const target = screen
      .getByText(localization.i18n.t("ledgerEditor.dragFilesHere"))
      .closest(".border-dashed")!;
    fireEvent.dragOver(target);
    fireEvent.drop(target, { dataTransfer: { files } });
  };
  return {
    ...view,
    requests,
    mutations,
    reads,
    router,
    localization,
    picker,
    upload,
    drop,
    dir,
    refreshPermission: () => view.rerender(contents(1)),
    held,
  };
}

const explanations = {
  en: "Remove files over 1 MB to upload",
  de: "Entfernen Sie Dateien über 1 MB, um sie hochzuladen",
};
const thirty = "123456789012345678901234567890";
function mixedFiles() {
  return [
    new File([new Uint8Array(12_000_000)], "qa-big.bin"),
    new File([], "qa-empty.bean"),
    new File(["x"], "qa name with spaces.bean"),
    new File([thirty], "給与 30.bean"),
  ];
}

describe("upload size enforcement with native files and readers", () => {
  it.each(
    (["en", "de"] as const).flatMap((language) =>
      (["chooser", "drop"] as const).map(
        (method) => [language, method] as const,
      ),
    ),
  )(
    "blocks a mixed %s %s selection, then uploads the exact valid bytes after removal",
    async (language, method) => {
      const {
        picker,
        upload,
        drop,
        reads,
        mutations,
        localization,
        requests,
        router,
        dir,
      } = await setup({ language });
      const files = mixedFiles();
      const user = userEvent.setup();
      if (method === "chooser") {
        const choose = vi.spyOn(picker(), "click");
        await user.click(
          screen.getByRole("button", {
            name: localization.i18n.t("ledgerEditor.chooseYourFiles"),
          }),
        );
        expect(choose).toHaveBeenCalledTimes(1);
        await user.upload(picker(), files);
      } else drop(files);
      for (const [file, size] of files.map(
        (file, index) =>
          [file, ["11.4 MB", "0 B", "1 B", "30 B"][index]] as const,
      )) {
        expect(screen.getByText(file.name).parentElement).toHaveTextContent(
          `(${size})`,
        );
      }
      expect(upload()).toBeDisabled();
      expect(upload()).toHaveAccessibleDescription(explanations[language]);
      fireEvent.click(upload());
      expect(reads).not.toHaveBeenCalled();
      expect(mutations).toHaveLength(0);
      fireEvent.change(
        screen.getByRole("textbox", {
          name: localization.i18n.t("ledgerEditor.commitMessage"),
        }),
        { target: { value: "  Synthetic upload یادداشت  " } },
      );
      await user.click(
        screen.getByRole("button", {
          name: localization.i18n.t("ledgerEditor.removeSelectedFile", {
            fileName: files[0].name,
          }),
        }),
      );
      expect(screen.queryByText(files[0].name)).not.toBeInTheDocument();
      expect(upload()).toBeEnabled();
      expect(upload()).not.toHaveAttribute("aria-describedby");
      await user.click(upload());
      await screen.findByRole("heading", { name: "Files destination" });
      expect(reads.mock.calls.map(([file]) => file)).toEqual(files.slice(1));
      expect(mutations).toEqual(
        files.slice(1).map((file, index) => ({
          ledgerId: "alice/books",
          path: `${dir}/${file.name}`,
          content: ["", base64Encode("x"), base64Encode(thirty)][index],
          message: `Synthetic upload یادداشت - ${file.name}`,
        })),
      );
      expect(requests.map(({ name }) => name)).toEqual([
        // The page reads the folder first to flag names that already exist.
        "GetLedgerDirContent",
        "CreateLedgerFile",
        "CreateLedgerFile",
        "CreateLedgerFile",
        // One folder read after the batch, separate from the writes (w4/248).
        "GetLedgerDirContent",
      ]);
      expect(
        requests
          .filter(({ name }) => name === "GetLedgerDirContent")
          .map(({ variables }) => variables),
      ).toEqual(
        Array.from({ length: 2 }, () => ({
          ledgerId: "alice/books",
          dirPath: dir,
        })),
      );
      expect(router.state.matches.at(-1)?.params).toMatchObject({
        ledgerOwner: "alice",
        ledgerName: "books",
        branch: "main",
        _splat: dir,
      });
    },
  );

  it.each(["en", "de"] as const)(
    "sends a true empty %s file as empty base64 rather than a data URI",
    async (language) => {
      const { picker, upload, mutations } = await setup({ language });
      await userEvent.setup().upload(picker(), new File([], "empty.bean"));
      await userEvent.setup().click(upload());
      await screen.findByRole("heading", { name: "Files destination" });
      expect(mutations).toHaveLength(1);
      expect(mutations[0].content).toBe("");
    },
  );

  it("blocks one byte above 1 MiB and uploads exactly 1 MiB after removal", async () => {
    const { drop, upload, localization, reads, mutations, dir } = await setup();
    const source = "a".repeat(1024 * 1024);
    const boundaryFile = new File([source], "boundary.bin");
    const over = new File(
      [new Uint8Array(1024 * 1024 + 1)],
      "one-byte-over.bin",
    );
    drop([boundaryFile, over]);
    expect(upload()).toBeDisabled();
    fireEvent.click(upload());
    expect(reads).not.toHaveBeenCalled();
    expect(mutations).toHaveLength(0);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", {
        name: localization.i18n.t("ledgerEditor.removeSelectedFile", {
          fileName: over.name,
        }),
      }),
    );
    expect(upload()).toBeEnabled();
    await user.click(upload());
    await screen.findByRole("heading", { name: "Files destination" });
    expect(reads).toHaveBeenCalledExactlyOnceWith(boundaryFile);
    expect(mutations).toHaveLength(1);
    expect(mutations[0]).toEqual({
      ledgerId: "alice/books",
      path: `${dir}/boundary.bin`,
      content: btoa(source),
      message: "Upload 1 file(s) - boundary.bin",
    });
  });

  it("keeps selection through chooser cancellation and reselects the same file after removal", async () => {
    const { picker, upload, localization, reads, mutations } = await setup({
      dir: "",
    });
    const file = new File(["Café یادداشت\n"], "same file.bean", {
      type: "text/plain",
    });
    const user = userEvent.setup();
    await user.upload(picker(), file);
    expect(picker().value).toBe("");
    await user.upload(picker(), []);
    expect(screen.getByText(file.name)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: localization.i18n.t("ledgerEditor.removeSelectedFile", {
          fileName: file.name,
        }),
      }),
    );
    expect(screen.queryByText(file.name)).not.toBeInTheDocument();
    expect(upload()).toBeDisabled();
    await user.upload(picker(), file);
    expect(screen.getByText(file.name)).toBeInTheDocument();
    expect(reads).not.toHaveBeenCalled();
    await user.click(upload());
    await screen.findByRole("heading", { name: "Files destination" });
    expect(reads).toHaveBeenCalledExactlyOnceWith(file);
    expect(mutations[0]).toEqual({
      ledgerId: "alice/books",
      path: file.name,
      content: base64Encode("Café یادداشت\n"),
      message: `Upload 1 file(s) - ${file.name}`,
    });
  });

  it("denies a reader's direct upload route without mounting a picker or reading files", async () => {
    const { picker, localization, reads, mutations, dir, router } = await setup(
      { canWrite: false },
    );
    expect(picker()).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: localization.i18n.t("ledgerEditor.uploadFiles"),
      }),
    ).not.toBeInTheDocument();
    const parent = screen.getByRole("link", {
      name: localization.i18n.t("ledgerEditor.browseParentDirectory"),
    });
    expect(decodeURI(parent.getAttribute("href")!)).toBe(
      `/ledger/alice/books/files/tree/main/${dir}`,
    );
    expect(reads).not.toHaveBeenCalled();
    expect(mutations).toHaveLength(0);
    await userEvent.setup().click(parent);
    await screen.findByRole("heading", { name: "Files destination" });
    expect(router.state.matches.at(-1)?.params).toMatchObject({ _splat: dir });
  });

  it("retains staged files but stops upload when write permission is lost", async () => {
    const { drop, upload, reads, mutations, refreshPermission } = await setup();
    const file = new File(["draft"], "staged.bean");
    drop([file]);
    access.canWrite = false;
    refreshPermission();
    expect(screen.getByText(file.name)).toBeInTheDocument();
    expect(upload()).toBeDisabled();
    fireEvent.click(upload());
    expect(reads).not.toHaveBeenCalled();
    expect(mutations).toHaveLength(0);
  });

  it("keeps a failed upload's selection and retries the same exact bytes and custom commit", async () => {
    const { drop, upload, reads, mutations, localization, router, dir } =
      await setup({ failFirstUpload: true });
    const file = new File(["Original Café یادداشت\n"], "retry name.bean", {
      type: "text/plain",
    });
    drop([file]);
    fireEvent.change(
      screen.getByRole("textbox", {
        name: localization.i18n.t("ledgerEditor.commitMessage"),
      }),
      { target: { value: "  Retry upload  " } },
    );
    const user = userEvent.setup();
    await user.click(upload());
    await waitFor(() => expect(mutations).toHaveLength(1));
    await waitFor(() => expect(upload()).toBeEnabled());
    expect(screen.getByText(file.name)).toBeInTheDocument();
    expect(router.state.location.pathname).toContain("/files/upload/main/");
    await user.click(upload());
    await screen.findByRole("heading", { name: "Files destination" });
    const expected = {
      ledgerId: "alice/books",
      path: `${dir}/${file.name}`,
      content: base64Encode("Original Café یادداشت\n"),
      message: `Retry upload - ${file.name}`,
    };
    expect(mutations).toEqual([expected, expected]);
    expect(reads.mock.calls.map(([read]) => read)).toEqual([file, file]);
  });

  it("finishes a batch whose writes landed even when the folder refresh fails (w4/248)", async () => {
    const { picker, upload, mutations } = await setup({ failRefresh: true });
    const user = userEvent.setup();
    await user.upload(picker(), [
      new File(["a\n"], "refetch-a.txt", { type: "text/plain" }),
      new File(["b\n"], "refetch-b.txt", { type: "text/plain" }),
    ]);
    await user.click(upload());
    await screen.findByRole("heading", { name: "Files destination" });
    expect(mutations.map((m) => String(m.path).split("/").at(-1))).toEqual([
      "refetch-a.txt",
      "refetch-b.txt",
    ]);
    expect(screen.queryByText(/wasn't uploaded/)).toBeNull();
  });

  it("does not stage a file dropped while a batch is uploading (w4/259)", async () => {
    const { picker, upload, drop, mutations, held } = await setup({
      holdUploads: true,
    });
    const user = userEvent.setup();
    await user.upload(picker(), [
      new File(["a\n"], "pending-a.txt", { type: "text/plain" }),
    ]);
    await user.click(upload());
    await waitFor(() => expect(held).toHaveLength(1));

    drop([new File(["b\n"], "late-b.txt", { type: "text/plain" })]);
    expect(screen.queryByText("late-b.txt")).toBeNull();

    await act(async () => held[0]!());
    await screen.findByRole("heading", { name: "Files destination" });
    expect(mutations.map((m) => String(m.path).split("/").at(-1))).toEqual([
      "pending-a.txt",
    ]);
  });
});
