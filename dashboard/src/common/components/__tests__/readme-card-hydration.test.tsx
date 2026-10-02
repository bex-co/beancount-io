import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act, render, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GetLedgerFileDocument } from "@/graphql/definitions";
import { base64Encode } from "@/common/lib/utils/encode";
import { ReadmeCard } from "../readme-card";
import type { InitialLedgerReadme } from "@/common/lib/ledger-readme";

vi.mock("@/common/hooks/use-file-navigate", () => ({
  useFileNavigate: () => vi.fn(),
}));

vi.mock("@/common/components/ledger-permission/write", () => ({
  LedgerWritePermission: () => null,
}));

const ledgerId = "owner/ledger";

function Overview({ initialReadme }: { initialReadme?: InitialLedgerReadme }) {
  return (
    <section>
      <h1>Overview</h1>
      <ReadmeCard ledgerId={ledgerId} initialReadme={initialReadme} />
    </section>
  );
}

describe("README hydration", () => {
  it("keeps a late old-ledger response out of the newly selected ledger", async () => {
    const replies = new Map<string, (content: string) => void>();
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        (operation) =>
          new Observable((observer) => {
            replies.set(operation.variables.ledgerId, (content) => {
              observer.next({
                data: {
                  getLedgerFile: {
                    __typename: "LedgerFileContent",
                    name: "README.md",
                    path: "README.md",
                    sha: operation.variables.ledgerId,
                    size: content.length,
                    type: "file",
                    encoding: "base64",
                    content: base64Encode(content),
                    lastCommitSha: null,
                    lastAuthorDate: null,
                    lastCommitterDate: null,
                  },
                },
              });
              observer.complete();
            });
          }),
      ),
    });
    const view = (id: string) => (
      <ApolloProvider client={client}>
        <ReadmeCard ledgerId={id} />
      </ApolloProvider>
    );
    const rendered = render(view("public/old"));
    try {
      await waitFor(() => expect(replies.has("public/old")).toBe(true));
      rendered.rerender(view("public/new"));
      await waitFor(() => expect(replies.has("public/new")).toBe(true));
      await act(async () => replies.get("public/new")!("## New ledger notes"));
      await waitFor(() =>
        expect(rendered.getByRole("heading")).toHaveTextContent(
          "New ledger notes",
        ),
      );
      await act(async () => replies.get("public/old")!("## Old ledger notes"));
      expect(rendered.getByRole("heading")).toHaveTextContent(
        "New ledger notes",
      );
      expect(rendered.queryByText("Old ledger notes")).not.toBeInTheDocument();
    } finally {
      rendered.unmount();
      client.stop();
    }
  });

  it.each(["## Server notes\n\nPublic explanation.", null])(
    "hydrates the settled SSR result before showing a newer cached file (%s)",
    async (content) => {
      const serverClient = new ApolloClient({
        ssrMode: true,
        cache: new InMemoryCache(),
        link: ApolloLink.empty(),
      });
      const client = new ApolloClient({
        cache: new InMemoryCache(),
        link: ApolloLink.empty(),
      });
      const initialReadme: InitialLedgerReadme = {
        ledgerId,
        path: "README.md",
        status: "ready",
        content,
      };
      const container = document.createElement("div");
      document.body.appendChild(container);
      container.innerHTML = renderToString(
        <ApolloProvider client={serverClient}>
          <Overview initialReadme={initialReadme} />
        </ApolloProvider>,
      );
      const heading = container.querySelector("h1");
      expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
      expect(container.textContent?.includes("Public explanation.")).toBe(
        Boolean(content),
      );
      client.cache.writeQuery({
        query: GetLedgerFileDocument,
        variables: { ledgerId, path: "README.md" },
        data: {
          getLedgerFile: {
            __typename: "LedgerFileContent",
            name: "README.md",
            path: "README.md",
            sha: "newer-public-example",
            size: 20,
            type: "file",
            encoding: "base64",
            content: base64Encode("## Updated notes"),
            lastCommitSha: null,
            lastAuthorDate: null,
            lastCommitterDate: null,
          },
        },
      });
      const onRecoverableError = vi.fn();
      const root = hydrateRoot(
        container,
        <ApolloProvider client={client}>
          <Overview initialReadme={initialReadme} />
        </ApolloProvider>,
        { onRecoverableError },
      );
      try {
        await act(async () => {});
        expect(onRecoverableError).not.toHaveBeenCalled();
        expect(container.querySelector("h1")).toBe(heading);
        expect(container.querySelector("h2")).toHaveTextContent(
          "Updated notes",
        );
        await act(async () => {
          client.cache.writeQuery({
            query: GetLedgerFileDocument,
            variables: { ledgerId, path: "README.md" },
            data: { getLedgerFile: null },
          });
        });
        await waitFor(() => {
          expect(container.querySelector('[data-slot="card"]')).toBeNull();
        });
      } finally {
        await act(async () => root.unmount());
        serverClient.stop();
        client.stop();
        container.remove();
      }
    },
  );

  it("does not render a snapshot belonging to another ledger or path", () => {
    const client = new ApolloClient({
      ssrMode: true,
      cache: new InMemoryCache(),
      link: ApolloLink.empty(),
    });
    try {
      for (const scope of [
        { ledgerId: "other/private", path: "README.md" },
        { ledgerId, path: "other/README.md" },
      ]) {
        const html = renderToString(
          <ApolloProvider client={client}>
            <Overview
              initialReadme={{
                ...scope,
                status: "ready",
                content: "Protected unrelated content",
              }}
            />
          </ApolloProvider>,
        );
        expect(html).not.toContain("Protected unrelated content");
        expect(html).toContain('data-slot="skeleton"');
      }
    } finally {
      client.stop();
    }
  });

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
