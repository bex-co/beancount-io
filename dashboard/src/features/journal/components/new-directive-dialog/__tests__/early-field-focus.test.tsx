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
import { NewDirectiveDialog } from "../index";

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ primaryCurrency: "USD" }),
}));
vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useLedgerWriteRefresh: () => vi.fn(),
}));
vi.mock("@/common/hooks/use-write-outcome", () => ({
  useWriteOutcome: () => ({ snapshot: () => null, report: vi.fn() }),
}));
vi.mock("../balance-form", () => ({ BalanceForm: () => null }));
vi.mock("../note-form", () => ({ NoteForm: () => null }));
vi.mock("../open-account-form", () => ({ OpenAccountForm: () => null }));
vi.mock("@/common/components/ui/date-picker", () => ({
  DatePicker: ({ id, value }: { id?: string; value?: string }) => (
    <input id={id} value={value ?? ""} readOnly />
  ),
}));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

function renderNewEntry(initialOpen = false) {
  const requests: string[] = [];
  const pendingPayees: Array<() => void> = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          const name = operation.operationName ?? "";
          requests.push(name);
          const answer = (data: Record<string, unknown>) => {
            observer.next({ data });
            observer.complete();
          };
          switch (name) {
            case "GetLedgerPayees":
              pendingPayees.push(() =>
                answer({ getLedgerPayees: ["Fixture Market"] }),
              );
              return;
            case "GetLedgerAccountDirectives":
              return answer({ getLedgerAccountDirectives: [] });
            case "GetLedger":
              return answer({ getLedger: null });
            case "GetLedgerAccounts":
              return answer({ getLedgerAccounts: [] });
            case "GetLedgerCurrencies":
              return answer({ getLedgerCurrencies: ["USD"] });
            case "GetLedgerNarrations":
              return answer({ getLedgerNarrations: [] });
            default:
              observer.error(new Error(`Unexpected operation ${name}`));
          }
        }),
    ),
  });
  clients.push(client);

  function Fixture() {
    const triggerRef = useRef<HTMLAnchorElement>(null);
    const [open, setOpen] = useState(initialOpen);
    return (
      <>
        <a
          ref={triggerRef}
          href="?action=new-entry&directive=transaction"
          onClick={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
        >
          New Entry
        </a>
        <NewDirectiveDialog
          open={open}
          onOpenChange={setOpen}
          ledgerId="owner/ledger"
          activeTab="transaction"
          onActiveTabChange={() => {}}
          returnFocusRef={triggerRef}
        />
      </>
    );
  }
  render(
    <ApolloProvider client={client}>
      <Fixture />
    </ApolloProvider>,
  );
  return {
    user: userEvent.setup(),
    requests,
    pendingPayees,
    trigger: () => screen.getByRole("link", { name: "New Entry" }),
    resolvePayees: () => act(async () => pendingPayees[0]!()),
  };
}

// A cold suggestions read can outlast the old 150ms autofocus timer.
const outlastOldAutofocus = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 200));

describe("Payee focus with a cold suggestions read (w5/1165)", () => {
  it.each([false, true])(
    "defaults to the editable Payee on the first opening (initially open=%s)",
    async (initialOpen) => {
      const fixture = renderNewEntry(initialOpen);
      if (!initialOpen) {
        fixture.trigger().focus();
        await fixture.user.keyboard("{Enter}");
      }
      await waitFor(() => expect(fixture.pendingPayees).toHaveLength(1));
      await outlastOldAutofocus();
      const initialFocus = document.activeElement;
      await fixture.resolvePayees();
      const payee = screen.getByRole("combobox", { name: "Payee" });
      expect(payee).toHaveFocus();
      expect(initialFocus).toBe(payee);
      expect(payee).toHaveAttribute("aria-expanded", "false");

      await fixture.user.keyboard("Fixture payee");
      expect(payee).toHaveValue("Fixture payee");
      expect(fixture.requests).not.toContain("BulkEntries");
    },
  );

  it("keeps the Date field the reader chose while suggestions were loading", async () => {
    const fixture = renderNewEntry(true);
    await waitFor(() => expect(fixture.pendingPayees).toHaveLength(1));
    const date = screen.getByRole("textbox", { name: "Date" });
    await fixture.user.click(date);
    await outlastOldAutofocus();
    await fixture.resolvePayees();

    expect(screen.getByRole("combobox", { name: "Payee" })).toBeInTheDocument();
    expect(date).toHaveFocus();
  });

  it("keeps focus at the opener when the dialog closes before suggestions arrive", async () => {
    const fixture = renderNewEntry(true);
    await waitFor(() => expect(fixture.pendingPayees).toHaveLength(1));
    await fixture.user.keyboard("{Escape}");
    await waitFor(() => expect(fixture.trigger()).toHaveFocus());
    await fixture.resolvePayees();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fixture.trigger()).toHaveFocus();
  });
});
