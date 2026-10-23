import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { EntryContextPanel } from "../entry-context-panel";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: true }),
}));
vi.mock("@/common/hooks/use-file-navigate", () => ({
  useFileNavigate: () => vi.fn(),
}));
vi.mock("@/common/hooks/use-write-outcome", () => ({
  useWriteOutcome: () => ({ snapshot: () => null, report: async () => false }),
}));
vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useApolloCacheClear: () => vi.fn(),
}));
vi.mock("@/common/hooks/use-theme", () => ({ useIsDarkTheme: () => false }));
vi.mock("@/common/hooks/use-mobile", () => ({ useIsMobile: () => false }));
// Monaco cannot run in jsdom; a textarea honours the same value, change and
// readOnly contract the panel gives the editor.
vi.mock("@/common/components/monaco-editor", () => ({
  MonacoEditor: ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange?: (value: string | undefined) => void;
    options?: { readOnly?: boolean };
  }) => (
    <textarea
      aria-label="Entry source"
      value={value}
      readOnly={options?.readOnly}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));
vi.mock("@/common/lib/editor/monaco-beancount-language-vscode", () => ({
  registerBeancountLanguage: vi.fn(),
}));

const SOURCE = '2024-01-01 * "Cafe" "Coffee"\n  Assets:Cash  -4 USD\n';
const NEWER = '2024-01-01 * "Cafe" "Coffee and cake"\n  Assets:Cash  -6 USD\n';

type Read = { answer: (slice: string, sha: string) => void; fail: () => void };

/** Context reads the test answers by hand; saves are recorded and accepted. */
function entryClient() {
  const reads: Read[] = [];
  const saves: { newContent: string; sha256sum: string }[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          if (operation.operationName === "UpdateLedgerEntrySourceSlice") {
            const input = operation.variables.input as {
              entryHash: string;
              newContent: string;
              sha256sum: string;
            };
            saves.push({
              newContent: input.newContent,
              sha256sum: input.sha256sum,
            });
            observer.next({
              data: {
                updateLedgerEntrySourceSlice: {
                  __typename: "UpdateSourceSliceResult",
                  newSha256sum: "sha-3",
                  message: "ok",
                  entryHash: input.entryHash,
                },
              },
            });
            observer.complete();
            return;
          }
          reads.push({
            answer: (slice, sha) => {
              observer.next({
                data: {
                  getLedgerEntryContext: {
                    __typename: "LedgerEntryContext",
                    slice,
                    sha256sum: sha,
                    entry: { meta: { filename: "main.bean", lineno: 3 } },
                    balances_before: null,
                    balances_after: null,
                    managed_source: null,
                  },
                },
              });
              observer.complete();
            },
            fail: () => observer.error(new TypeError("Failed to fetch")),
          });
        }),
    ),
  });
  return { client, reads, saves };
}

async function openEntry() {
  const api = entryClient();
  render(
    <ApolloProvider client={api.client}>
      <EntryContextPanel entryHash="entry-a" ledgerId="owner/books" />
    </ApolloProvider>,
  );
  await waitFor(() => expect(api.reads).toHaveLength(1));
  act(() => api.reads[0]!.answer(SOURCE, "sha-1"));
  const editor = await screen.findByLabelText("Entry source");
  expect(editor).toHaveValue(SOURCE);
  // What every write's cache clear does: read the open entry again.
  const refresh = () => {
    void api.client.refetchQueries({ include: "active" }).catch(() => {});
  };
  return { ...api, editor, refresh };
}

const DRAFT = SOURCE.replace("-4 USD", "-4.50 USD");

/** A cache refresh keeps the open entry and its draft mounted (w4/979). */
describe("Entry Context through a cache refresh", () => {
  it("keeps an edited draft mounted while the entry is read again and after", async () => {
    const { editor, reads, refresh } = await openEntry();
    fireEvent.change(editor, { target: { value: DRAFT } });

    refresh();
    await waitFor(() => expect(reads).toHaveLength(2));
    // While the read is in flight the editor and its draft stay put.
    expect(screen.getByLabelText("Entry source")).toBe(editor);
    expect(editor).toHaveValue(DRAFT);

    act(() => reads[1]!.answer(NEWER, "sha-2"));
    await waitFor(() =>
      expect(screen.getByLabelText("Entry source")).toBe(editor),
    );
    expect(editor).toHaveValue(DRAFT);
  });

  it("saves a kept draft against the version it was written on, so a change elsewhere is refused", async () => {
    const user = userEvent.setup();
    const { editor, reads, refresh, saves } = await openEntry();
    fireEvent.change(editor, { target: { value: DRAFT } });
    refresh();
    await waitFor(() => expect(reads).toHaveLength(2));
    act(() => reads[1]!.answer(NEWER, "sha-2"));
    await waitFor(() => expect(editor).toHaveValue(DRAFT));

    await user.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(saves).toHaveLength(1));
    expect(saves[0]).toEqual({ newContent: DRAFT, sha256sum: "sha-1" });
  });

  it("shows the refreshed source in a clean editor", async () => {
    const { editor, reads, refresh } = await openEntry();
    refresh();
    await waitFor(() => expect(reads).toHaveLength(2));
    act(() => reads[1]!.answer(NEWER, "sha-2"));
    await waitFor(() => expect(editor).toHaveValue(NEWER));
  });

  it("keeps the draft when the refresh fails, and offers Try again", async () => {
    const { editor, reads, refresh } = await openEntry();
    fireEvent.change(editor, { target: { value: DRAFT } });
    refresh();
    await waitFor(() => expect(reads).toHaveLength(2));
    act(() => reads[1]!.fail());

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    const [, options] = vi.mocked(toast.error).mock.calls.at(-1)!;
    expect(options).toMatchObject({ action: { label: expect.any(String) } });
    expect(screen.getByLabelText("Entry source")).toBe(editor);
    expect(editor).toHaveValue(DRAFT);

    // Try again reads the entry once more; the draft survives that too.
    act(() =>
      (options as { action: { onClick: () => void } }).action.onClick(),
    );
    await waitFor(() => expect(reads).toHaveLength(3));
    act(() => reads[2]!.answer(SOURCE, "sha-1"));
    await waitFor(() => expect(editor).toHaveValue(DRAFT));
  });
});
