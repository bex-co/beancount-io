export interface AppConfig {
  env: string;
  port: number;
  loki?: {
    host: string;
  };
  gitea: {
    hostName: string;
    httpPort: number;
  };
  backendV2: {
    hostName: string;
    httpPort: number;
    adminToken: string;
  };
}

// Defaults mirror the retired Python service's Settings so the services
// stayed interchangeable behind the same compose wiring.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    env: env.NODE_ENV || "development",
    port: parseInt(env.PORT || "8000", 10),
    loki: env.LOKI_HOST ? { host: env.LOKI_HOST } : undefined,
    gitea: {
      hostName: env.GITEA_HOST_NAME || "beancount-gitea",
      httpPort: parseInt(env.GITEA_HTTP_PORT || "3000", 10),
    },
    backendV2: {
      hostName: env.BACKEND_V2_HOST_NAME || "backend-v2",
      httpPort: parseInt(env.BACKEND_V2_HTTP_PORT || "4104", 10),
      adminToken: env.BACKEND_V2_ADMIN_TOKEN || "",
    },
  };
}

export const config = loadConfig();
