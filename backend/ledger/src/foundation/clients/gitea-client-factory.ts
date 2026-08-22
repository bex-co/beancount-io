import type { Api as GiteaApi } from "@/features/gitea/client/gitea-api";

/**
 * The donor branch's factory interface, narrowed to what the transplanted
 * services call. In backend-v2 this resolved clients from the users table; in
 * ledger-v2 auth is credential-forwarding, so a REQUEST-SCOPED factory hands
 * every caller the client built from the request's own Authorization header —
 * the Python service's access model (Gitea is the sole authority; the cache
 * never widens who can read a repo because the same forwarded credential does
 * the HEAD-SHA resolution and the load).
 */
export interface IGiteaClientFactory {
  getPublicApiClient(
    ledgerId: string,
    userId?: string,
  ): Promise<GiteaApi<unknown>>;
  getUserApiClient(userId: string): Promise<GiteaApi<unknown>>;
}

export class RequestScopedGiteaClientFactory implements IGiteaClientFactory {
  constructor(private readonly client: GiteaApi<unknown>) {}

  async getPublicApiClient(): Promise<GiteaApi<unknown>> {
    return this.client;
  }

  async getUserApiClient(): Promise<GiteaApi<unknown>> {
    return this.client;
  }
}
