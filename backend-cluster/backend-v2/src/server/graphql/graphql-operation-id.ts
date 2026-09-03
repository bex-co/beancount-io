import type { GraphQLResolveInfo } from "graphql";
import { gqlOpId } from "@/server/api/op-class";

/** Stable operation id for a GraphQL root field; nested fields have none. */
export function graphqlOperationId(
  info: Pick<GraphQLResolveInfo, "parentType" | "fieldName">,
): string | undefined {
  const parent = info.parentType.name;
  return parent === "Query" || parent === "Mutation"
    ? gqlOpId(`${parent}.${info.fieldName}`)
    : undefined;
}
