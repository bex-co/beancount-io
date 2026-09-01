import { getOptionalJwks } from "./jwks";
import type { ScopeEnforcementMode } from "@/server/api/op-class";

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
  /**
   * Fully-qualified base URL for host->Gitea API calls, derived once from
   * internalHostname/httpPort/GITEA_PROTOCOL. Use this instead of rebuilding
   * `http://<host>:3000` at each call site: an off-cluster Gitea is reached
   * over https on 443, which a hardcoded scheme and port cannot express.
   */
  internalBaseUrl: string;
  externalHttpPort: number;
  /** Port advertised in clone URLs. */
  sshPort: number;
  /** Where Gitea's SSH listens inside the compose network. */
}

interface SshProxyConfig {
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

type PlaidEnvironment = "sandbox" | "development" | "production";

export interface PlaidConfig {
  clientId: string;
  secret: string;
  environment: PlaidEnvironment;
  webhookUrl: string;
}

export type Environment = "production" | "development" | "test";

interface OAuthConfig {
  issuer: string;
  /** Public dashboard/front-door origin that serves OAuth interaction pages. */
  interactionUrl: string;
  /** Undefined means OAuth endpoints are unavailable; it never re-enables Dashboard legacy login. */
  jwks?: { keys: object[] };
  unavailableReason?: string;
  /**
   * Deployment secret for the static Discourse identity client. Its non-secret
   * metadata and every other OAuth client policy live together in
   * features/oauth/data/config.ts. An empty value omits this optional client.
   */
  discourseClientSecret: string;
}

/**
 * The API suite's own settings (ADR 0006). Authorization policy stays
 * hard-coded; development-only test affordances are explicitly inert in every
 * other environment.
 */
interface ApiConfig {
  /**
   * Whether the op-class matrix denies or only records.
   *
   * Kept as reviewed code rather than an environment switch so deployments
   * cannot silently disagree about authorization. Shadow mode was used while
   * the matrix was brought up; the committed product policy is enforcement.
   */
  scopeEnforcement: ScopeEnforcementMode;
  /**
   * Explicit local test users that may exercise paid API-key minting without
   * contacting Stripe. Always empty outside development.
   */
  developmentPremiumUserIds: ReadonlySet<string>;
}

export function getDevelopmentPremiumUserIds(
  value: string | undefined,
  environment: Environment,
): ReadonlySet<string> {
  if (environment !== "development") {
    return new Set();
  }

  return new Set(
    (value ?? "")
      .split(",")
      .map((userId) => userId.trim())
      .filter(Boolean),
  );
}

export interface AppConfig {
  api: ApiConfig;
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

export function getOAuthPublicUrl(
  value: string | undefined,
  fallback: string,
  name: string,
  env: Environment,
): string {
  const configured = value === undefined ? fallback : value.trim();
  if (!configured) throw new Error(`${name} must be a non-empty absolute URL`);

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error(`${name} must be a non-empty absolute URL`);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(`${name} must not contain credentials, query, or fragment`);
  }
  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(env !== "production" && isLoopback)) {
    throw new Error(
      `${name} must use HTTPS except on localhost in development`,
    );
  }
  return url.toString().replace(/\/$/, "");
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

/**
 * Derive the internal Gitea base URL. Scheme comes from GITEA_PROTOCOL when
 * set, otherwise https on 443 and http elsewhere; the port suffix is omitted
 * for the scheme's default port so the URL stays canonical.
 */
function giteaInternalBaseUrl(hostname: string, port: number): string {
  const protocol =
    process.env.GITEA_PROTOCOL || (port === 443 ? "https" : "http");
  const defaultPort = protocol === "https" ? 443 : 80;
  const portSuffix = port === defaultPort ? "" : `:${port}`;
  return `${protocol}://${hostname}${portSuffix}`;
}

const giteaInternalHostname = process.env.GITEA_HOST_NAME || "gitea";
const giteaHttpPort = parseInt(process.env.GITEA_HTTP_PORT || "3000", 10);
const environment = getEnvironment(process.env.NODE_ENV);
const dashboardUrl = getOAuthPublicUrl(
  process.env.DASHBOARD_URL,
  "https://beancount.io",
  "DASHBOARD_URL",
  environment,
);
// One public front door in every environment. The Dashboard proxies provider,
// discovery, and API paths to this process, so its origin can also host the
// static browser callback and the provider's interaction pages.
const oauthIssuer = dashboardUrl;
const oauthInteractionUrl = dashboardUrl;
const oauthSigningKeys = getOptionalJwks(environment);

export const config: AppConfig = {
  api: {
    scopeEnforcement: "enforce",
    developmentPremiumUserIds: getDevelopmentPremiumUserIds(
      process.env.DEV_PREMIUM_USER_IDS,
      environment,
    ),
  },
  env: environment,
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
    url: dashboardUrl,
  },
  gitea: {
    hostname: process.env.EXTERNAL_GITEA_HOST_NAME || "git.beancount.io",
    internalHostname: giteaInternalHostname,
    httpPort: giteaHttpPort,
    internalBaseUrl: giteaInternalBaseUrl(giteaInternalHostname, giteaHttpPort),
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
    issuer: oauthIssuer,
    interactionUrl: oauthInteractionUrl,
    jwks: oauthSigningKeys.jwks,
    unavailableReason: oauthSigningKeys.unavailableReason,
    // The only client-specific deployment input. `||` (not `??`) makes empty
    // equivalent to unset, so the optional client is simply not registered.
    discourseClientSecret: process.env.OAUTH_DISCOURSE_CLIENT_SECRET || "",
  },
};
