import {
  ApolloError,
  type ApolloClient,
  type DocumentNode,
  type OperationVariables,
} from "@apollo/client";
import type { GraphQLFormattedError } from "graphql";

/**
 * Whether a GraphQL error only withholds one record's optional star status:
 * a FORBIDDEN on `<field>[index].isStarred` whose record arrived with that
 * status null. The rest of the record is the catalog the reader asked for,
 * and the star control already treats null as unknown and stays disabled.
 */
function isOptionalStarDenial(
  error: GraphQLFormattedError,
  field: string,
  records: readonly ({ isStarred?: boolean | null } | null)[],
): boolean {
  const path = error.path;
  if (
    error.extensions?.code !== "FORBIDDEN" ||
    path?.length !== 3 ||
    path[0] !== field ||
    typeof path[1] !== "number" ||
    path[2] !== "isStarred"
  ) {
    return false;
  }
  const record = records[path[1]];
  return record != null && record.isStarred == null;
}

/**
 * Runs a ledger-catalog page query, keeping the page when its only errors are
 * withheld star statuses (see {@link isOptionalStarDenial}). One denied
 * optional field used to reject every record on the page, and with it all
 * later pages. Any other error still fails the page as before: root denials,
 * authentication, other fields, missing data, transport failures.
 */
export async function queryCatalogPage<
  TData extends Record<string, unknown>,
  TVariables extends OperationVariables,
>(
  client: ApolloClient<unknown>,
  options: {
    query: DocumentNode;
    variables: TVariables;
    context?: Record<string, unknown>;
  },
  field: keyof TData & string,
): Promise<TData> {
  const { data, errors } = await client.query<TData, TVariables>({
    ...options,
    fetchPolicy: "no-cache",
    errorPolicy: "all",
  });
  const records = data?.[field];
  if (!errors?.length) {
    if (!Array.isArray(records)) throw new Error(`Missing ${field} data`);
    return data;
  }
  if (
    Array.isArray(records) &&
    errors.every((error) => isOptionalStarDenial(error, field, records))
  ) {
    return data;
  }
  throw new ApolloError({ graphQLErrors: errors });
}
