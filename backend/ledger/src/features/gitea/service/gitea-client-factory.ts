import { Api as GiteaApi } from "../client/gitea-api";
import { config } from "@/config";

/**
 * Clients are memoized per credential: the generated `GiteaApi` is a stateless
 * HTTP wrapper (base URL + default headers), so one instance per credential is
 * safe to share across requests. Beyond saving allocations, this identity
 * matters: the SHA-keyed FileMap cache coalesces concurrent HEAD lookups per
 * client *instance* (see `foundation/clients/load-cached-ledger-file-map.ts`),
 * so same-credential callers must receive the same instance for that dedup to
 * engage — and distinct credentials must not (the instance boundary is the
 * access boundary).
 *
 * The memo is bounded: past the cap, the oldest entry is dropped (Map preserves
 * insertion order). Rotated credentials simply mint a new entry under the new
 * key; the stale one ages out by eviction.
 */
const MAX_MEMOIZED_CLIENTS = 1000;
const clientsByCredential = new Map<string, GiteaApi<unknown>>();

/** Test-only: reset the per-credential memo so tests observe construction. */
export function clearMemoizedGiteaClients(): void {
  clientsByCredential.clear();
}

function giteaBaseUrl(): string {
  return `http://${config.gitea.hostName}:${config.gitea.httpPort}/api/v1`;
}

function memoizedClient(
  credentialKey: string,
  create: () => GiteaApi<unknown>,
): GiteaApi<unknown> {
  const existing = clientsByCredential.get(credentialKey);
  if (existing) {
    return existing;
  }
  if (clientsByCredential.size >= MAX_MEMOIZED_CLIENTS) {
    const oldest = clientsByCredential.keys().next().value;
    if (oldest !== undefined) {
      clientsByCredential.delete(oldest);
    }
  }
  const client = create();
  clientsByCredential.set(credentialKey, client);
  return client;
}

/**
 * Build a client that forwards the caller's `Authorization` header VERBATIM —
 * the Python service's auth model (`Context.auth_settings`): this service never
 * verifies credentials itself; Gitea is the sole authority. Works for both
 * `Basic <b64>` and Gitea's `token <sha1>` header forms.
 */
export const createGiteaClientFromAuthHeader = (
  authorizationHeader: string,
): GiteaApi<unknown> =>
  memoizedClient(`header:${authorizationHeader}`, () => {
    return new GiteaApi({
      baseUrl: giteaBaseUrl(),
      // Default every request to JSON response parsing. The generated client only
      // populates `response.data` when a `format` is set (otherwise `.data` stays
      // null), so without this default any call that forgets a per-call
      // `{ format: "json" }` silently returns `data: null`. Callers that need the
      // raw stream (e.g. `repoGetArchive`) read `response.body`/`.headers`, which
      // the client's `clone()`-before-parse leaves intact.
      baseApiParams: {
        format: "json",
        headers: {
          Authorization: authorizationHeader,
        },
      },
    });
  });

/**
 * Create Gitea API client with Basic Auth (username/password)
 */
export const createGiteaClient = (
  username: string,
  password: string,
): GiteaApi<unknown> =>
  createGiteaClientFromAuthHeader(
    `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
  );

/**
 * Create Gitea API client with API token
 */
export const createGiteaTokenClient = (apiToken: string): GiteaApi<unknown> =>
  createGiteaClientFromAuthHeader(`token ${apiToken}`);

/**
 * Create Gitea API client without authentication for public endpoints.
 */
export const createAnonymousGiteaClient = (): GiteaApi<unknown> =>
  memoizedClient("anonymous", () => {
    // See createGiteaClientFromAuthHeader: default to JSON so `.data` is populated.
    return new GiteaApi({
      baseUrl: giteaBaseUrl(),
      baseApiParams: { format: "json" },
    });
  });
