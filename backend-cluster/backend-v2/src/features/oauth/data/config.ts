import type { Provider } from "oidc-provider";

const DAY_SECONDS = 24 * 60 * 60;

const OAUTH_RESOURCE_PATHS = {
  // Historical protocol identifier for the application API. This is an OAuth
  // audience, not an HTTP mount; released native clients and their persisted
  // grants are bound to this exact value.
  api: "/v1",
  mcp: "/api-gateway/mcp",
} as const;

export type OAuthResource = keyof typeof OAUTH_RESOURCE_PATHS;

const OAUTH_RESOURCE_BINDINGS = {
  applicationApi: "api",
  mcp: "mcp",
} as const satisfies Record<string, OAuthResource>;

/**
 * OAuth client, audience, and lifetime policy.
 *
 * Deployment-specific inputs (issuer, interaction origin, signing keys, and
 * the Discourse client secret) stay in AppConfig. Client identity, redirect
 * URIs, audience selection, and lifetimes live here so tests and runtime code
 * cannot quietly configure different OAuth clients.
 */
export const OAUTH_CONFIG = {
  // OAuth resource identifiers, not HTTP mount points. The keys are also the
  // closed vocabulary used by clients and resource-server verification.
  resources: OAUTH_RESOURCE_PATHS,
  resourceBindings: OAUTH_RESOURCE_BINDINGS,
  clients: {
    mobile: {
      registration: "static",
      clientId: "beancount-mobile",
      clientName: "Beancount Mobile",
      applicationType: "native",
      redirectUris: [
        "io.beancount.ios:/oauth/callback",
        "io.beancount.android:/oauth/callback",
      ],
      grantTypes: ["authorization_code", "refresh_token"],
      responseTypes: ["code"],
      tokenEndpointAuthMethod: "none",
      scopePrefix: ["openid", "offline_access"],
      resource: OAUTH_RESOURCE_BINDINGS.applicationApi,
      refreshTokenTtlSeconds: 365 * DAY_SECONDS,
      // The grant must outlive the refresh token it backs. A day of slack
      // absorbs clock skew and the ordering of the two persistence writes.
      grantTtlSeconds: 366 * DAY_SECONDS,
    },
    dashboard: {
      registration: "static",
      clientId: "beancount-dashboard",
      clientName: "Beancount Dashboard",
      applicationType: "web",
      redirectPath: "/oauth/dashboard/callback",
      postLogoutRedirectPath: "/auth/login",
      grantTypes: ["authorization_code"],
      responseTypes: ["code"],
      tokenEndpointAuthMethod: "none",
      scopePrefix: ["openid"],
      resource: OAUTH_RESOURCE_BINDINGS.applicationApi,
      accessTokenTtlSeconds: 365 * DAY_SECONDS,
    },
    discourse: {
      registration: "static",
      clientId: "discourse-forum",
      redirectUris: ["https://beancount.io/forum/auth/oidc/callback"],
      grantTypes: ["authorization_code"],
      responseTypes: ["code"],
      tokenEndpointAuthMethod: "client_secret_basic",
      resource: null,
    },
  },
  dynamicRegistration: {
    enabled: true,
    resource: OAUTH_RESOURCE_BINDINGS.mcp,
  },
  ttl: {
    accessTokenSeconds: 60 * 60,
    authorizationCodeSeconds: 10 * 60,
    interactionSeconds: 10 * 60,
    authorizationServerSessionSeconds: 14 * DAY_SECONDS,
    defaultRefreshTokenSeconds: 30 * DAY_SECONDS,
    defaultGrantSeconds: 14 * DAY_SECONDS,
  },
  refreshRotation: {
    // oidc-provider's own non-exported cutoff. The mobile client deliberately
    // overrides it so its year-long idle window can continue sliding.
    defaultLifetimeCutoffSeconds: 365.25 * DAY_SECONDS,
    defaultPercentagePassed: 70,
  },
  interaction: {
    signupScreenHint: "signup",
  },
} as const;

export const MOBILE_CLIENT_ID = OAUTH_CONFIG.clients.mobile.clientId;
export const MOBILE_REDIRECT_URIS = OAUTH_CONFIG.clients.mobile.redirectUris;
export const DASHBOARD_CLIENT_ID = OAUTH_CONFIG.clients.dashboard.clientId;
export const DISCOURSE_CLIENT_ID = OAUTH_CONFIG.clients.discourse.clientId;
export const DISCOURSE_REDIRECT_URI =
  OAUTH_CONFIG.clients.discourse.redirectUris[0];

export type OAuthResources = {
  [Resource in OAuthResource]: string;
};

/** Resolve issuer-relative resource names into the exact token audiences. */
export function oauthResources(issuer: string): OAuthResources {
  return Object.fromEntries(
    Object.entries(OAUTH_CONFIG.resources).map(([resource, path]) => [
      resource,
      `${issuer}${path}`,
    ]),
  ) as OAuthResources;
}

/** Resolve an untrusted catalog key without ever dropping audience checking. */
export function oauthResource(
  issuer: string,
  resource: unknown,
): string | undefined {
  if (
    typeof resource !== "string" ||
    !Object.prototype.hasOwnProperty.call(OAUTH_CONFIG.resources, resource)
  ) {
    return undefined;
  }
  return oauthResources(issuer)[resource as OAuthResource];
}

