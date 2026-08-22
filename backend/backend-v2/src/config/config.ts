import { getJwks } from "./jwks";

// Type definitions for configuration
interface ServerConfig {
  proxy: boolean;
  port: number;
  url: string;
}

interface LoggerConfig {
  enabled: boolean;
  level: string;
}

interface PostgresConfig {
  uri: string;
}

interface SendGridConfig {
  apiKey: string;
}

interface AnalyticsConfig {
  gaMeasurementId: string;
}

interface JwtConfig {
  secret: string;
  /** Token lifetime in minutes. Default 525600 (365 days); override via AUTH_JWT_EXP_MINUTES for local testing. */
  expMins: number;
}

interface FavaAPIConfig {
  baseUrl: string;
  adminUser: string;
  adminPassword: string;
}

interface DashboardConfig {
  url: string;
}

export interface GiteaConfig {
  hostname: string;
  internalHostname: string;
  httpPort: number;
  externalHttpPort: number;
  /** Port advertised in clone URLs. */
  sshPort: number;
  /** Where Gitea's SSH listens inside the compose network. */
}

export interface SshProxyConfig {
  enabled: boolean;
  port: number;
  hostKey: string;
}


interface BlockEdenConfig {
  accessKey: string;
}

interface ClaudeCodeSandboxConfig {
  apiUrl: string;
}

interface AgentConfig {
  mode: "self-hosted" | "sandbox";
  sandboxApiUrl: string;
}

interface StripeConfig {
  webhookSecret: string;
  publicKey: string;
  privateKey: string;
  dev: {
    webhookSecret: string;
    publicKey: string;
    privateKey: string;
  };
}

interface RedisConfig {
  uri: string;
}

export interface AssetS3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  uploadUrlExpiration: number; // seconds
  downloadUrlExpiration: number; // seconds
}

interface LokiConfig {
  host: string;
}

export type PlaidEnvironment = "sandbox" | "development" | "production";

export interface PlaidConfig {
  clientId: string;
  secret: string;
  environment: PlaidEnvironment;
  webhookUrl: string;
}

export type Environment = "production" | "development" | "test";

interface OAuthDiscourseClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface OAuthConfig {
  issuer: string;
  jwks: { keys: object[] };
  /**
   * Static "discourse" client for third-party identity login (see
   * features/oauth/api/oidc-route.ts). Confidential client with a real
   * secret — a public/secretless client can't work here: the
   * discourse-openid-connect plugin always sends client authentication
   * (never omits it for "none"), and oidc-provider explicitly rejects an
   * empty secret rather than treating it as "no secret" (verified against
   * both sides' source — see the comment on buildStaticClients).
   */
  discourseClient: OAuthDiscourseClientConfig;
}

export interface AppConfig {
  sshProxy: SshProxyConfig;
  env: Environment;
  project: string;
  server: ServerConfig;
  analytics: AnalyticsConfig;
  logger: LoggerConfig;
  sendGrid: SendGridConfig;
  postgres: PostgresConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  favaApi: FavaAPIConfig;
  dashboard: DashboardConfig;
  gitea: GiteaConfig;
  blockeden: BlockEdenConfig;
  claudeCodeSandbox: ClaudeCodeSandboxConfig;
  /** Controls which Ask AI backend to use: "bql" (local LLM+BQL) or "sandbox" (Cloudflare sandbox proxy) */
  askAiMode: "bql" | "sandbox";
  agent: AgentConfig;
  stripe: StripeConfig;
  tempAssetS3: AssetS3Config;
  loki: LokiConfig;
  plaid: PlaidConfig;
  metricsApiToken: string;
  adminToken: string;
  oauth: OAuthConfig;
}

function getEnvironment(env: unknown): Environment {
  if (typeof env !== "string") {
    return "production";
  }
  switch (env) {
    case "development":
      return "development";
    case "test":
      return "test";
    default:
      return "production";
  }
}

function getPlaidEnvironment(env: unknown): PlaidEnvironment {
  if (typeof env !== "string") {
    return "sandbox";
  }
  switch (env) {
    case "sandbox":
      return "sandbox";
    case "development":
      return "development";
    case "production":
      return "production";
    default:
      return "sandbox";
  }
}

