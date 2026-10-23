import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OperationDefinitionNode } from "graphql";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import CommoditiesPage from "../index";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "demo", ledgerName: "books" }),
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "Demo Books" }),
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: true }),
}));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

/** Commodities' failed price-history read retries itself alone (w4/m50). */
describe("Commodities read failure", () => {
  it("retries the commodity read in place, without refreshing managed feeds", async () => {
    const user = userEvent.setup();
    const operations: string[] = [];
    let commodityReads = 0;
    const held: ((ok: boolean) => void)[] = [];
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        (operation) =>
          new Observable((observer) => {
            const kind = operation.query.definitions.find(
              (d): d is OperationDefinitionNode =>
                d.kind === "OperationDefinition",
            )!.operation;
            operations.push(`${kind}:${operation.operationName}`);
            if (operation.operationName !== "GetLedgerCommodities") {
              observer.next({ data: { getLedgerManagedPrices: [] } });
              observer.complete();
              return;
            }
            commodityReads += 1;
            const settle = (ok: boolean) => {
              if (!ok) return observer.error(new TypeError("Failed to fetch"));
              observer.next({ data: { getLedgerCommodities: [] } });
              observer.complete();
            };
            if (commodityReads === 1) settle(false);
            else held.push(settle);
          }),
      ),
    });
    render(
      <ApolloProvider client={client}>
        <CommoditiesPage />
      </ApolloProvider>,
    );

    await screen.findByText("Failed to Load Commodities");
    const retry = screen.getByRole("button", { name: "Try Again" });
    retry.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(commodityReads).toBe(2));
    expect(retry).toBeDisabled();
    expect(screen.getByText("Failed to Load Commodities")).toBeVisible();
    // The browser drops focus from the control it disabled; jsdom keeps it.
    const away = document.createElement("button");
    document.body.appendChild(away);
    away.focus();
    away.remove();

    held.shift()!(false);
    await waitFor(() => expect(retry).toHaveFocus());

    await user.keyboard("{Enter}");
    await waitFor(() => expect(commodityReads).toBe(3));
    held.shift()!(true);
    // The retried read renders its own result, which replaces Try Again.
    expect(await screen.findByText("No Price History Found")).toBeVisible();
    expect(operations.filter((o) => o.startsWith("mutation"))).toEqual([]);
  });
});
