import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { OidcLoginService } from "../oidc-login-service";
import type { OidcLoginState } from "@/features/auth/data/oidc-login-state-model";

const ISSUER = "https://id.example.com/realms/home";
const CLIENT_ID = "beancount";
const DASHBOARD = "https://money.example.com";

let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let jwks: { keys: object[] };

beforeAll(async () => {
  keys = await generateKeyPair("RS256");
  jwks = { keys: [{ ...(await exportJWK(keys.publicKey)), alg: "RS256" }] };
});

const idToken = (
  claims: Record<string, unknown>,
  nonce: string,
  issuer: string,
) =>
  new SignJWT({ nonce, ...claims })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(issuer)
    .setAudience(CLIENT_ID)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(keys.privateKey);

function setup(options: {
  claims?: Record<string, unknown>;
  linkedUserId?: string;
  existingEmail?: boolean;
  blocked?: boolean;
  configured?: boolean;
  linkByEmail?: boolean;
  issuer?: string;
  passwordless?: boolean;
  providerDown?: boolean;
}) {
  const issuer = options.issuer ?? ISSUER;
  const states = new Map<string, OidcLoginState>();
  const tickets = new Map<string, string>();
  const identities = new Map<string, string>();
  if (options.linkedUserId) identities.set("user-sub", options.linkedUserId);

  const models = {
    user: {
      getById: jest.fn(async (_db: unknown, id: string) => ({
        id,
        isBlocked: options.blocked ?? false,
        password: options.passwordless ? null : "hashed",
      })),
      getByMail: jest.fn(async () =>
        options.existingEmail ? { id: "other" } : null,
      ),
    },
    oidcIdentity: {
      findUserId: jest.fn(
        async (_db: unknown, _issuer: string, sub: string) =>
          identities.get(sub) ?? null,
      ),
      link: jest.fn(
        async (_db: unknown, input: { sub: string; userId: string }) => {
          if (identities.has(input.sub)) return false;
          identities.set(input.sub, input.userId);
          return true;
        },
      ),
      isLinked: jest.fn(async (_db: unknown, userId: string) =>
        [...identities.values()].includes(userId),
      ),
      unlink: jest.fn(async () => undefined),
    },
    oidcLoginState: {
      saveState: jest.fn(async (state: string, record: OidcLoginState) => {
        states.set(state, record);
      }),
      takeState: jest.fn(async (state: string) => {
        const record = states.get(state) ?? null;
        states.delete(state);
        return record;
      }),
      createLinkTicket: jest.fn(async (userId: string) => {
        tickets.set("ticket", userId);
        return "ticket";
      }),
      takeLinkTicket: jest.fn(
        async (ticket: string) => tickets.get(ticket) ?? null,
      ),
    },
    magicLinkToken: {
      regenerateToken: jest.fn(async (userId: string) => ({
        id: `once-${userId}`,
        userId,
        expireAt: "",
      })),
    },
  };
  const auth = {
    registerOidcUser: jest.fn(
      async (params: { oidcIdentity: { sub: string } }) => {
        identities.set(params.oidcIdentity.sub, "new-user");
        return "new-user";
      },
    ),
  };

  let nonce = "";
  const fetchImpl = jest.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (options.providerDown) throw new TypeError("fetch failed");
    if (url.endsWith("/.well-known/openid-configuration")) {
      return Response.json({
        issuer,
        authorization_endpoint: `${ISSUER}/auth`,
        token_endpoint: `${ISSUER}/token`,
        jwks_uri: `${ISSUER}/certs`,
      });
    }
    if (url.endsWith("/token")) {
      return Response.json({
        id_token: await idToken(
          {
            sub: "user-sub",
            email: "person@example.com",
            email_verified: true,
            ...options.claims,
          },
          nonce,
          issuer,
        ),
      });
    }
    if (url.endsWith("/certs")) return Response.json(jwks);
    return new Response(null, { status: 404 });
  });

  const service = new OidcLoginService(
    models as any,
    {} as any,
    auth,
    {
      oidcLogin:
        options.configured === false
          ? undefined
          : {
              issuer,
              clientId: CLIENT_ID,
              clientSecret: "s",
              name: "Home",
              linkByEmail: options.linkByEmail ?? false,
            },
      dashboard: { url: DASHBOARD },
      oauth: { issuer: DASHBOARD },
    } as any,
    fetchImpl as unknown as typeof fetch,
  );

  const signIn = async (
    params: { next?: string; linkTicket?: string; sessionUserId?: string } = {},
  ) => {
    const { redirectUrl, state } = await service.start(params);
    if (!state) return new URL(redirectUrl);
    nonce = new URL(redirectUrl).searchParams.get("nonce")!;
    return new URL(
      await service.finish({
        code: "c",
        state,
        cookieState: state,
        ip: "1.2.3.4",
      }),
    );
  };
  return { service, models, auth, signIn };
}

