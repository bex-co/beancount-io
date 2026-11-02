import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import type { JournalDirectiveType } from "@/common/types/journal";
import { EntryContextDialog } from "../entry-context-dialog";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: true }),
}));
vi.mock("@/common/hooks/use-file-navigate", () => ({
  useFileNavigate: () => vi.fn(),
}));
const outcome = vi.hoisted(() => ({
  report: async (): Promise<boolean> => false,
}));
vi.mock("@/common/hooks/use-write-outcome", () => ({
  useWriteOutcome: () => ({
    snapshot: () => null,
    report: () => outcome.report(),
  }),
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

type Save = {
  source: string;
  succeed: () => void;
  fail: () => void;
};

/** Reads any entry's context, and holds every save until the test settles it. */
function entryClient() {
  const saves: Save[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          if (operation.operationName === "UpdateLedgerEntrySourceSlice") {
            const input = operation.variables.input as {
              entryHash: string;
              newContent: string;
            };
            saves.push({
              source: input.newContent,
              succeed: () => {
                observer.next({
                  data: {
                    updateLedgerEntrySourceSlice: {
                      __typename: "UpdateSourceSliceResult",
                      newSha256sum: "sha-2",
                      message: "ok",
                      entryHash: input.entryHash,
                    },
                  },
                });
                observer.complete();
              },
              fail: () => {
                observer.next({
                  data: null,
                  errors: [
                    {
                      message: "boom",
                      extensions: { code: "INTERNAL_SERVER_ERROR" },
                    },
                  ],
                } as never);
                observer.complete();
              },
            });
            return;
          }
          observer.next({
            data: {
              getLedgerEntryContext: {
                __typename: "LedgerEntryContext",
                slice: SOURCE,
                sha256sum: "sha-1",
                entry: { meta: { filename: "main.bean", lineno: 3 } },
                balances_before: null,
                balances_after: null,
                managed_source: null,
              },
            },
          });
          observer.complete();
        }),
    ),
  });
  return { client, saves };
}

const ENTRY = {
  entry_hash: "entry-a",
  date: "2024-01-01",
  type: "Transaction",
  narration: "Coffee",
} as unknown as JournalDirectiveType;

/** The dialog as a Journal row opens it. */
function Journal() {
  const [open, setOpen] = useState(true);
  return (
    <EntryContextDialog
      open={open}
      onOpenChange={setOpen}
      entry={ENTRY}
      ledgerId="owner/books"
    />
  );
}

async function renderEdited() {
  const user = userEvent.setup();
  const entries = entryClient();
  render(
    <ApolloProvider client={entries.client}>
      <Journal />
    </ApolloProvider>,
  );
  const dialog = await screen.findByRole("dialog");
  const source = await within(dialog).findByRole("textbox", {
    name: "Entry source",
  });
  await waitFor(() => expect(source).toHaveValue(SOURCE));
  await user.type(source, "; first");
  return { user, dialog, source, saves: entries.saves };
}

const closed = () =>
  waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

/** A pending entry-source save owns its source and its dialog (w4/m49). */
describe("Entry Context pending save", () => {
  it("accepts no source edit while the save is held", async () => {
    const { user, dialog, source, saves } = await renderEdited();
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(saves).toHaveLength(1));

    await user.type(source, " later");
    expect(source).toHaveValue(`${SOURCE}; first`);
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();

    saves[0].succeed();
    await closed();
  });

  it.each([
    [
      "Escape",
      (user: ReturnType<typeof userEvent.setup>) => user.keyboard("{Escape}"),
    ],
    [
      "Close",
      (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole("button", { name: /close/i })),
    ],
    [
      "an outside click",
      // Radix dismisses on a pointerdown on its overlay.
      () => {
        fireEvent.pointerDown(
          document.querySelector('[data-slot="dialog-overlay"]')!,
        );
      },
    ],
    [
      "the source link",
      (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole("button", { name: /main\.bean:3/ })),
    ],
  ])(
    "holds the dialog against %s while the save is pending",
    async (_exit, leave) => {
      const { user, dialog, saves } = await renderEdited();
      await user.click(within(dialog).getByRole("button", { name: "Save" }));
      await waitFor(() => expect(saves).toHaveLength(1));

      await leave(user);
      // No Discard choice either: the save, not the reader, ends this draft.
      expect(screen.getAllByRole("dialog")).toEqual([dialog]);

      saves[0].succeed();
      await closed();
    },
  );

  it("closes on the write while the ledger is still being revalidated (w1/184)", async () => {
    let settle: (leftErrors: boolean) => void = () => {};
    outcome.report = () => new Promise((resolve) => (settle = resolve));
    vi.mocked(toast.success).mockClear();
    const { user, dialog, saves } = await renderEdited();
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(saves).toHaveLength(1));

    saves[0].succeed();
    await closed();
    // "Saved" waits for the check, so a write that broke the ledger can say
    // that instead (w3/640); nothing else does.
    expect(toast.success).not.toHaveBeenCalled();
    settle(false);
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    outcome.report = async () => false;
  });

  it("keeps the draft after a failed save and retries the current source once", async () => {
    const { user, dialog, source, saves } = await renderEdited();
    const save = within(dialog).getByRole("button", { name: "Save" });
    save.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(saves).toHaveLength(1));
    expect(dialog).toHaveFocus();

    saves[0].fail();
    await waitFor(() => expect(save).toHaveFocus());

    await user.type(source, " second");
    await user.click(save);
    await waitFor(() => expect(saves).toHaveLength(2));
    expect(saves[1].source).toBe(`${SOURCE}; first second`);
    saves[1].succeed();
    await closed();
  });
});
