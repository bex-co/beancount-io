import { ApolloClient, ApolloLink, InMemoryCache } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GetLedgerFileDocument } from "@/graphql/definitions";
import { base64Encode } from "@/common/lib/utils/encode";
import { ReadmeCard } from "../readme-card";

vi.mock("@/common/hooks/use-file-navigate", () => ({
  useFileNavigate: () => vi.fn(),
}));

vi.mock("@/common/components/ledger-permission/write", () => ({
  LedgerWritePermission: () => null,
}));

const ledgerId = "owner/ledger";

function Overview() {
  return (
    <section>
      <h1>Overview</h1>
      <ReadmeCard ledgerId={ledgerId} />
    </section>
  );
}

describe("README hydration", () => {
  it.each([true, false])(
    "preserves surrounding content when README prefetch finishes before hydration (exists: %s)",
    async (exists) => {
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
          <Overview />
        </ApolloProvider>,
      );
      const heading = container.querySelector("h1");
      expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
        4,
      );

      client.cache.writeQuery({
        query: GetLedgerFileDocument,
        variables: { ledgerId, path: "README.md" },
        data: {
          getLedgerFile: exists
            ? {
                __typename: "LedgerFileContent",
                name: "README.md",
                path: "README.md",
                sha: "public-example",
                size: 20,
                type: "file",
                encoding: "base64",
                content: base64Encode("## Ledger notes"),
                lastCommitSha: null,
                lastAuthorDate: null,
                lastCommitterDate: null,
              }
            : null,
        },
      });
      const onRecoverableError = vi.fn();
      const root = hydrateRoot(
        container,
        <ApolloProvider client={client}>
          <Overview />
        </ApolloProvider>,
        { onRecoverableError },
      );
      try {
        await act(async () => {});
        expect(onRecoverableError).not.toHaveBeenCalled();
        expect(container.querySelector("h1")).toBe(heading);
        expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
        if (exists) {
          expect(container.querySelector("h2")).toHaveTextContent(
            "Ledger notes",
          );
        } else {
          expect(container.querySelector('[data-slot="card"]')).toBeNull();
        }
      } finally {
        await act(async () => root.unmount());
        serverClient.stop();
        client.stop();
        container.remove();
      }
    },
  );
});
