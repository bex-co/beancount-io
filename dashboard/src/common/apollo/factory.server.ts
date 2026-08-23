import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { serverConfig } from "@/config/config.server";

import { getCookie } from "@tanstack/react-start/server";

// Dev-only SSR request logging (see the DEV-gated link wiring below).
// Never log operation.variables: they can contain user financial data (PII)
// and must never end up in server logs.
const loggingLink = new ApolloLink((operation, forward) => {
  const start = Date.now();
  return new Observable((observer) => {
    const sub = forward(operation).subscribe({
      next: (result) => {
        console.log(
          `[Apollo SSR] ${operation.operationName} ← ${Date.now() - start}ms`,
          result.errors ?? "ok",
        );
        observer.next(result);
      },
      error: (err) => {
        console.error(`[Apollo SSR] ${operation.operationName} ✗`, err);
        observer.error(err);
      },
      complete: () => observer.complete(),
    });
    return () => sub.unsubscribe();
  });
});

/** Create an Apollo client for server-side rendering. Forwards the incoming
 *  request cookie to the backend so authenticated queries work on the server. */
export function createApolloSsrClient() {
  const token = getCookie("authSess:beancount.io");
  const httpLink = new HttpLink({
    uri: serverConfig.apiUrl,
    fetch,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return new ApolloClient({
    ssrMode: true,
    link: import.meta.env.DEV
      ? ApolloLink.from([loggingLink, httpLink])
      : httpLink,
    cache: new InMemoryCache(),
  });
}
