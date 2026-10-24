import { ApolloClient, ApolloLink, HttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

import { getEndpoint } from "@/common/request";
import { onErrorLink } from "@/common/apollo/error-handling";
import { cache } from "@/common/apollo/cache";
import { APOLLO_DEFAULT_OPTIONS } from "@/common/apollo/default-options";
import { oauthTokenManager } from "@/common/oauth/oauth-token-manager";
import { buildAuthHeaders } from "@/common/apollo/auth-headers";

const middlewareLink = setContext(async (_operation, { headers = {} }) => {
  const token = await oauthTokenManager.getAccessToken();
  return {
    headers: buildAuthHeaders(headers, token),
  };
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
  defaultOptions: APOLLO_DEFAULT_OPTIONS,
  // A read sent after a write must not fold into one already in flight: that
  // one answers with the rows as they stood before the write, and a deleted row
  // stayed listed until the next refresh (w21/904).
  queryDeduplication: false,
});
