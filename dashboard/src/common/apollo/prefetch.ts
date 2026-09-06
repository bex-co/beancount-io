import type { ApolloClient, OperationVariables } from "@apollo/client";

/**
 * Start an optional panel's query in the browser without gating the route.
 *
 * The panel owns the same operation through `useQuery` and renders its own
 * pending and unavailable states, so this only lets the request begin
 * alongside the route's primary data: Apollo deduplicates the in-flight
 * operation when the panel mounts, and a failure is left for the panel to
 * handle. Nothing is started during SSR — the dehydrated cache then carries
 * only awaited primary data, and the server never waits on, or races, an
 * optional request.
 */
export function prefetchOptionalQuery<
  TData,
  TVariables extends OperationVariables,
>(
  client: ApolloClient,
  options: ApolloClient.QueryOptions<TData, TVariables>,
): void {
  if (import.meta.env.SSR) return;
  void client.query(options).catch(() => undefined);
}
