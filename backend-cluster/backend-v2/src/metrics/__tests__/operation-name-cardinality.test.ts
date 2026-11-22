import "reflect-metadata";
import { randomBytes } from "node:crypto";
import { ApolloServer } from "@apollo/server";
import { apolloMetricsPlugin } from "../apollo-plugin";
import {
  graphqlQueryDuration,
  graphqlQueryTotal,
} from "../metrics-definitions";

/**
 * The `operation_name` label measured on the real prom-client registry: how
 * many series GraphQL traffic adds depends on the schema and the first-party
 * clients, not on the operation names requests carry.
 */
const typeDefs = /* GraphQL */ `
  type Ledger {
    id: ID!
  }
  type Query {
    ledgers: [Ledger!]!
    ledger(id: ID!): Ledger
  }
`;
const resolvers = {
  Query: {
    ledgers: () => [{ id: "1" }],
    ledger: () => ({ id: "1" }),
  },
};

async function recordedOperationNames(): Promise<Set<string>> {
  const [totals, durations] = await Promise.all([
    graphqlQueryTotal.get(),
    graphqlQueryDuration.get(),
  ]);
  return new Set(
    [...totals.values, ...durations.values].map((value) =>
      String(value.labels.operation_name),
    ),
  );
}

describe("operation_name label cardinality", () => {
  let server: ApolloServer;

  async function run(
    query: string,
    operationName?: string,
    variables?: Record<string, unknown>,
  ): Promise<void> {
    const response = await server.executeOperation(
      { query, operationName, variables },
      { contextValue: {} },
    );
    if (response.body.kind !== "single") {
      throw new Error("expected a single result");
    }
    expect(response.body.singleResult.errors).toBeUndefined();
  }

  beforeAll(async () => {
    server = new ApolloServer({
      typeDefs,
      resolvers,
      plugins: [apolloMetricsPlugin],
    });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    graphqlQueryTotal.reset();
    graphqlQueryDuration.reset();
  });

  it("distinct operation names collapse to the root field they select", async () => {
    const requests = 10_000;
    for (let i = 0; i < requests; i++) {
      const name = `Op${randomBytes(6).toString("hex")}`;
      await run(`query ${name} { __typename }`, name);
    }

    expect(await recordedOperationNames()).toEqual(new Set(["__typename"]));
    const { values } = await graphqlQueryTotal.get();
    expect(values).toEqual([
      expect.objectContaining({
        labels: { operation_name: "__typename", status: "success" },
        value: requests,
      }),
    ]);
  }, 120_000);

  it("first-party operations keep their own names", async () => {
    await run("query ListLedgers { ledgers { id } }", "ListLedgers");
    await run(
      "query GetLedger($ledgerId: ID!) { ledger(id: $ledgerId) { id } }",
      "GetLedger",
      { ledgerId: "1" },
    );

    expect(await recordedOperationNames()).toEqual(
      new Set(["ListLedgers", "GetLedger"]),
    );
  });

  it("operations no first-party client defines are labelled by root field", async () => {
    await run("query MyScript { ledgers { id } }", "MyScript");
    await run("{ ledger(id: 1) { id } }");

    expect(await recordedOperationNames()).toEqual(
      new Set(["ledgers", "ledger"]),
    );
  });
});
