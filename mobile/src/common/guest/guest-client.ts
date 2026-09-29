import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { getMainDefinition } from "@apollo/client/utilities";
import { endpointFor } from "../server-url-validation";
import {
  EXAMPLE_IDS,
  type ExampleId,
  type GuestReadFailure,
} from "./guest-state";

export function guestReadFailure(error: {
  graphQLErrors?: readonly { extensions?: Record<string, unknown> }[];
  networkError?: unknown;
}): GuestReadFailure {
  return error.graphQLErrors?.some(({ extensions }) =>
    ["FORBIDDEN", "UNAUTHENTICATED", "NOT_FOUND"].includes(
      String(extensions?.code),
    ),
  )
    ? "unavailable"
    : "connection";
}

// These are the existing anonymous read operations mounted by the shared preview screens.
// An accidental account query or mutation cannot reach the network from here.
const PUBLIC_OPERATIONS = new Set([
  "GetLedger",
  "LedgerReadContext",
  "BalanceSheet",
  "BalanceSheetBasis",
  "TrialBalance",
  "IncomeStatement",
  "LedgerPrices",
  "LedgerManagedPrices",
  "GetLedgerJournal",
  "GetLedgerIntervalTotals",
  "getLedgerDirContent",
  "getLedgerFile",
  "getLedgerErrors",
  "GetLedgerEntryContext",
  "AccountReport",
  "AccountJournal",
]);

export function createGuestClient(
  serverUrl: string,
  ledgerId: ExampleId | null,
  onFailure?: (failure: GuestReadFailure) => void,
) {
  const gate = new ApolloLink((operation, forward) => {
    const definition = getMainDefinition(operation.query);
    if (
      definition.kind !== "OperationDefinition" ||
      definition.operation !== "query" ||
      !PUBLIC_OPERATIONS.has(operation.operationName) ||
      !(EXAMPLE_IDS as readonly string[]).includes(
        operation.variables.ledgerId,
      ) ||
      (ledgerId !== null && operation.variables.ledgerId !== ledgerId)
    ) {
      return new Observable((observer) =>
        observer.error(
          new Error("Guest operation is not a public example read"),
        ),
      );
    }
    return forward(operation);
  });
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: ApolloLink.from([
      gate,
      onError((error) => {
        onFailure?.(guestReadFailure(error));
      }),
      new HttpLink({
        uri: endpointFor(serverUrl, "api-gateway/"),
        credentials: "omit",
        headers: { "x-app-id": "beancount-mobile" },
        // No authentication middleware, shared cache, or persisted storage.
        fetch: async (uri, options) => {
          const controller = new AbortController();
          const abort = () => controller.abort();
          options?.signal?.addEventListener("abort", abort);
          const timer = setTimeout(abort, 15_000);
          try {
            return await fetch(uri, { ...options, signal: controller.signal });
          } finally {
            clearTimeout(timer);
            options?.signal?.removeEventListener("abort", abort);
          }
        },
      }),
    ]),
  });
}
