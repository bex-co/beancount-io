/**
 * Out of date → Refresh evicts the whole Apollo cache. Apollo then refetches
 * every query with the old result still in `data`, and the ledger layout used
 * to answer that with its loading shell — unmounting the page, so an unsaved
 * file or an unexecuted BQL query vanished (w4/m46). These cases drive the
 * real router, LedgerLayout, Out of date indicator, file editor, BQL page and
 * Apollo cache; only Monaco and the layout's unrelated chrome are stubbed.
 */
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
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import type { EditorProps } from "@monaco-editor/react";
import type { SelectionNode } from "graphql";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { base64Decode, base64Encode } from "@/common/lib/utils/encode";
import { GetLatestLedgerCommitDocument } from "@/graphql/definitions";
import LedgerFileView from "@/features/ledger-editor/file-editor/components/ledger-file-view";
import LedgerQueryPage from "@/features/bql/pages";
import { LedgerLayout } from "../index";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
  Toaster: () => null,
}));
vi.mock("@/common/components/billing/failed-renewal-banner", () => ({
  FailedRenewalBanner: () => null,
}));
vi.mock("../ledger-sidebar", () => ({ LedgerSidebar: () => null }));
vi.mock("../ledger-layout-background-queries", () => ({
  LedgerLayoutBackgroundQueries: () => null,
}));
// The real header is mostly navigation; keep only its real refresh control.
vi.mock("../layout-header", async () => {
  const { LedgerOutOfDateIndicator } =
    await import("../ledger-out-of-date-indicator");
  return {
    LayoutHeader: ({ ledgerId }: { ledgerId: string }) => (
      <LedgerOutOfDateIndicator ledgerId={ledgerId} />
    ),
  };
});
vi.mock("@/common/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/common/hooks/use-write-outcome", () => ({
  useWriteOutcome: () => ({ snapshot: () => null, report: async () => false }),
}));
vi.mock("@/common/analytics", () => ({ track: vi.fn() }));
vi.mock("@/common/components/page-header", () => ({ PageHeader: () => null }));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

// Monaco's browser runtime only: the editors keep their own value, change and
// mount handling. Unknown Monaco API surface is a no-op.
vi.mock("@/common/components/monaco-editor", async () => {
  const { useEffect, useRef } = await import("react");
  const noop: object = new Proxy(function () {}, {
    get: (_target, key) =>
      key === "then" ? undefined : key === Symbol.toPrimitive ? () => 0 : noop,
    apply: () => noop,
  });
  return {
    MonacoEditor: (props: EditorProps) => {
      const latest = useRef(props);
      const input = useRef<HTMLTextAreaElement>(null);
      latest.current = props;
      useEffect(() => {
        const model = new Proxy(
          {
            getLineCount: () => (input.current?.value ?? "").split("\n").length,
            getLineMaxColumn: () => 1,
            getValue: () => input.current?.value ?? "",
          },
          { get: (target, key) => Reflect.get(target, key) ?? noop },
        );
        const editor = new Proxy(
          {
            getModel: () => model,
            getDomNode: () => input.current,
            getValue: () => input.current?.value ?? "",
            hasTextFocus: () => document.activeElement === input.current,
            focus: () => input.current?.focus(),
            deltaDecorations: () => [],
            getContribution: () => undefined,
          },
          { get: (target, key) => Reflect.get(target, key) ?? noop },
        );
        latest.current.beforeMount?.(noop as never);
        latest.current.onMount?.(editor as never, noop as never);
      }, []);
      return (
        <textarea
          ref={input}
          aria-label={
            (props.language ?? props.defaultLanguage) === "bql"
              ? "BQL source"
              : "File source"
          }
          readOnly={Boolean(props.options?.readOnly)}
          value={props.value ?? ""}
          onChange={(event) =>
            props.onChange?.(event.target.value, {} as never)
          }
        />
      );
    },
  };
});

