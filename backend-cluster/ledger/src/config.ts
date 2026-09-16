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
  managedPrices: ManagedPricesConfig;
}

/**
 * Managed price includes (`include "https://beancount.io/prices/BTC-USD"`),
 * ADR 015. Every value has a default; only `MANAGED_PRICE_ORIGINS` normally
 * needs attention: it allows `https://beancount.io` alone unless set, and an
 * empty string disables the feature.
 */
export interface ManagedPricesConfig {
  /** Allowed feed origins (`scheme://host[:port]`); empty disables managed prices. */
  origins: string[];
  /** How long a validated revision serves before a conditional re-fetch. */
  refreshMs: number;
  /** How long to wait after a failed refresh before trying again. */
  retryMs: number;
  /** Observation age beyond which a source is reported `stale`. */
  staleMs: number;
  /** Whole-exchange timeout for one feed fetch. */
  fetchTimeoutMs: number;
  /** Byte cap on one feed body. */
  maxBodyBytes: number;
  /** Distinct managed URLs one ledger may resolve per load. */
  maxFeedsPerLedger: number;
}

const DEFAULT_MANAGED_PRICE_ORIGINS = "https://beancount.io";

/**
 * Normalize a comma-separated origin list to canonical `URL.origin` strings,
 * dropping blanks and anything that is not an absolute http(s) URL. Order is
 * kept and duplicates removed so the list is stable for logging.
 */
function parseManagedPriceOrigins(raw: string): string[] {
  const origins: string[] = [];
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (trimmed === "") continue;
    let origin: string;
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      origin = url.origin;
    } catch {
      continue;
    }
    if (!origins.includes(origin)) origins.push(origin);
  }
  return origins;
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const parsed = raw === undefined ? NaN : parseInt(raw, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
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
    managedPrices: {
      origins: parseManagedPriceOrigins(
        env.MANAGED_PRICE_ORIGINS ?? DEFAULT_MANAGED_PRICE_ORIGINS,
      ),
      refreshMs: positiveInt(env.MANAGED_PRICE_REFRESH_SECONDS, 300) * 1000,
      retryMs: positiveInt(env.MANAGED_PRICE_RETRY_SECONDS, 60) * 1000,
      staleMs: positiveInt(env.MANAGED_PRICE_STALE_SECONDS, 600) * 1000,
      fetchTimeoutMs: positiveInt(env.MANAGED_PRICE_FETCH_TIMEOUT_MS, 5000),
      maxBodyBytes: positiveInt(env.MANAGED_PRICE_MAX_BODY_BYTES, 1024 * 1024),
      maxFeedsPerLedger: positiveInt(env.MANAGED_PRICE_MAX_FEEDS, 16),
    },
  };
}

export const config = loadConfig();
