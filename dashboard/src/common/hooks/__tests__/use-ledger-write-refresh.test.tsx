import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { ApolloClient, ApolloLink, InMemoryCache, gql } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import {
  GetLedgerErrorsDocument,
  GetLedgerFileDocument,
} from "@/graphql/definitions";
import { cacheClears, useLedgerWriteRefresh } from "../use-apollo-cache";

/**
 * A ledger write refreshes what it can have changed and nothing else: the
 * account queries stay cached, every ledger read refetches, and a value the
 * caller already holds is written back in the same broadcast (w1/m41).
 */
const LEDGER = { ledgerId: "qa/books" };
const FILE = { ...LEDGER, path: "main.bean" };

const fileRevision = (sha: string, content: string) => ({
  __typename: "LedgerFileContent" as const,
  name: "main.bean",
  path: "main.bean",
  sha,
  size: content.length,
  type: "file",
  encoding: "base64",
  content,
  lastCommitSha: `${sha}-commit`,
  lastAuthorDate: null,
  lastCommitterDate: null,
});

function seededClient() {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: ApolloLink.empty(),
  });
  const read = <T,>(query: unknown, variables?: object) =>
    client.cache.readQuery({ query: query as never, variables }) as T | null;
  // The account fields, and the ledger list, as their queries leave them.
  client.cache.writeQuery({
    query: gql`
      query AccountAndLedgers {
        userProfile {
          id
        }
        subscriptionStatus {
          hasActiveSubscription
        }
        listLedgers(limit: 50, page: 1) {
          id
        }
      }
    `,
    data: {
      userProfile: { __typename: "UserProfileResponse", id: "qa-user" },
      subscriptionStatus: {
        __typename: "SubscriptionStatus",
        hasActiveSubscription: false,
      },
      listLedgers: [],
    },
  });
  client.cache.writeQuery({
    query: GetLedgerErrorsDocument,
    variables: LEDGER,
    data: { getLedgerErrors: [] },
  });
  client.cache.writeQuery({
    query: GetLedgerFileDocument,
    variables: FILE,
    data: { getLedgerFile: fileRevision("old-sha", "b2xk") },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApolloProvider client={client}>{children}</ApolloProvider>
  );
  return { client, read, wrapper };
}

describe("useLedgerWriteRefresh", () => {
  it("keeps the account queries and drops every ledger read", () => {
    const { client, wrapper } = seededClient();
    const rootFields = () =>
      Object.keys(client.cache.extract().ROOT_QUERY ?? {})
        .map((key) => key.replace(/\(.*/, ""))
        .filter((key) => key !== "__typename")
        .sort();
    const { result } = renderHook(() => useLedgerWriteRefresh(), { wrapper });
    expect(rootFields()).toEqual([
      "getLedgerErrors",
      "getLedgerFile",
      "listLedgers",
      "subscriptionStatus",
      "userProfile",
    ]);

    result.current();

    // The ledger list carries each ledger's size and last update, which a
    // write moves, so it refetches too.
    expect(rootFields()).toEqual(["subscriptionStatus", "userProfile"]);
  });

  it("writes back what the caller holds, in the same broadcast", () => {
    const { client, read, wrapper } = seededClient();
    const seen: (string | undefined)[] = [];
    const watch = client.cache.watch({
      query: GetLedgerFileDocument,
      variables: FILE,
      optimistic: false,
      returnPartialData: true,
      callback: (diff) => seen.push(diff.result?.getLedgerFile?.sha),
    });
    const { result } = renderHook(() => useLedgerWriteRefresh(), { wrapper });

    result.current((cache) =>
      cache.writeQuery({
        query: GetLedgerFileDocument,
        variables: FILE,
        data: { getLedgerFile: fileRevision("new-sha", "bmV3") },
      }),
    );
    watch();

    expect(read(GetLedgerFileDocument, FILE)).toEqual({
      getLedgerFile: fileRevision("new-sha", "bmV3"),
    });
    // One broadcast with the new file: the view never saw it missing, so it
    // had no reason to download it again.
    expect(seen).toEqual(["new-sha"]);
  });

  it("counts as a cache clear, so Out of date re-baselines on the write", () => {
    const { wrapper } = seededClient();
    const { result } = renderHook(() => useLedgerWriteRefresh(), { wrapper });
    const before = cacheClears();

    result.current();

    expect(cacheClears()).toBe(before + 1);
  });
});
