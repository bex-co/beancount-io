import "reflect-metadata";
import { getMetadataStorage } from "type-graphql";
import { CreateLedgerInput, UpdateLedgerInput } from "../ledger-resolver.types";
import {
  ledgerCreateInput,
  ledgerUpdateInput,
} from "@/features/ledger/api/rest/v1/lifecycle-handler";
import {
  MAKE_PUBLIC_FIELD,
  MAKE_PUBLIC_WARNING,
  PUBLIC_LEDGER_EXPOSURE,
} from "@/features/ledger/utils/ledger-visibility";

// w23/241: making a ledger public exposes more than "readable by anyone". The
// preview's warning is the sentence an agent shows the owner before it flips
// visibility, and the `private` field is where the same words reach a client's
// tool list, so both say what the dashboard's confirmation says and what the
// dashboard's does not: the full commit history, with each author's name and
// email.
describe("what making a ledger public says it exposes", () => {
  it("names the data, the history and the commit authors in the warning", () => {
    for (const phrase of [
      "transactions",
      "balances",
      "files",
      "full commit history",
      "every earlier version of each file",
      "author name and email",
      "anyone with the link",
      "search engines",
    ]) {
      expect(MAKE_PUBLIC_WARNING).toContain(phrase);
    }
  });

  it("is the sentence in the REST and MCP `private` field, on create and update", () => {
    const description = (schema: { shape: Record<string, unknown> }) =>
      (schema.shape.private as { description?: string }).description;
    expect(description(ledgerCreateInput)).toContain(MAKE_PUBLIC_FIELD);
    expect(description(ledgerUpdateInput)).toContain(MAKE_PUBLIC_FIELD);
    expect(MAKE_PUBLIC_FIELD).toContain(PUBLIC_LEDGER_EXPOSURE);
  });

  it("is the sentence in the GraphQL `private` field, on create and update", () => {
    const fields = getMetadataStorage().fields;
    for (const input of [CreateLedgerInput, UpdateLedgerInput]) {
      const field = fields.find(
        (candidate) =>
          candidate.target === input && candidate.name === "private",
      );
      expect(field?.description).toContain(MAKE_PUBLIC_FIELD);
    }
  });
});