const OWNER = "qa";
const NAME = "books";
const LEDGER_ID = `${OWNER}/${NAME}`;
const PATH = "notes.txt";

/** Complete data for any operation: every selected field, nulls by default. */
function fill(
  selections: readonly SelectionNode[],
  values: Record<string, unknown> = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const node of selections) {
    if (node.kind !== "Field") continue;
    const key = node.alias?.value ?? node.name.value;
    const value = values[key];
    if (key === "__typename") out[key] = "Fixture";
    else if (
      node.selectionSet &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    )
      out[key] = fill(
        node.selectionSet.selections,
        value as Record<string, unknown>,
      );
    else if (value !== undefined) out[key] = value;
    else if (node.selectionSet) out[key] = fill(node.selectionSet.selections);
    else out[key] = null;
  }
  return out;
}

type Reply = Record<string, unknown> | Error;
const REMOTE = "qa-20261022 remote revision\n";

const initialServer = () => ({
  head: "c1",
  file: { sha: "s1", text: "qa-20261022 original\n" },
  /** While set, reads wait for `release()`; a hold queues one reply each. */
  hold: false,
  held: [] as Array<() => void>,
  fail: false,
  updates: [] as Array<Record<string, unknown>>,
  updateReply: undefined as Error | undefined,
  queries: [] as string[],
  reads: [] as string[],
});
const server = initialServer();

function reply(
  operationName: string,
  variables: Record<string, unknown>,
): Reply {
  switch (operationName) {
    case "GetLedger":
      return {
        getLedger: {
          id: variables.ledgerId,
          name: String(variables.ledgerId).split("/")[1],
          fullName: variables.ledgerId,
          permissions: { admin: false, pull: true, push: true },
          options: { operatingCurrency: ["USD"], renderCommas: true },
        },
      };
    case "GetLatestLedgerCommit":
      return { getLatestLedgerCommit: { sha: server.head } };
    case "GetLedgerFile": {
      const path = String(variables.path);
      const file =
        path === PATH ? server.file : { sha: "o1", text: `other ${path}\n` };
      return {
        getLedgerFile: {
          name: path,
          path,
          type: "file",
          sha: file.sha,
          size: file.text.length,
          content: base64Encode(file.text),
        },
      };
    }
    case "GetLedgerErrors":
      return { getLedgerErrors: [] };
    case "UpdateLedgerFile":
      server.updates.push(variables);
      if (server.updateReply) return server.updateReply;
      // A saved file is a new commit on the ledger.
      server.head = "c3";
      server.file = {
        sha: "s3",
        text: base64Decode(String(variables.content)),
      };
      return { updateLedgerFile: { sha: "s3" } };
    case "QueryShell":
      server.queries.push(String(variables.query));
      return {
        queryShell: { resultType: "table", table: { types: [], rows: [] } },
      };
    default:
      return {};
  }
}

const link = new ApolloLink(
  (operation) =>
    new Observable((observer) => {
      const isRead = !/^\s*mutation/.test(
        operation.query.loc?.source.body ?? "",
      );
      const send = () => {
        if (isRead) server.reads.push(operation.operationName ?? "");
        if (
          server.fail &&
          isRead &&
          operation.operationName !== "GetLatestLedgerCommit"
        ) {
          observer.error(new Error("network down"));
          return;
        }
        const data = reply(operation.operationName ?? "", operation.variables);
        if (data instanceof Error) {
          observer.error(data);
          return;
        }
        const definition = operation.query.definitions.find(
          (item) => item.kind === "OperationDefinition",
        );
        observer.next({
          data:
            definition && "selectionSet" in definition
              ? fill(definition.selectionSet.selections, data)
              : data,
        });
        observer.complete();
      };
      if (server.hold && isRead) server.held.push(send);
      else send();
    }),
);

function release() {
  server.hold = false;
  const queued = server.held.splice(0);
  queued.forEach((send) => send());
}

