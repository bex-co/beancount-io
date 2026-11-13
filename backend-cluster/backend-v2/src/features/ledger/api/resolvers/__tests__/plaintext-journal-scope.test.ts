import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { LedgerJournalQueryResolver } from "../ledger-journal-resolver.query";
import { REPORT_ROUTES } from "@/features/ledger/api/rest/v1/reports-handler";
import { PLAINTEXT_JOURNAL_SCOPE } from "@/features/ledger/utils/plaintext-journal-scope";
import { HealthResolver } from "@/features/healthz/api/health-resolver";

// w23/239: the plaintext journal holds transactions, balance assertions and
// pads only (the ledger service's `plaintextExportDirectives`), where "the
// journal text" reads as a copy of the ledger. REST, GraphQL and MCP describe
// one read, so each published description has to carry the same scope.
describe("the plaintext journal's published scope", () => {
  it("names exactly what the export holds and what it leaves out", () => {
    expect(PLAINTEXT_JOURNAL_SCOPE).toContain(
      "transactions, balance assertions and pads only",
    );
    for (const left of [
      "open",
      "close",
      "commodity",
      "price",
      "event",
      "note",
      "document",
      "custom",
    ]) {
      expect(PLAINTEXT_JOURNAL_SCOPE).toContain(left);
    }
    expect(PLAINTEXT_JOURNAL_SCOPE).toContain("not a copy of the ledger");
  });

  it("is in the REST route's description, and the other journal reads are untouched", () => {
    const route = (segment: string) =>
      REPORT_ROUTES.find((r) => String(r.path).endsWith(`/${segment}`));
    expect(route("plaintext-journal")?.description).toContain(
      PLAINTEXT_JOURNAL_SCOPE,
    );
    expect(route("journal")?.description).not.toContain("pads only");
    expect(route("account-journal")?.description).not.toContain("pads only");
  });

  it("is in the GraphQL field's description", async () => {
    const resolver = new LedgerJournalQueryResolver({} as never);
    const schema = await buildSchema({
      resolvers: [LedgerJournalQueryResolver, HealthResolver],
      container: {
        get: (target) =>
          target === LedgerJournalQueryResolver
            ? resolver
            : new HealthResolver(),
      },
      validate: true,
    });
    const fields = schema.getQueryType()!.getFields();
    expect(fields.getLedgerPlaintextJournal.description).toContain(
      PLAINTEXT_JOURNAL_SCOPE,
    );
    expect(fields.getLedgerJournal?.description ?? "").not.toContain(
      "pads only",
    );
  });
});