export const config: AppConfig = {
  env: getEnvironment(process.env.NODE_ENV),
  project: "beancount-io",
  jwt: {
    secret: process.env.AUTH_SECRET || "",
    expMins: parseInt(process.env.AUTH_JWT_EXP_MINUTES || "525600", 10),
  },
  favaApi: {
    baseUrl: process.env.FAVA_API_URL || "",
    adminUser: process.env.FAVA_API_ADMIN_USER || "",
    adminPassword: process.env.FAVA_API_ADMIN_PASSWORD || "",
  },
  dashboard: {
    url: process.env.DASHBOARD_URL || "https://beancount.io",
  },
  gitea: {
    hostname: process.env.EXTERNAL_GITEA_HOST_NAME || "git.beancount.io",
    internalHostname: process.env.GITEA_HOST_NAME || "gitea",
    httpPort: parseInt(process.env.GITEA_HTTP_PORT || "3000", 10),
    externalHttpPort: parseInt(
      process.env.EXTERNAL_GITEA_HTTP_PORT || "443",
      10,
    ),
    sshPort: parseInt(process.env.GITEA_SSH_PORT || "2222", 10),
  },

  /**
   * The SSH half of the git control plane (ADR 0004). Disabled unless a host
   * key is configured: starting a listener that presents a key nobody has seen
   * would break every existing client with a host-key warning.
   */
  sshProxy: {
    enabled: process.env.SSH_PROXY_ENABLED === "true",
    port: parseInt(process.env.SSH_PROXY_PORT || "2222", 10),
    // OpenSSH private key, PEM-encoded. Must be Gitea's own host key: any
    // other key gives every prior client a host-key-changed warning that is
    // indistinguishable from an attack (ADR 0004). Retrieve it with
    // _infra/print-ssh-host-key.sh.
    hostKey: process.env.SSH_PROXY_HOST_KEY || "",
  },
  blockeden: {
    accessKey: process.env.BLOCKEDEN_ACCESS_KEY || "",
  },
  claudeCodeSandbox: {
    apiUrl: process.env.CLAUDE_CODE_SANDBOX_URL || "",
  },
  askAiMode: process.env.ASK_AI_MODE === "sandbox" ? "sandbox" : "bql",
  agent: {
    mode: process.env.AGENT_MODE === "sandbox" ? "sandbox" : "self-hosted",
    sandboxApiUrl: process.env.CLAUDE_CODE_AGENT_URL || "",
  },
  server: {
    proxy: true,
    port: parseInt(process.env.PORT || "4104", 10),
    url: process.env.SERVER_URL || "https://api.v3.beancount.io",
  },
  logger: {
    enabled: true,
    level: "debug",
  },
  postgres: {
    uri: process.env.POSTGRES_BACKEND_URI || "",
  },
  redis: {
    uri: process.env.REDIS_URI || "redis://localhost:6379",
  },
  sendGrid: {
    apiKey: process.env.SEND_GRID_API_KEY || "",
  },
  analytics: {
    gaMeasurementId: "G-94TFG6X2Q5",
  },
  stripe: {
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    publicKey: process.env.STRIPE_PUBLIC_KEY || "",
    privateKey: process.env.STRIPE_PRIVATE_KEY || "",
    dev: {
      webhookSecret: process.env.STRIPE_DEV_WEBHOOK_SECRET || "",
      publicKey: process.env.STRIPE_DEV_PUBLIC_KEY || "",
      privateKey: process.env.STRIPE_DEV_PRIVATE_KEY || "",
    },
  },
  tempAssetS3: {
    endpoint: process.env.TEMP_ASSETS_AWS_S3_ENDPOINT || "",
    region: process.env.TEMP_ASSETS_AWS_S3_REGION || "",
    bucket: process.env.TEMP_ASSETS_AWS_S3_BUCKET || "",
    accessKeyId: process.env.TEMP_ASSETS_AWS_S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.TEMP_ASSETS_AWS_S3_SECRET_ACCESS_KEY || "",
    uploadUrlExpiration: 300, // 5 minutes
    downloadUrlExpiration: 600, // 10 minutes
  },
  loki: {
    host: process.env.LOKI_HOST || "",
  },
  plaid: {
    clientId: process.env.PLAID_CLIENT_ID || "",
    secret: process.env.PLAID_SECRET || "",
    environment: getPlaidEnvironment(process.env.PLAID_ENVIRONMENT),
    webhookUrl: process.env.PLAID_WEBHOOK_URL || "",
  },
  metricsApiToken: process.env.METRICS_API_TOKEN || "",
  adminToken: process.env.ADMIN_TOKEN || "",
  oauth: {
    // Hardcoded, not env-sourced: this is the one field that previously broke
    // production. `?? "https://beancount.io"` only falls back on null/undefined,
    // not on an empty string — passing OAUTH_ISSUER through docker-compose.yml
    // as `${OAUTH_ISSUER:-}` turned "unset" into "" (defined, empty), which
    // `new Provider("", ...)` in oidc-route.ts rejects with an uncaught
    // AssertionError, crashing the whole server on startup. Never make this
    // env-configurable again without switching the fallback to `||` — see the
    // "issuer is hardcoded, not env-configurable" test in
    // features/oauth/api/__tests__/oidc-route.test.ts.
    issuer: "https://beancount.io",
    jwks: getJwks(getEnvironment(process.env.NODE_ENV)),
    discourseClient: {
      // Hardcoded — not sensitive, and hardcoding removes a source of
      // config/deploy error. Only clientSecret is env-sourced (see below).
      clientId: "discourse-forum",
      // OmniAuth's default /auth/:provider/callback path — the
      // discourse-openid-connect plugin registers its strategy as "oidc"
      // (OpenIDConnectAuthenticator#name), combined with this site's
      // DISCOURSE_RELATIVE_URL_ROOT=/forum.
      redirectUri: "https://beancount.io/forum/auth/oidc/callback",
      // The ONLY env var this feature reads. `||` (not `??`) so an empty
      // string is treated the same as unset — buildStaticClients() in
      // oidc-route.ts then safely registers no client at all rather than
      // erroring; the server boots normally either way.
      clientSecret: process.env.OAUTH_DISCOURSE_CLIENT_SECRET || "",
    },
  },
};