export const isMobileOAuthClient = (clientId: unknown): boolean =>
  clientId === MOBILE_CLIENT_ID;

export const isDashboardOAuthClient = (clientId: unknown): boolean =>
  clientId === DASHBOARD_CLIENT_ID;

export const isIdentityOAuthClient = (clientId: unknown): boolean =>
  clientId === DISCOURSE_CLIENT_ID;

/** Issuer-relative Dashboard URLs, including an issuer path prefix. */
export function dashboardOAuthUrls(issuer: string): {
  redirectUri: string;
  postLogoutRedirectUri: string;
} {
  const dashboard = OAUTH_CONFIG.clients.dashboard;
  return {
    redirectUri: `${issuer}${dashboard.redirectPath}`,
    postLogoutRedirectUri: `${issuer}${dashboard.postLogoutRedirectPath}`,
  };
}

/** Access-token, refresh-token, and grant lifetimes selected by client. */
export function oauthLifetimes(): {
  accessToken: (clientId: unknown) => number;
  refreshToken: (clientId: unknown) => number;
  grant: (clientId: unknown) => number;
} {
  return {
    accessToken: (clientId) =>
      isDashboardOAuthClient(clientId)
        ? OAUTH_CONFIG.clients.dashboard.accessTokenTtlSeconds
        : OAUTH_CONFIG.ttl.accessTokenSeconds,
    refreshToken: (clientId) =>
      isMobileOAuthClient(clientId)
        ? OAUTH_CONFIG.clients.mobile.refreshTokenTtlSeconds
        : OAUTH_CONFIG.ttl.defaultRefreshTokenSeconds,
    grant: (clientId) =>
      isMobileOAuthClient(clientId)
        ? OAUTH_CONFIG.clients.mobile.grantTtlSeconds
        : OAUTH_CONFIG.ttl.defaultGrantSeconds,
  };
}

/** Whether a refresh exchange should mint a replacement refresh token. */
export function shouldRotateRefreshToken(
  client: { clientId?: string; clientAuthMethod?: string },
  refreshToken: {
    totalLifetime(): number;
    isSenderConstrained(): boolean;
    ttlPercentagePassed(): number;
  },
): boolean {
  if (isMobileOAuthClient(client.clientId)) return true;
  if (
    refreshToken.totalLifetime() >=
    OAUTH_CONFIG.refreshRotation.defaultLifetimeCutoffSeconds
  ) {
    return false;
  }
  if (
    client.clientAuthMethod === "none" &&
    !refreshToken.isSenderConstrained()
  ) {
    return true;
  }
  return (
    refreshToken.ttlPercentagePassed() >=
    OAUTH_CONFIG.refreshRotation.defaultPercentagePassed
  );
}

type StaticClient = NonNullable<
  NonNullable<ConstructorParameters<typeof Provider>[1]>["clients"]
>[number];

/**
 * Materialize the provider's static clients from the catalog.
 *
 * The confidential Discourse client is omitted when its deployment secret is
 * absent. Its plugin always authenticates at the token endpoint, so registering
 * it with an empty secret would be both unusable and rejected by oidc-provider.
 */
export function buildStaticOAuthClients(input: {
  issuer: string;
  apiScopes: readonly string[];
  discourseClientSecret: string;
}): StaticClient[] {
  const mobile = OAUTH_CONFIG.clients.mobile;
  const dashboard = OAUTH_CONFIG.clients.dashboard;
  const discourse = OAUTH_CONFIG.clients.discourse;
  const dashboardUrls = dashboardOAuthUrls(input.issuer);
  const clients: StaticClient[] = [
    {
      client_id: mobile.clientId,
      client_name: mobile.clientName,
      application_type: mobile.applicationType,
      redirect_uris: [...mobile.redirectUris],
      grant_types: [...mobile.grantTypes],
      response_types: [...mobile.responseTypes],
      token_endpoint_auth_method: mobile.tokenEndpointAuthMethod,
      scope: [...mobile.scopePrefix, ...input.apiScopes].join(" "),
    },
    {
      client_id: dashboard.clientId,
      client_name: dashboard.clientName,
      application_type: dashboard.applicationType,
      redirect_uris: [dashboardUrls.redirectUri],
      post_logout_redirect_uris: [dashboardUrls.postLogoutRedirectUri],
      grant_types: [...dashboard.grantTypes],
      response_types: [...dashboard.responseTypes],
      token_endpoint_auth_method: dashboard.tokenEndpointAuthMethod,
      scope: [...dashboard.scopePrefix, ...input.apiScopes].join(" "),
    },
  ];

  if (!input.discourseClientSecret) return clients;
  clients.push({
    client_id: discourse.clientId,
    client_secret: input.discourseClientSecret,
    redirect_uris: [...discourse.redirectUris],
    grant_types: [...discourse.grantTypes],
    response_types: [...discourse.responseTypes],
    token_endpoint_auth_method: discourse.tokenEndpointAuthMethod,
  });
  return clients;
}
