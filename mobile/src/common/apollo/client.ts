import { ApolloClient, ApolloLink, HttpLink } from "@apollo/client";

import { getEndpoint } from "@/common/request";
import { sessionVar } from "@/common/vars";
import { onErrorLink } from "@/common/apollo/error-handling";
import { cache } from "@/common/apollo/cache";

const middlewareLink = new ApolloLink((operation, forward) => {
  const token = sessionVar()?.authToken;
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
      uri: getEndpoint("api-gateway/"),
    }),
  ]),
);

export const apolloClient = new ApolloClient({
  link,
  cache,
});
