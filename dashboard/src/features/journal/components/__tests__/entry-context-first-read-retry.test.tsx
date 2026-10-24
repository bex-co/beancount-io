import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "@/i18n/locales/en";
import { EntryContextDialog } from "../entry-context-dialog";

/**
 * A failed first Entry Context read offers Try Again inside the open dialog
 * (w4/1044). It used to show the connection error alone, so a reader had to
 * close the dialog and open the entry again. The real dialog, panel and
 * Apollo observer run; only the network answers are scripted.
 */
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
vi.mock("@/common/components/monaco-editor", () => ({
  MonacoEditor: ({ value }: { value: string }) => (
    <textarea aria-label="Entry source" value={value} readOnly />
  ),
}));
vi.mock("@/common/lib/editor/monaco-beancount-language-vscode", () => ({
  registerBeancountLanguage: vi.fn(),
}));

type Read = {
  variables: Record<string, unknown>;
  answer: (slice: string) => void;
  fail: () => void;
};

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

const SOURCE =
  '2016-04-19 * "Starbucks" "Coffee"\n  Expenses:Food:Coffee  5.23 USD\n';
const entry = (hash: string, payee: string) =>
  ({
    entry_hash: hash,
    directive_type: "Transaction",
    date: "2016-04-19",
    payee,
    narration: "Coffee",
  }) as never;

function setup() {
  const reads: Read[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          reads.push({
            variables: { ...operation.variables },
            answer: (slice) => {
              observer.next({
                data: {
                  getLedgerEntryContext: {
                    __typename: "LedgerEntryContext",
                    slice,
                    sha256sum: "sha-1",
                    entry: { meta: { filename: "main.bean", lineno: 1913 } },
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
  clients.push(client);

  let show: (hash: string, payee: string) => void = () => {};
  function Journal() {
    const opener = useRef<HTMLButtonElement>(null);
    const [selected, setSelected] = useState(entry("entry-a", "Starbucks"));
    const [open, setOpen] = useState(true);
    show = (hash, payee) => setSelected(entry(hash, payee));
    return (
      <>
        <button ref={opener}>Open entry Starbucks</button>
        <EntryContextDialog
          open={open}
          onOpenChange={setOpen}
          entry={selected}
          ledgerId="open_ledger/example"
          returnFocusRef={opener}
        />
      </>
    );
  }
  render(
    <ApolloProvider client={client}>
      <Journal />
    </ApolloProvider>,
  );
  const tryAgain = () =>
    screen.getByRole("button", { name: en["common.tryAgain"] });
  const failed = () => screen.queryByText(en["common.errors.network"]);
  return {
    reads,
    tryAgain,
    failed,
    user: userEvent.setup(),
    showEntry: (hash: string, payee: string) => act(() => show(hash, payee)),
  };
}

describe("Entry Context first-read retry", () => {
  it("retries in the open dialog, one read at a time, and keeps focus after another failure", async () => {
    const { reads, tryAgain, failed, user } = setup();
    await waitFor(() => expect(reads).toHaveLength(1));
    await act(async () => reads[0].fail());

    tryAgain().focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(reads).toHaveLength(2));
    expect(failed()).toBeInTheDocument();
    expect(tryAgain()).toHaveAttribute("aria-busy", "true");
    await user.keyboard("{Enter}");
    expect(reads).toHaveLength(2);

    await act(async () => reads[1].fail());
    await waitFor(() => expect(tryAgain()).toBeEnabled());
    expect(tryAgain()).toHaveFocus();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Enter}");
    await waitFor(() => expect(reads).toHaveLength(3));
    await act(async () => reads[2].answer(SOURCE));
    expect(await screen.findByLabelText("Entry source")).toHaveValue(SOURCE);
    expect(failed()).toBeNull();
    for (const read of reads) {
      expect(read.variables).toEqual({
        entryHash: "entry-a",
        ledgerId: "open_ledger/example",
      });
    }
  });

  it("stays closed, with focus on the entry, when dismissed during a retry", async () => {
    const { reads, tryAgain, user } = setup();
    await waitFor(() => expect(reads).toHaveLength(1));
    await act(async () => reads[0].fail());
    await user.click(tryAgain());
    await waitFor(() => expect(reads).toHaveLength(2));

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const opener = screen.getByRole("button", { name: "Open entry Starbucks" });
    expect(opener).toHaveFocus();

    await act(async () => reads[1].fail());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("shows the next entry, not the old failure, when another entry opens during a retry", async () => {
    const { reads, tryAgain, failed, user, showEntry } = setup();
    await waitFor(() => expect(reads).toHaveLength(1));
    await act(async () => reads[0].fail());
    await user.click(tryAgain());
    await waitFor(() => expect(reads).toHaveLength(2));

    showEntry("entry-b", "Bakery");
    await waitFor(() => expect(reads).toHaveLength(3));
    expect(reads[2].variables).toEqual({
      entryHash: "entry-b",
      ledgerId: "open_ledger/example",
    });
    await act(async () => reads[1].fail());
    expect(failed()).toBeNull();
    await act(async () => reads[2].answer(SOURCE));
    expect(await screen.findByLabelText("Entry source")).toHaveValue(SOURCE);
  });
});
