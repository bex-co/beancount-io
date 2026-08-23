import { ApolloClient, ApolloLink, HttpLink } from "@apollo/client";

import { getEndpoint } from "@/common/request";
import { sessionVar } from "@/common/vars";
import { getServerUrl } from "@/common/vars/server-url";
import { sessionTokenForServer } from "@/common/session-utils";
import { onErrorLink } from "@/common/apollo/error-handling";
import { cache } from "@/common/apollo/cache";

const middlewareLink = new ApolloLink((operation, forward) => {
  // The equality guard is defense in depth for startup and server-change
  // transitions: a bearer token is valid only for its issuing server.
  const token = sessionTokenForServer(sessionVar(), getServerUrl());
  operation.setContext(
    ({ headers = {} }: { headers?: Record<string, string> }) => ({
      headers: {
        ...headers,
        "x-app-id": "beancount-mobile",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    }),
  );
  return forward(operation);
});

// use with apollo-client
const link = middlewareLink.concat(
  ApolloLink.from([
    onErrorLink,
    new HttpLink({
      // HttpLink accepts a URI resolver. Reading it per operation makes a
      // runtime server change effective without recreating Apollo providers.
      uri: () => getEndpoint("api-gateway/"),
    }),
  ]),
);

export const apolloClient = new ApolloClient({
  link,
  cache,
});