describe("OidcLoginService", () => {
  it("offers no sign-in when not configured", () => {
    expect(setup({ configured: false }).service.providerName()).toBeNull();
  });

  it("signs in to the linked account and returns to next", async () => {
    const { signIn, auth } = setup({ linkedUserId: "user-1" });
    const url = await signIn({ next: "/oauth/mobile-consent?uid=x" });
    expect(url.pathname).toBe("/auth/callback");
    expect(url.searchParams.get("oneTimeToken")).toBe("once-user-1");
    expect(url.searchParams.get("next")).toBe("/oauth/mobile-consent?uid=x");
    expect(auth.registerOidcUser).not.toHaveBeenCalled();
  });

  it("creates an account for a new ID with a verified email", async () => {
    const { signIn, auth } = setup({ claims: { given_name: "Ann" } });
    const url = await signIn();
    expect(auth.registerOidcUser).toHaveBeenCalledWith({
      email: "person@example.com",
      firstName: "Ann",
      lastName: "",
      ip: "1.2.3.4",
      oidcIdentity: { issuer: ISSUER, sub: "user-sub" },
    });
    expect(url.searchParams.get("oneTimeToken")).toBe("once-new-user");
    expect(url.searchParams.has("next")).toBe(false);
  });

  it.each([
    ["email_in_use", { existingEmail: true }],
    ["email_unverified", { claims: { email_verified: false } }],
    ["blocked", { linkedUserId: "user-1", blocked: true }],
  ])("refuses with %s", async (reason, options) => {
    const { signIn, auth, models } = setup(options);
    const url = await signIn();
    expect(url.pathname).toBe("/auth/login");
    expect(url.searchParams.get("oidcError")).toBe(reason);
    expect(auth.registerOidcUser).not.toHaveBeenCalled();
    expect(models.magicLinkToken.regenerateToken).not.toHaveBeenCalled();
  });

  it("signs in to the account with the same email when set to link by email", async () => {
    const { signIn, auth, models } = setup({
      existingEmail: true,
      linkByEmail: true,
    });
    const url = await signIn();
    expect(url.searchParams.get("oneTimeToken")).toBe("once-other");
    expect(models.oidcIdentity.link).toHaveBeenCalledWith(expect.anything(), {
      issuer: ISSUER,
      sub: "user-sub",
      userId: "other",
    });
    expect(auth.registerOidcUser).not.toHaveBeenCalled();
  });

  it("still refuses an unverified email when set to link by email", async () => {
    const { signIn, models } = setup({
      existingEmail: true,
      linkByEmail: true,
      claims: { email_verified: false },
    });
    const url = await signIn();
    expect(url.searchParams.get("oidcError")).toBe("email_unverified");
    expect(models.oidcIdentity.link).not.toHaveBeenCalled();
  });

  it("refuses a callback from another browser", async () => {
    const { service, models } = setup({ linkedUserId: "user-1" });
    const { state } = await service.start({});
    const url = new URL(
      await service.finish({ code: "c", state, cookieState: "other", ip: "" }),
    );
    expect(url.searchParams.get("oidcError")).toBe("failed");
    expect(models.magicLinkToken.regenerateToken).not.toHaveBeenCalled();
  });

  it("links the provider to the signed-in account", async () => {
    const { service, signIn, models } = setup({});
    const linkUrl = new URL(
      await service.createLinkUrl("user-1", "/settings/general"),
    );
    const url = await signIn({
      linkTicket: linkUrl.searchParams.get("link")!,
      next: linkUrl.searchParams.get("next")!,
      sessionUserId: "user-1",
    });
    expect(url.toString()).toBe(`${DASHBOARD}/settings/general`);
    expect(models.oidcIdentity.link).toHaveBeenCalledWith(expect.anything(), {
      issuer: ISSUER,
      sub: "user-sub",
      userId: "user-1",
    });
  });

  it("refuses to link an ID that another account uses", async () => {
    const { service, signIn } = setup({ linkedUserId: "user-2" });
    const linkUrl = new URL(
      await service.createLinkUrl("user-1", "/settings/general"),
    );
    const url = await signIn({
      linkTicket: linkUrl.searchParams.get("link")!,
      next: "/settings/general",
      sessionUserId: "user-1",
    });
    expect(url.pathname).toBe("/settings/general");
    expect(url.searchParams.get("oidcError")).toBe("already_linked");
  });

  it("refuses to link a second ID to an account", async () => {
    const { service, signIn } = setup({
      linkedUserId: "user-1",
      claims: { sub: "new-sub" },
    });
    const linkUrl = new URL(await service.createLinkUrl("user-1"));
    const url = await signIn({
      linkTicket: linkUrl.searchParams.get("link")!,
      next: "/settings/general",
      sessionUserId: "user-1",
    });
    expect(url.searchParams.get("oidcError")).toBe("account_linked");
  });

  it("refuses a link from a browser signed in to another account", async () => {
    const { service, signIn, models } = setup({});
    const linkUrl = new URL(await service.createLinkUrl("user-1"));
    const url = await signIn({
      linkTicket: linkUrl.searchParams.get("link")!,
      next: "/settings/general",
      sessionUserId: "user-2",
    });
    expect(url.pathname).toBe("/settings/general");
    expect(url.searchParams.get("oidcError")).toBe("failed");
    expect(models.oidcIdentity.link).not.toHaveBeenCalled();
  });

  it("returns an expired link to Settings", async () => {
    const { signIn } = setup({});
    const url = await signIn({
      linkTicket: "expired",
      next: "/settings/general",
      sessionUserId: "user-1",
    });
    expect(url.pathname).toBe("/settings/general");
    expect(url.searchParams.get("oidcError")).toBe("failed");
  });

  it("returns to the login page when the provider is down", async () => {
    const { signIn } = setup({ providerDown: true });
    const url = await signIn({ next: "/oauth/consent?interaction=x" });
    expect(url.pathname).toBe("/auth/login");
    expect(url.searchParams.get("oidcError")).toBe("failed");
    expect(url.searchParams.get("next")).toBe("/oauth/consent?interaction=x");
  });

  it("keeps next when a sign-in is refused", async () => {
    const { signIn } = setup({ existingEmail: true });
    const url = await signIn({ next: "/oauth/consent?interaction=x" });
    expect(url.searchParams.get("oidcError")).toBe("email_in_use");
    expect(url.searchParams.get("next")).toBe("/oauth/consent?interaction=x");
  });

  it("signs in with an issuer that ends in a slash", async () => {
    const { signIn } = setup({
      linkedUserId: "user-1",
      issuer: "https://tenant.example.com/",
    });
    const url = await signIn();
    expect(url.searchParams.get("oneTimeToken")).toBe("once-user-1");
  });

  it("accepts email_verified sent as a string", async () => {
    const { signIn, auth } = setup({ claims: { email_verified: "true" } });
    await signIn();
    expect(auth.registerOidcUser).toHaveBeenCalled();
  });

  it("unlinks an account that has a password", async () => {
    const { service, models } = setup({ linkedUserId: "user-1" });
    await service.unlink("user-1");
    expect(models.oidcIdentity.unlink).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      ISSUER,
    );
  });

  it("refuses to unlink an account without a password", async () => {
    const { service, models } = setup({
      linkedUserId: "user-1",
      passwordless: true,
    });
    await expect(service.unlink("user-1")).rejects.toThrow();
    expect(models.oidcIdentity.unlink).not.toHaveBeenCalled();
  });

  it("reports no link when not configured", async () => {
    const { service } = setup({ configured: false, linkedUserId: "user-1" });
    expect(await service.isLinked("user-1")).toBe(false);
  });
});
