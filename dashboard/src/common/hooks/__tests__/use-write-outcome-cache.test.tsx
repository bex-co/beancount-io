import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { GetLedgerErrorsDocument } from "@/graphql/definitions";
import { useWriteOutcome } from "../use-write-outcome";

vi.mock("@tanstack/react-router", () => ({ useRouter: () => null }));
vi.mock("sonner", () => ({ toast: { warning: vi.fn() } }));

/**
 * The pre-write snapshot comes from the errors the layout already holds:
 * mounting a writer sends no ledger-wide revalidation of its own (w1/185).
 */
const LEDGER = { ledgerId: "qa/books" };

function client(cached: boolean) {
  const requests: string[] = [];
  const link = new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        requests.push(operation.operationName ?? "");
        observer.next({ data: { getLedgerErrors: [] } });
        observer.complete();
      }),
  );
  const apollo = new ApolloClient({ cache: new InMemoryCache(), link });
  if (cached) {
    apollo.cache.writeQuery({
      query: GetLedgerErrorsDocument,
      variables: LEDGER,
      data: { getLedgerErrors: [] },
    });
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApolloProvider client={apollo}>{children}</ApolloProvider>
  );
  return { requests, wrapper };
}

describe("useWriteOutcome's snapshot", () => {
  it("reads errors already cached without asking the server", async () => {
    const { requests, wrapper } = client(true);
    const { result } = renderHook(() => useWriteOutcome(LEDGER.ledgerId), {
      wrapper,
    });

    expect(result.current.snapshot()).toEqual([]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(requests).toEqual([]);
  });

  it("fetches them once when nothing has yet", async () => {
    const { requests, wrapper } = client(false);
    const { result } = renderHook(() => useWriteOutcome(LEDGER.ledgerId), {
      wrapper,
    });

    await waitFor(() => expect(result.current.snapshot()).toEqual([]));
    expect(requests).toEqual(["GetLedgerErrors"]);
  });
});
