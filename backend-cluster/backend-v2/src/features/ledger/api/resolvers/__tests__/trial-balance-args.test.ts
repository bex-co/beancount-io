import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerFinanceQueryResolver } from "../ledger-finance-resolver.query";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import type { Identity } from "@/server/api/identity";

const identity: Identity = {
  userId: "user-123",
  method: "oauth",
  scopes: new Set(),
};

// w23/159: the trial balance is hierarchy-only, so its args drop
// `interval` — GraphQL validation refuses one outright.
describe("getLedgerTrialBalance args", () => {
  const getTrialBalance = jest.fn(async () => ({
    income_hierarchy_data: null,
    liabilities_hierarchy_data: null,
    equity_hierarchy_data: null,
    expenses_hierarchy_data: null,
    assets_hierarchy_data: null,
  }));
  let schema: Awaited<ReturnType<typeof buildSchema>>;
  beforeAll(async () => {
    const resolver = new LedgerFinanceQueryResolver({
      getTrialBalance,
    } as never);
    schema = await buildSchema({
      resolvers: [LedgerFinanceQueryResolver, HealthResolver],
      container: {
        get: (target) =>
          target === LedgerFinanceQueryResolver ? resolver : new HealthResolver(),
      },
      validate: true,
    });
  });

  it("refuses an interval argument", async () => {
    const response = await graphql({
      schema,
      source: `query { getLedgerTrialBalance(ledgerId: "alice/main", interval: "month") { __typename } }`,
      contextValue: { identity, getCurrentIdentity: () => identity },
    });
    expect(getTrialBalance).not.toHaveBeenCalled();
    expect(response.errors?.map((e) => e.message).join("\n")).toMatch(
      /Unknown argument "interval"/,
    );
  });
});
