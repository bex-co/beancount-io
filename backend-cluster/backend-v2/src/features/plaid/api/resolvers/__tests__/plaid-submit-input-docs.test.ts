import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { buildSchema } from "type-graphql";
import { GraphQLInputObjectType } from "graphql";
import { PlaidMutationResolver } from "../plaid-resolver.mutation";
import { PlaidQueryResolver } from "../plaid-resolver.query";

/**
 * w23/175: the bank-submit item is camelCase-only on REST and GraphQL while
 * the MCP bank tool also takes the snake_case spellings (the owner kept the
 * documented-leniency model, w23/172), so the schema agents read says so. The
 * REST field descriptions are pinned by the checked-in OpenAPI snapshot.
 */
describe("PlaidTransactionSubmitInput field descriptions", () => {
  it.each([
    ["transactionId", "transaction_id"],
    ["targetAccount", "target_account"],
    ["sourceAccount", "source_account"],
  ])(
    "%s says it is camelCase only and names the MCP twin %s",
    async (field, twin) => {
      const schema = await buildSchema({
        resolvers: [PlaidQueryResolver, PlaidMutationResolver],
        container: { get: () => ({}) },
        validate: false,
      });
      const input = schema.getType(
        "PlaidTransactionSubmitInput",
      ) as GraphQLInputObjectType;
      const description = input.getFields()[field]?.description ?? "";
      expect(description).toContain("camelCase only");
      expect(description).toContain(twin);
    },
  );
});
