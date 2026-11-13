import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { parse, print } from "graphql";
import * as apolloClient from "@apollo/client/react";
import {
  CreateLedgerDocument,
  CreateLedgerInCurrencyDocument,
  LedgerTemplate,
  ListLedgersDocument,
} from "@/graphql/definitions";
import { useCreateLedger } from "../use-create-ledger";

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(),
}));

/**
 * w3/m62: a server validates the whole document, so one declaring `currency`
 * is refused by a server older than the argument even with no currency sent.
 * Only a Starter in another currency may send the document that declares it.
 */
describe("useCreateLedger (w3/m62)", () => {
  const sent: { document: unknown; variables: unknown }[] = [];

  beforeEach(() => {
    sent.length = 0;
    vi.mocked(apolloClient.useMutation).mockImplementation(((
      document: unknown,
    ) => [
      vi.fn(async ({ variables }: { variables: unknown }) => {
        sent.push({ document, variables });
        return { data: { createLedger: { id: "me/book" } } };
      }),
      { loading: false },
    ]) as never);
  });

  const create = () =>
    renderHook(() => useCreateLedger([ListLedgersDocument])).result.current[0];

  it("sends CreateLedger unchanged when there is no currency", async () => {
    await create()({
      name: "book",
      private: true,
      template: LedgerTemplate.Sample,
    });
    expect(sent).toEqual([
      {
        document: CreateLedgerDocument,
        variables: {
          name: "book",
          private: true,
          template: LedgerTemplate.Sample,
        },
      },
    ]);
  });

  it("sends CreateLedgerInCurrency, without a template, for a currency", async () => {
    await create()({
      name: "book",
      private: true,
      description: "Euro books",
      currency: "EUR",
    });
    expect(sent).toEqual([
      {
        document: CreateLedgerInCurrencyDocument,
        variables: {
          name: "book",
          private: true,
          description: "Euro books",
          currency: "EUR",
        },
      },
    ]);
  });

  it("keeps `currency` out of the document older servers receive", () => {
    expect(print(CreateLedgerDocument)).not.toMatch(/currency/);
    expect(print(CreateLedgerInCurrencyDocument)).toMatch(
      /currency: \$currency/,
    );
    // Both select the same ledger fields, so callers read one result shape.
    const selection = (text: string) =>
      print(parse(text)).replace(
        /^[\s\S]*?\) \{\n {2}createLedger\([\s\S]*?\) /,
        "",
      );
    expect(selection(print(CreateLedgerInCurrencyDocument))).toBe(
      selection(print(CreateLedgerDocument)),
    );
  });
});
