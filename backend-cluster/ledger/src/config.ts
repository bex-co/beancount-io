export interface AppConfig {
  env: string;
  port: number;
  loki?: {
    host: string;
  };
  gitea: {
    hostName: string;
    httpPort: number;
    /**
     * Fully-qualified Gitea base URL, derived once from hostName/httpPort/
     * GITEA_PROTOCOL. Call sites use this instead of rebuilding
     * `http://<host>:<port>`: an off-cluster Gitea is reached over https on
     * 443, which a hardcoded scheme cannot express.
     */
    baseUrl: string;
  };
  backendV2: {
    hostName: string;
    httpPort: number;
    adminToken: string;
  };
}

/**
 * Derive the Gitea base URL. Scheme comes from GITEA_PROTOCOL when set,
 * otherwise https on 443 and http elsewhere; the port suffix is omitted for
 * the scheme's default port so the URL stays canonical.
 */
function giteaBaseUrl(
  hostName: string,
  port: number,
  protocolEnv?: string,
): string {
  const protocol = protocolEnv || (port === 443 ? "https" : "http");
  const defaultPort = protocol === "https" ? 443 : 80;
  const portSuffix = port === defaultPort ? "" : `:${port}`;
  return `${protocol}://${hostName}${portSuffix}`;
}

// Defaults mirror the retired Python service's Settings so the services
// stayed interchangeable behind the same compose wiring.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const giteaHostName = env.GITEA_HOST_NAME || "beancount-gitea";
  const giteaHttpPort = parseInt(env.GITEA_HTTP_PORT || "3000", 10);
  return {
    env: env.NODE_ENV || "development",
    port: parseInt(env.PORT || "8000", 10),
    loki: env.LOKI_HOST ? { host: env.LOKI_HOST } : undefined,
    gitea: {
      hostName: giteaHostName,
      httpPort: giteaHttpPort,
      baseUrl: giteaBaseUrl(giteaHostName, giteaHttpPort, env.GITEA_PROTOCOL),
    },
    backendV2: {
      hostName: env.BACKEND_V2_HOST_NAME || "backend-v2",
      httpPort: parseInt(env.BACKEND_V2_HTTP_PORT || "4104", 10),
      adminToken: env.BACKEND_V2_ADMIN_TOKEN || "",
    },
  };
}

export const config = loadConfig();