let client: ApolloClient;

function renderAt(url: string) {
  client = new ApolloClient({ cache: new InMemoryCache(), link });
  const root = createRootRouteWithContext<{ userProfile: unknown }>()({
    component: Outlet,
  });
  const ledger = createRoute({
    getParentRoute: () => root,
    path: "ledger/$ledgerOwner/$ledgerName",
    component: LedgerLayout,
  });
  const query = createRoute({
    getParentRoute: () => ledger,
    path: "query",
    validateSearch: (search: Record<string, unknown>) => ({
      query: typeof search.query === "string" ? search.query : undefined,
    }),
    component: LedgerQueryPage,
  });
  const file = createRoute({
    getParentRoute: () => ledger,
    path: "files/blob/$branch/$",
    validateSearch: (search: Record<string, unknown>) => ({
      editMode:
        search.editMode === true || search.editMode === "true" || undefined,
    }),
    component: function FileRoute() {
      const params = file.useParams();
      const { editMode } = file.useSearch();
      return (
        <LedgerFileView
          ledgerId={LEDGER_ID}
          filePath={params._splat ?? ""}
          isEditMode={editMode}
        />
      );
    },
  });
  const router = createRouter({
    routeTree: root.addChildren([ledger.addChildren([query, file])]),
    history: createMemoryHistory({ initialEntries: [url] }),
    context: { userProfile: { id: "qa-owner" } },
  });
  render(
    <ApolloProvider client={client}>
      <RouterProvider router={router} />
    </ApolloProvider>,
  );
  return router;
}

/** Another writer commits; the indicator's next poll notices it. */
async function remoteCommit(text = REMOTE) {
  server.head = "c2";
  server.file = { sha: "s2", text };
  await act(async () => {
    await client.refetchQueries({ include: [GetLatestLedgerCommitDocument] });
  });
  return screen.findByRole("button", {
    name: "Out of date — click to refresh",
  });
}

const fileSource = () => screen.getByRole("textbox", { name: "File source" });

/** Refresh, then wait for the indicator to clear as the reads land. */
async function refreshAndSettle() {
  fireEvent.click(await remoteCommit());
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: /Out of date/ })).toBeNull(),
  );
}

beforeEach(() => {
  Object.assign(server, initialServer());
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.success).mockClear();
  localStorage.clear();
});
afterEach(cleanup);

