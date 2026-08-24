import {
  ApolloLink,
  execute,
  gql,
  Observable,
  type FetchResult,
} from "@apollo/client";
import { createAuthErrorLink } from "../auth-error-link";
import { OAuthRefreshError } from "../../oauth/token-manager";
import type { OAuthSession } from "../../oauth/session-record";

const session: OAuthSession = {
  kind: "oauth",
  serverUrl: "https://books.example.test/",
  issuer: "https://books.example.test",
  resource: "https://books.example.test/v1",
  tokenEndpoint: "https://books.example.test/api-gateway/oauth/token",
  revocationEndpoint: "https://books.example.test/api-gateway/oauth/revoke",
  clientId: "beancount-mobile",
  userId: "user-1",
  scopes: ["ledger.read"],
  tokenType: "Bearer",
  accessToken: "access-old",
  accessTokenExpiresAt: 123,
  refreshToken: "refresh-old",
};

const unauthenticated: FetchResult = {
  errors: [{ message: "expired", extensions: { code: "UNAUTHENTICATED" } }],
};

function observableResult(link: ApolloLink): Promise<FetchResult> {
  return new Promise((resolve, reject) => {
    execute(link, {
      query: gql`
        query RefreshTest {
          health
        }
      `,
    }).subscribe({
      next: resolve,
      error: reject,
    });
  });
}

describe("OAuth Apollo refresh link", () => {
  it("refreshes and replays one operation with the replacement token", async () => {
    let calls = 0;
    let retries = 0;
    const errorLink = createAuthErrorLink({
      getSession: () => session,
      refresh: async () => "access-new",
      teardown: async () => {},
      onTerminalRefreshFailure: () => {},
    });
    const downstream = new ApolloLink((operation) => {
      calls += 1;
      if (calls === 1) return Observable.of(unauthenticated);
      expect(operation.getContext().oauthRetry).toBe(true);
      expect(operation.getContext().headers.authorization).toBe(
        "Bearer access-new",
      );
      retries += 1;
      return Observable.of({ data: { health: "OK" } });
    });

    expect(await observableResult(errorLink.concat(downstream))).toEqual({
      data: { health: "OK" },
    });
    expect(calls).toBe(2);
    expect(retries).toBe(1);
  });

  it("tears down once when the replay is still unauthenticated", async () => {
    let teardownCalls = 0;
    const errorLink = createAuthErrorLink({
      getSession: () => session,
      refresh: async () => "access-new",
      teardown: async () => {
        teardownCalls += 1;
      },
      onTerminalRefreshFailure: () => {},
    });
    const downstream = new ApolloLink(() => Observable.of(unauthenticated));

    await observableResult(errorLink.concat(downstream));
    await Promise.resolve();
    expect(teardownCalls).toBe(1);
  });

  it("does not clear a session for a transient refresh failure", async () => {
    let teardownCalls = 0;
    const errorLink = createAuthErrorLink({
      getSession: () => session,
      refresh: async () => {
        throw new OAuthRefreshError(false);
      },
      teardown: async () => {
        teardownCalls += 1;
      },
      onTerminalRefreshFailure: () => {},
    });
    const downstream = new ApolloLink(() => Observable.of(unauthenticated));

    let failure: unknown;
    try {
      await observableResult(errorLink.concat(downstream));
    } catch (error) {
      failure = error;
    }
    expect(failure instanceof OAuthRefreshError).toBe(true);
    expect(teardownCalls).toBe(0);
  });
});
