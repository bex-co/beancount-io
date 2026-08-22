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
