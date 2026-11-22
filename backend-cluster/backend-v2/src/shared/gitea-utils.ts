import { DEFAULT_EXTERNAL_GITEA_HOST, type GiteaConfig } from "@/config/config";

interface GiteaCloneUrls {
  /** Null when this deployment serves no Git over SSH. */
  sshUrl: string | null;
  httpUrl: string;
}

/**
 * The address clone URLs are built on, without a trailing slash: the one the
 * operator gave (`GIT_PUBLIC_URL`, the Git proxy's own `/git`) or Gitea
 * reported when it was learned, otherwise the configured host and port (https
 * for a domain, http for localhost or an IP address).
 */
function externalGiteaBase(config: GiteaConfig): string {
  if (config.externalBaseUrl) {
    return config.externalBaseUrl;
  }
  const hostname = config.hostname;
  const isLocal =
    hostname === "localhost" ||
    hostname === "gitea" ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  const protocol = isLocal ? "http" : "https";
  const standardPort = isLocal ? 80 : 443;
  const portSuffix =
    config.externalHttpPort === standardPort
      ? ""
      : `:${config.externalHttpPort}`;
  return `${protocol}://${hostname}${portSuffix}`;
}

export const generateGiteaUrl = (
  config: GiteaConfig,
  fullName: string,
): GiteaCloneUrls => {
  return {
    sshUrl: config.sshUnavailable
      ? null
      : `ssh://git@${config.hostname}:${config.sshPort}/${fullName}.git`,
    httpUrl: `${externalGiteaBase(config)}/${fullName}.git`,
  };
};

/**
 * Gitea's public origin (plus any sub-path), from the profile link it builds
 * for a user: `html_url` is ROOT_URL followed by the login. Undefined when the
 * answer does not have that shape.
 */
export function giteaRootFromUser(user: {
  login?: unknown;
  html_url?: unknown;
}): string | undefined {
  if (typeof user.login !== "string" || typeof user.html_url !== "string") {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(user.html_url);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return undefined;
  }
  const suffix = `/${encodeURIComponent(user.login)}`;
  if (!url.pathname.endsWith(suffix)) {
    return undefined;
  }
  return `${url.origin}${url.pathname.slice(0, -suffix.length)}`;
}

interface LearnExternalGitHostOptions {
  selfHost: boolean;
  adminUser: string;
  adminPassword: string;
  fetchFn?: typeof fetch;
  attempts?: number;
  retryDelayMs?: number;
}

/**
 * Give a self-hosted stack its own Git address.
 *
 * The built-in external host is the managed service's (`git.beancount.io`).
 * A self-hosted stack that configured none (bex sets no hostname on purpose)
 * would hand every user a clone address on someone else's host, so ask Gitea
 * for the origin it serves on (its ROOT_URL, which the bex wrapper derives
 * from the platform's address) and build clone URLs from that. An operator's
 * explicit EXTERNAL_GITEA_HOST_NAME or GIT_PUBLIC_URL (the stack already says
 * where users clone from), and the managed service, are left alone.
 *
 * Gitea may still be starting, so this retries; if it never answers, it throws
 * rather than let the server start advertising the wrong host.
 */
export async function learnExternalGitHost(
  gitea: GiteaConfig,
  options: LearnExternalGitHostOptions,
): Promise<void> {
  if (
    !options.selfHost ||
    gitea.externalBaseUrl ||
    gitea.hostname !== DEFAULT_EXTERNAL_GITEA_HOST
  ) {
    return;
  }
  const fetchFn = options.fetchFn ?? fetch;
  const attempts = options.attempts ?? 30;
  const retryDelayMs = options.retryDelayMs ?? 5000;
  const auth = Buffer.from(
    `${options.adminUser}:${options.adminPassword}`,
  ).toString("base64");
  let lastProblem = "no attempt made";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetchFn(`${gitea.internalBaseUrl}/api/v1/user`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (res.ok) {
        const root = giteaRootFromUser(
          (await res.json()) as { login?: unknown; html_url?: unknown },
        );
        if (root) {
          gitea.externalBaseUrl = root;
          gitea.hostname = new URL(root).hostname;
          return;
        }
        lastProblem = "Gitea's answer carried no usable html_url";
      } else {
        lastProblem = `Gitea answered ${res.status}`;
      }
    } catch (err) {
      lastProblem = err instanceof Error ? err.message : String(err);
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
  throw new Error(
    `SELF_HOST is on and EXTERNAL_GITEA_HOST_NAME is unset, but Gitea at ${gitea.internalBaseUrl} did not report its public address (${lastProblem}). ` +
      "Set EXTERNAL_GITEA_HOST_NAME to this stack's Git host, or check that Gitea is reachable with FAVA_API_ADMIN_USER/FAVA_API_ADMIN_PASSWORD.",
  );
}

/**
 * Keep an avatar URL only when a client outside the server can load it.
 * Gitea builds `avatar_url` from its own ROOT_URL, which a deployment may set
 * to a loopback or compose-internal origin (`http://localhost:3000/avatars/…`);
 * passing that through hands every API consumer a broken, internal link.
 */
export function publicAvatarUrl(
  avatarUrl: string | undefined,
): string | undefined {
  if (!avatarUrl) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(avatarUrl);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return undefined;
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const isNonPublic =
    !host.includes(".") || // localhost, compose service names like `gitea`, IPv6
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^(127|10|0)\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  return isNonPublic ? undefined : avatarUrl;
}
