import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { useImportDuplicates } from "../use-import-duplicates";

/**
 * The journal API refuses any page over 1000 rows, so Smart Import's
 * duplicate check has to ask within that bound (w5/1146). The check
 * shipped asking for 2000 in one read, which the server answers with
 * `BAD_USER_INPUT` — and a failed read looks like "nothing booked", so a
 * re-uploaded file was never flagged. These tests stand in for the
 * server: any request over the bound fails exactly as production does.
 */

/** The server's page bound (`ledger-journal-service.ts`, w6/007). */
const SERVER_MAX_LIMIT = 1000;

interface JournalRequest {
  limit: number;
  offset: number;
}

function bookedTransaction(date: string, number: string) {
  return {
    directive_type: "Transaction",
    date,
    entry_hash: `${date}|${number}`,
    flag: "*",
    payee: "qa",
    narration: "",
    tags: [],
    links: [],
    postings: [
      { account: "Assets:Cash", units: { number, currency: "USD" } },
      {
        account: "Expenses:Food",
        units: { number: number.replace(/^-/, ""), currency: "USD" },
      },
    ],
  };
}

const clients: ApolloClient[] = [];

afterEach(() => {
  clients.splice(0).forEach((client) => client.stop());
});

function renderDuplicates(
  rows: Array<{ id: string; date: string; amountDecimal: string }>,
  journal: unknown[],
) {
  const requests: JournalRequest[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          const query = operation.variables.query as JournalRequest;
          requests.push({ limit: query.limit, offset: query.offset ?? 0 });
          if (
            !Number.isSafeInteger(query.limit) ||
            query.limit < 1 ||
            query.limit > SERVER_MAX_LIMIT
          ) {
            observer.error(
              new Error("limit must be an integer from 1 to 1000"),
            );
            return;
          }
          const offset = query.offset ?? 0;
          observer.next({
            data: {
              getLedgerJournal: {
                __typename: "JournalResponse",
                total: journal.length,
                data: journal.slice(offset, offset + query.limit),
                is_empty: journal.length === 0,
              },
            },
          });
          observer.complete();
        }),
    ),
  });
  clients.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApolloProvider client={client}>{children}</ApolloProvider>
  );
  const hook = renderHook(
    () => useImportDuplicates("owner/ledger", rows, "Assets:Cash", "USD"),
    { wrapper },
  );
  return { ...hook, requests };
}

describe("useImportDuplicates stays inside the journal page bound", () => {
  it("flags a re-imported file instead of failing the read", async () => {
    const rows = [
      { id: "coffee", date: "2026-09-02", amountDecimal: "-3.25" },
      { id: "bus", date: "2026-09-03", amountDecimal: "-2.75" },
    ];
    const journal = [
      bookedTransaction("2026-09-02", "-3.25"),
      bookedTransaction("2026-09-03", "-2.75"),
    ];
    const { result, requests } = renderDuplicates(rows, journal);

    await waitFor(() =>
      expect([...result.current].sort()).toEqual(["bus", "coffee"]),
    );
    expect(requests.length).toBeGreaterThan(0);
    for (const { limit } of requests) expect(limit).toBeLessThanOrEqual(1000);
  });

  it("pages past the first page so a busy account is still checked in full", async () => {
    const rows = [{ id: "late", date: "2026-09-30", amountDecimal: "-9.99" }];
    // A busy account: the booking sits past the first page.
    const journal = [
      ...Array.from({ length: SERVER_MAX_LIMIT }, (_, index) =>
        bookedTransaction("2026-09-01", `-${index + 1}.01`),
      ),
      bookedTransaction("2026-09-30", "-9.99"),
    ];
    const { result, requests } = renderDuplicates(rows, journal);

    await waitFor(() => expect([...result.current]).toEqual(["late"]));
    for (const { limit } of requests) expect(limit).toBeLessThanOrEqual(1000);
    expect(requests.map(({ offset }) => offset)).toEqual([0, 1000]);
  });
});