describe("Out of date → Refresh with an unsaved file", () => {
  const DRAFT = "qa-20261022 original\nLOCAL_BUFFER_m46\n";

  async function editDraft() {
    const router = renderAt(
      `/ledger/${LEDGER_ID}/files/blob/main/${PATH}?editMode=true`,
    );
    const editor = await screen.findByRole("textbox", { name: "File source" });
    await waitFor(() => expect(editor).not.toHaveAttribute("readonly"));
    fireEvent.change(editor, { target: { value: DRAFT } });
    editor.focus();
    return { router, editor, main: screen.getByRole("main") };
  }

  it("keeps the page, editor and draft while the refresh loads and after it lands", async () => {
    const { editor, main } = await editDraft();
    const refresh = await remoteCommit();

    server.hold = true;
    fireEvent.click(refresh);
    await waitFor(() => expect(server.held.length).toBeGreaterThan(0));
    expect(screen.getByRole("main")).toBe(main);
    expect(fileSource()).toBe(editor);
    expect(editor).toHaveValue(DRAFT);

    await act(async () => release());
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Out of date/ })).toBeNull(),
    );
    expect(screen.getByRole("main")).toBe(main);
    expect(fileSource()).toBe(editor);
    expect(editor).toHaveValue(DRAFT);
    expect(editor).not.toHaveAttribute("readonly");
  });

  it("saves the draft against the revision it was edited from, and keeps it when refused", async () => {
    const { editor } = await editDraft();
    await refreshAndSettle();

    server.updateReply = new Error("File was changed since it was opened");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(server.updates).toHaveLength(1));
    expect(server.updates[0]).toMatchObject({ path: PATH, sha: "s1" });
    expect(base64Decode(String(server.updates[0]!.content))).toBe(DRAFT);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(fileSource()).toBe(editor);
    expect(editor).toHaveValue(DRAFT);
    expect(editor).not.toHaveAttribute("readonly");
  });

  it("takes the refreshed file only on an explicit discard", async () => {
    const { router, editor } = await editDraft();
    await refreshAndSettle();
    expect(editor).toHaveValue(DRAFT);

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Leave Without Saving" }),
    );
    await waitFor(() =>
      expect(router.state.location.search).not.toHaveProperty("editMode", true),
    );
    await waitFor(() => expect(fileSource()).toHaveValue(REMOTE));
    expect(server.updates).toHaveLength(0);
  });

  it("keeps the draft and reports a refresh that fails, without an error page", async () => {
    const { editor, main } = await editDraft();
    const refresh = await remoteCommit();

    server.fail = true;
    fireEvent.click(refresh);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          id: "ledger-refresh-failed",
          action: expect.objectContaining({ label: "Try Again" }),
        }),
      ),
    );
    expect(screen.getByRole("main")).toBe(main);
    expect(fileSource()).toBe(editor);
    expect(editor).toHaveValue(DRAFT);
    expect(screen.queryByText(/Failed to load/i)).toBeNull();
    // One toast for the ledger and file failures, whose Try again refetches.
    expect(
      new Set(
        vi.mocked(toast.error).mock.calls.map(([, options]) => options?.id),
      ),
    ).toEqual(new Set(["ledger-refresh-failed"]));

    server.fail = false;
    server.reads = [];
    const [, options] = vi.mocked(toast.error).mock.calls.at(-1)!;
    const action = options?.action as { onClick: () => void };
    await act(async () => action.onClick());
    await waitFor(() => expect(server.reads.length).toBeGreaterThan(0));
    expect(fileSource()).toBe(editor);
    expect(editor).toHaveValue(DRAFT);
  });
});

describe("Saving a file", () => {
  const SAVED = "qa-20261101 original\nsaved by this tab\n";

  async function save() {
    renderAt(`/ledger/${LEDGER_ID}/files/blob/main/${PATH}?editMode=true`);
    const editor = await screen.findByRole("textbox", { name: "File source" });
    await waitFor(() => expect(editor).not.toHaveAttribute("readonly"));
    fireEvent.change(editor, { target: { value: SAVED } });
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    await waitFor(() => expect(fileSource()).toHaveValue(SAVED));
  }

  /** The indicator's next poll, after the save's refetches have settled. */
  async function poll() {
    await act(async () => {
      await client.refetchQueries({ include: [GetLatestLedgerCommitDocument] });
    });
  }

  it("does not report the user's own save as out of date (w3/650)", async () => {
    await save();
    expect(server.head).toBe("c3");
    await poll();
    await poll();
    expect(screen.queryByRole("button", { name: /Out of date/ })).toBeNull();
  });

  it("still reports a commit made elsewhere after the save", async () => {
    await save();
    await poll();
    expect(await remoteCommit()).toBeInTheDocument();
  });
});

describe("a retained draft and the file identity", () => {
  it("never shows a draft on another file", async () => {
    // other.txt is already cached, so returning to it renders at once.
    const router = renderAt(`/ledger/${LEDGER_ID}/files/blob/main/other.txt`);
    await waitFor(() => expect(fileSource()).toHaveValue("other other.txt\n"));
    await act(async () => {
      await router.navigate({
        to: `/ledger/${LEDGER_ID}/files/blob/main/${PATH}`,
        search: { editMode: true },
      });
    });
    await waitFor(() => expect(fileSource()).toHaveValue(server.file.text));
    const editor = fileSource();
    await waitFor(() => expect(editor).not.toHaveAttribute("readonly"));
    fireEvent.change(editor, { target: { value: "LOCAL_BUFFER_m46\n" } });

    await act(async () => {
      await router.navigate({
        to: `/ledger/${LEDGER_ID}/files/blob/main/other.txt`,
        search: { editMode: true },
        ignoreBlocker: true,
      });
    });
    await waitFor(() => expect(fileSource()).toHaveValue("other other.txt\n"));
    expect(fileSource()).not.toBe(editor);
  });
});

