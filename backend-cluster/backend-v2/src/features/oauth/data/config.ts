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
    discourse: {
      registration: "static",
      clientId: "discourse-forum",
      // Stated, not defaulted: dynamic clients default to native (ADR 019 D3).
      applicationType: "web",
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
  // Every client that is not one of the static clients above: DCR and CIMD
  // hosts (Claude, ChatGPT, Cursor, VS Code, …). ADR 019 D5: a connector's
  // rhythm is the monthly close, so a connection lasts while it is used at
  // least every 45 days, and is re-approved a year after authorization —
  // these hosts keep refresh tokens with ledger write authority on their own
  // servers. Reviewed code values, never environment variables.
  thirdParty: {
    refreshTokenTtlSeconds: 45 * DAY_SECONDS,
    // A day of slack over the refresh token, as the mobile client keeps.
    grantTtlSeconds: 46 * DAY_SECONDS,
    grantCeilingSeconds: 365 * DAY_SECONDS,
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

export const isIdentityOAuthClient = (clientId: unknown): boolean =>
  clientId === DISCOURSE_CLIENT_ID;

/** A DCR or CIMD host — any client that is not one of the static clients. */
export const isThirdPartyOAuthClient = (clientId: unknown): boolean =>
  typeof clientId === "string" &&
  clientId !== "" &&
  !isMobileOAuthClient(clientId) &&
  !isIdentityOAuthClient(clientId);

/** The lifetimes one class of client gets, in seconds. */
function lifetimeProfile(clientId: unknown): {
  refreshToken: number;
  grant: number;
  grantCeiling?: number;
} {
  if (isMobileOAuthClient(clientId)) {
    const { refreshTokenTtlSeconds, grantTtlSeconds } =
      OAUTH_CONFIG.clients.mobile;
    return { refreshToken: refreshTokenTtlSeconds, grant: grantTtlSeconds };
  }
  if (isThirdPartyOAuthClient(clientId)) {
    const { refreshTokenTtlSeconds, grantTtlSeconds, grantCeilingSeconds } =
      OAUTH_CONFIG.thirdParty;
    return {
      refreshToken: refreshTokenTtlSeconds,
      grant: grantTtlSeconds,
      grantCeiling: grantCeilingSeconds,
    };
  }
  return {
    refreshToken: OAUTH_CONFIG.ttl.defaultRefreshTokenSeconds,
    grant: OAUTH_CONFIG.ttl.defaultGrantSeconds,
  };
}

/**
 * Refresh-token and grant lifetimes in seconds, selected by client.
 *
 * `grant` takes the grant's original issue time when it has one: a third-party
 * grant re-saved on refresh (ADR 019 D5) never extends past one year after the
 * authorization, so its term shrinks to what is left of that year. A grant
 * being created has no issue time yet and gets the full term.
 */
export function oauthLifetimes(): {
  refreshToken: (clientId: unknown) => number;
  grant: (clientId: unknown, issuedAt?: number, now?: number) => number;
} {
  return {
    refreshToken: (clientId) => lifetimeProfile(clientId).refreshToken,
    grant: (clientId, issuedAt, now = Math.floor(Date.now() / 1000)) => {
      const { grant, grantCeiling } = lifetimeProfile(clientId);
      return grantCeiling === undefined || issuedAt === undefined
        ? grant
        : Math.min(grant, issuedAt + grantCeiling - now);
    },
  };
}

/**
 * Whether a refresh exchange should mint a replacement refresh token.
 *
 * Public clients (no client authentication — the native app, and the DCR and
 * CIMD hosts that register as public) always rotate unless the token is
 * sender-constrained: the MCP spec requires it, and oidc-provider's default
 * stops rotating once a chain is a year old (ADR 019 D5). Only confidential
 * clients fall back to the provider's age and percentage rules.
 */
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
    client.clientAuthMethod === "none" &&
    !refreshToken.isSenderConstrained()
  ) {
    return true;
  }
  if (
    refreshToken.totalLifetime() >=
    OAUTH_CONFIG.refreshRotation.defaultLifetimeCutoffSeconds
  ) {
    return false;
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
  apiScopes: readonly string[];
  discourseClientSecret: string;
}): StaticClient[] {
  const mobile = OAUTH_CONFIG.clients.mobile;
  const discourse = OAUTH_CONFIG.clients.discourse;
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
  ];

  if (!input.discourseClientSecret) return clients;
  clients.push({
    client_id: discourse.clientId,
    client_secret: input.discourseClientSecret,
    application_type: discourse.applicationType,
    redirect_uris: [...discourse.redirectUris],
    grant_types: [...discourse.grantTypes],
    response_types: [...discourse.responseTypes],
    token_endpoint_auth_method: discourse.tokenEndpointAuthMethod,
  });
  return clients;
}
