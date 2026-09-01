import { getSafeRedirectPath } from "@/common/lib/auth/auth";

export const DASHBOARD_OAUTH_CLIENT_ID = "beancount-dashboard";
export const DASHBOARD_OAUTH_ACCESS_TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60;
export const DASHBOARD_OAUTH_TRANSACTION_TTL_SECONDS = 10 * 60;
export const DASHBOARD_AUTH_COOKIE = "authSess:beancount.io";
export const DASHBOARD_OAUTH_TRANSACTION_COOKIE =
  "__Host-bcio-dashboard-oauth-transaction";
export const DASHBOARD_OAUTH_INTERACTION_EXPIRED_REASON = "interaction_expired";

export const DASHBOARD_OAUTH_PATHS = {
  start: "/oauth/dashboard/start",
  callback: "/oauth/dashboard/callback",
  consent: "/oauth/dashboard-consent",
  logout: "/oauth/dashboard/logout",
} as const;

export const DASHBOARD_OAUTH_SCOPES = [
  "openid",
  "ledger.read",
  "ledger.write",
  "ledger.admin",
] as const;

export function issuerFromRouteUrl(value: string, routePath: string): string {
  const url = new URL(value);
  if (!url.pathname.endsWith(routePath)) {
    throw new Error("OAuth route is not mounted below the configured issuer");
  }
  const issuerPath = url.pathname
    .slice(0, -routePath.length)
    .replace(/\/$/, "");
  return `${url.origin}${issuerPath}`;
}

export function oauthAuthorizationServerMetadataPath(issuer: string): string {
  const path = new URL(issuer).pathname.replace(/^\/|\/$/g, "");
  return `/.well-known/oauth-authorization-server${path ? `/${path}` : ""}`;
}

export function dashboardOAuthUrls(issuer: string): {
  redirectUri: string;
  resource: string;
  postLogoutRedirectUri: string;
} {
  return {
    redirectUri: `${issuer}${DASHBOARD_OAUTH_PATHS.callback}`,
    resource: `${issuer}/v1`,
    postLogoutRedirectUri: `${issuer}/auth/login`,
  };
}

/**
 * Convert a validated issuer endpoint to the path the in-cluster backend sees.
 * The reverse proxy removes the public issuer prefix; backend-v2 restores it
 * when constructing protocol URLs.
 */
export function issuerEndpointBackendPath(
  endpoint: string,
  issuer: string,
): string {
  const endpointUrl = new URL(endpoint);
  const issuerUrl = new URL(issuer);
  if (
    endpointUrl.origin !== issuerUrl.origin ||
    endpointUrl.username ||
    endpointUrl.password ||
    endpointUrl.search ||
    endpointUrl.hash
  ) {
    throw new Error("OAuth endpoint is outside the selected issuer");
  }

  const prefix = issuerUrl.pathname.replace(/\/$/, "");
  if (
    !endpointUrl.pathname.startsWith(`${prefix}/`) ||
    endpointUrl.pathname === prefix
  ) {
    throw new Error("OAuth endpoint is outside the selected issuer path");
  }
  return endpointUrl.pathname.slice(prefix.length);
}

function dashboardDeploymentPrefix(currentPath: string): string {
  const routeRoots = [
    "/auth",
    "/oauth",
    "/ledger-gallery",
    "/ledger",
    "/settings",
    "/dashboard",
  ];
  const matches = routeRoots
    .map((root) => ({ root, index: currentPath.indexOf(root) }))
    .filter(({ root, index }) => {
      if (index < 0) return false;
      const boundary = currentPath[index + root.length];
      return boundary === undefined || boundary === "/";
    })
    .sort((left, right) => left.index - right.index);
  return matches[0] ? currentPath.slice(0, matches[0].index) : "";
}

function appRelativePath(
  path: string | undefined,
  prefix: string,
): string | undefined {
  const safe = getSafeRedirectPath(path);
  if (!safe || !prefix) return safe;
  if (safe === prefix) return "/";
  return safe.startsWith(`${prefix}/`) ? safe.slice(prefix.length) : safe;
}

/** Browser navigation helper that preserves a path-prefixed deployment. */
export function dashboardOAuthStartHref(
  next: string | undefined,
  currentPath = typeof window === "undefined"
    ? "/auth/login"
    : window.location.pathname,
  screenHint?: "signup",
  reason?: typeof DASHBOARD_OAUTH_INTERACTION_EXPIRED_REASON,
): string {
  const prefix = dashboardDeploymentPrefix(currentPath);
  const url = new URL(
    `${prefix}${DASHBOARD_OAUTH_PATHS.start}`,
    "https://dashboard.invalid",
  );
  url.searchParams.set(
    "next",
    appRelativePath(next, prefix) ?? "/auth/welcome",
  );
  if (screenHint) url.searchParams.set("screen_hint", screenHint);
  if (reason) url.searchParams.set("reason", reason);
  return `${url.pathname}${url.search}`;
}

export function dashboardOAuthLogoutHref(
  currentPath = typeof window === "undefined"
    ? "/auth/logout"
    : window.location.pathname,
): string {
  const prefix = dashboardDeploymentPrefix(currentPath);
  return `${prefix}${DASHBOARD_OAUTH_PATHS.logout}`;
}

export function dashboardAuthLoginHref(
  next: string | undefined,
  currentPath = typeof window === "undefined"
    ? "/auth/login"
    : window.location.pathname,
): string {
  const prefix = dashboardDeploymentPrefix(currentPath);
  const url = new URL(`${prefix}/auth/login`, "https://dashboard.invalid");
  const continuation = appRelativePath(next, prefix);
  if (continuation) url.searchParams.set("next", continuation);
  url.searchParams.set("reason", "expired");
  return `${url.pathname}${url.search}`;
}
