import { ApolloClient, ApolloLink, InMemoryCache } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GetLedgerAccountMetaDocument } from "@/graphql/definitions";
import { useAccountMeta } from "../use-account-meta";

const ledgerId = "owner/ledger";

function AccountRoles() {
  const { accountMeta, pending } = useAccountMeta(ledgerId);
  return (
    <section>
      <h2>Cash Flow</h2>
      {pending ? (
        <p role="status">Loading account roles</p>
      ) : (
        <p>{String(accountMeta?.get("Assets:Bank")?.["cash-flow-role"])}</p>
      )}
    </section>
  );
}

describe("account metadata hydration", () => {
  it("preserves the server pending state when prefetch finishes before hydration", async () => {
    const serverClient = new ApolloClient({
      ssrMode: true,
      cache: new InMemoryCache(),
      link: ApolloLink.empty(),
    });
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ApolloLink.empty(),
    });
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(
      <ApolloProvider client={serverClient}>
        <AccountRoles />
      </ApolloProvider>,
    );
    const heading = container.querySelector("h2");
    expect(container.textContent).toContain("Loading account roles");

    // A browser loader can complete this optional read before React has
    // hydrated the server's pending panel. Use the real Apollo cache here.
    client.cache.writeQuery({
      query: GetLedgerAccountMetaDocument,
      variables: { ledgerId },
      data: {
        getLedgerAccountDirectives: [
          {
            __typename: "LedgerAccountItem",
            account: "Assets:Bank",
            meta: { "cash-flow-role": "investing" },
          },
        ],
      },
    });
    const onRecoverableError = vi.fn();
    const root = hydrateRoot(
      container,
      <ApolloProvider client={client}>
        <AccountRoles />
      </ApolloProvider>,
      { onRecoverableError },
    );
    try {
      await act(async () => {});
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.querySelector("h2")).toBe(heading);
      expect(container.textContent).toContain("investing");
      expect(container.querySelector('[role="status"]')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      serverClient.stop();
      client.stop();
      container.remove();
    }
  });
});
