import type { GiteaConfig } from "@/config/config";

export const generateGiteaUrl = (config: GiteaConfig, fullName: string) => {
  // Auto-detect HTTPS: use HTTPS for production domains, HTTP for localhost/IPs
  const isLocalhost =
    config.hostname === "localhost" || config.hostname === "gitea";
  const isIpAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(
    config.hostname,
  );
  const isHttps = !isLocalhost && !isIpAddress;

  const protocol = isHttps ? "https" : "http";
  const standardPort = isHttps ? 443 : 80;
  const includePort = config.externalHttpPort !== standardPort;
  const portSuffix = includePort ? `:${config.externalHttpPort}` : "";

  return {
    sshUrl: `ssh://git@${config.hostname}:${config.sshPort}/${fullName}.git`,
    httpUrl: `${protocol}://${config.hostname}${portSuffix}/${fullName}.git`,
  };
};

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
