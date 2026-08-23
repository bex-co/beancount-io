import { Api as GiteaApi } from "../client/gitea-api";
import { config } from "@/config/config";

/**
 * Create Gitea API client with Basic Auth (username/password)
 */
export const createGiteaClient = (
  username: string,
  password: string,
): GiteaApi<unknown> => {
  // Use port 3000 for internal Docker communication (container internal port)
  const baseUrl = `${config.gitea.internalBaseUrl}/api/v1`;

  return new GiteaApi({
    baseUrl,
    baseApiParams: {
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      },
    },
  });
};

/**
 * Create Gitea API client without authentication for public endpoints.
 * Gitea allows public access to user profiles without authentication.
 * Note: Activities and some other endpoints require authentication even for public data.
 */
export const createAnonymousGiteaClient = (): GiteaApi<unknown> => {
  const baseUrl = `${config.gitea.internalBaseUrl}/api/v1`;
  return new GiteaApi({ baseUrl });
};

/**
 * Create Gitea API client with API token
 */
export const createGiteaTokenClient = (apiToken: string): GiteaApi<unknown> => {
  // Use port 3000 for internal Docker communication (container internal port)
  const baseUrl = `${config.gitea.internalBaseUrl}/api/v1`;

  return new GiteaApi({
    baseUrl,
    baseApiParams: {
      headers: {
        Authorization: `token ${apiToken}`,
      },
    },
  });
};
