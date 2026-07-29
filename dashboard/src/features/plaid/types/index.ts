import type { GetPlaidItemsQuery } from "@/graphql/definitions";

// Extract the array element type from the query result
export type PlaidItem = GetPlaidItemsQuery["getPlaidItems"][number];
