import { ApiClient } from "./api-client";
import { FavaApiClient } from "./types";

export const createFavaApi = (
  baseUrl: string,
  username: string,
  password: string,
): FavaApiClient => {
  return new ApiClient({
    baseUrl,
    baseApiParams: {
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      },
    },
  });
};

export const createAPIKeyFavaApi = (
  baseUrl: string,
  apiKey: string,
): FavaApiClient => {
  return new ApiClient({
    baseUrl,
    baseApiParams: {
      headers: {
        Authorization: `token ${apiKey}`,
      },
    },
  });
};

/**
 * Reuse an `Authorization` header the caller already holds.
 *
 * The git proxies translate a user's app credentials into their Gitea
 * credentials before forwarding, and ledger-v2 authenticates against the same
 * Gitea identity — so they have a ready-made header and never see the
 * username/password pair `createFavaApi` wants.
 */
export const createFavaApiWithAuthorization = (
  baseUrl: string,
  authorization: string,
  /** Overrides `ApiClient`'s 30s default — see `GATE_TIMEOUT_MS`. */
  timeoutMs?: number,
): FavaApiClient => {
  return new ApiClient({
    baseUrl,
    baseApiParams: { headers: { Authorization: authorization } },
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  });
};
