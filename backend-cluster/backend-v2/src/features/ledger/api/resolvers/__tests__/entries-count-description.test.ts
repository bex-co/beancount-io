import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { LedgerDataQueryResolver } from "../ledger-data-resolver.query";
import { HealthResolver } from "@/features/healthz/api/health-resolver";

// w23/236: `getEntriesCountPerType` leaves out managed price feed directives
// (ADR 015 §9; the plan limit reads this report) while the journal and BQL
// count them, so Price here is lower on a ledger with a feed. The field's
// published description has to say so, or an agent that reconciles the two
// finds a gap of the feed's size with no stated reason.
describe("getLedgerEntriesCountPerType description", () => {
  it("names the managed price exclusion", async () => {
    const resolver = new LedgerDataQueryResolver({} as never);
    const schema = await buildSchema({
      resolvers: [LedgerDataQueryResolver, HealthResolver],
      container: {
        get: (target) =>
          target === LedgerDataQueryResolver ? resolver : new HealthResolver(),
      },
      validate: true,
    });
    const field = schema
      .getQueryType()!
      .getFields().getLedgerEntriesCountPerType;
    expect(field.description).toMatch(
      /managed price feed directives are not counted/i,
    );
    expect(field.description).toMatch(/plan limit/);
    expect(field.description).toMatch(/journal and BQL/);
  });
});