describe("identity isolation around a refresh", () => {
  it("never keeps one ledger's page while another ledger loads", async () => {
    const router = renderAt(`/ledger/${LEDGER_ID}/files/blob/main/${PATH}`);
    await waitFor(() => expect(fileSource()).toHaveValue(server.file.text));
    const main = screen.getByRole("main");

    server.hold = true;
    await act(async () => {
      void router.navigate({
        to: `/ledger/${OWNER}/other/files/blob/main/${PATH}`,
      });
    });
    await waitFor(() => expect(server.held.length).toBeGreaterThan(0));
    expect(main.isConnected).toBe(false);
    expect(screen.queryByRole("textbox", { name: "File source" })).toBeNull();

    await act(async () => release());
    await waitFor(() => expect(fileSource()).toHaveValue(server.file.text));
    expect(screen.getByRole("main")).not.toBe(main);
  });

  it("does not let a delayed read of the old file land on the new one", async () => {
    const router = renderAt(`/ledger/${LEDGER_ID}/files/blob/main/${PATH}`);
    await waitFor(() => expect(fileSource()).toHaveValue(server.file.text));
    const refresh = await remoteCommit();

    // Refresh starts the old file's read; leave for another file before it lands.
    server.hold = true;
    fireEvent.click(refresh);
    await waitFor(() => expect(server.held.length).toBeGreaterThan(0));
    await act(async () => {
      await router.navigate({
        to: `/ledger/${LEDGER_ID}/files/blob/main/other.txt`,
      });
    });
    await act(async () => release());

    await waitFor(() => expect(fileSource()).toHaveValue("other other.txt\n"));
    expect(fileSource()).not.toHaveValue(REMOTE);
  });
});

describe("Out of date → Refresh in view mode", () => {
  it("shows the refreshed file in the same editor", async () => {
    renderAt(`/ledger/${LEDGER_ID}/files/blob/main/${PATH}`);
    const editor = await screen.findByRole("textbox", { name: "File source" });
    await waitFor(() => expect(editor).toHaveValue("qa-20261022 original\n"));

    fireEvent.click(await remoteCommit());
    await waitFor(() => expect(fileSource()).toHaveValue(REMOTE));
    expect(fileSource()).toBe(editor);
  });
});

describe("Out of date → Refresh with an unexecuted BQL query", () => {
  it("keeps the query, then Execute sends it unchanged", async () => {
    renderAt(`/ledger/${LEDGER_ID}/query`);
    const editor = await screen.findByRole("textbox", { name: "BQL source" });
    const main = screen.getByRole("main");
    const draft = "select * from accounts limit 3";
    fireEvent.change(editor, { target: { value: draft } });
    expect(editor).toHaveValue(draft);

    const refresh = await remoteCommit();
    server.hold = true;
    fireEvent.click(refresh);
    await waitFor(() => expect(server.held.length).toBeGreaterThan(0));
    expect(screen.getByRole("main")).toBe(main);
    expect(screen.getByRole("textbox", { name: "BQL source" })).toBe(editor);
    await act(async () => release());

    expect(screen.getByRole("main")).toBe(main);
    expect(editor).toHaveValue(draft);
    await userEvent.click(
      screen.getByRole("button", { name: /Execute Query/ }),
    );
    await waitFor(() => expect(server.queries).toEqual([draft]));
  });
});
