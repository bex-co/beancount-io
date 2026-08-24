import { generateOAuthToken } from "../oauth-token-gen";
import type { AppConfig } from "@/config/config";
import { getJwks } from "@/config/jwks";

// Partial config with only the fields used by the functions under test
const mockConfig = {
  oauth: {
    issuer: "https://beancount.io",
    jwks: getJwks("test"),
  },
} as unknown as AppConfig;

describe("generateOAuthToken", () => {
  it("generates a well-formed signed JWT", async () => {
    const token = await generateOAuthToken("user-1", "ledger-1", mockConfig);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("embeds correct claims", async () => {
    const { decodeJwt } = await import("jose");
    const token = await generateOAuthToken("user-42", "ldgr-99", mockConfig);
    const claims = decodeJwt(token);

    expect(claims.sub).toBe("user-42");
    expect(claims.ledger_id).toBe("ldgr-99");
    expect(claims.iss).toBe("https://beancount.io");
    // Unchanged by w1/m18: the provider and this helper mint the same audience,
    // so the resource rename is a single coordinated flip (see legacyMcpResource).
    // This helper is used only for the internal MCP hop during the documented
    // legacy-resource window; GraphQL and REST reject this audience.
    expect(claims.aud).toBe("https://beancount.io/api-gateway/mcp");
    expect(claims.scope).toBe("ledger.read ledger.write ledger.admin");
    expect(typeof claims.exp).toBe("number");
    expect(typeof claims.iat).toBe("number");
    expect((claims.exp as number) - (claims.iat as number)).toBe(3600);
  });

  it("omits ledger_id entirely for an unpinned grant", async () => {
    const { decodeJwt } = await import("jose");
    const token = await generateOAuthToken("user-42", undefined, mockConfig);
    const claims = decodeJwt(token);

    expect(claims.sub).toBe("user-42");
    // Absent, not empty-string: an empty claim would read as a ledger named ""
    // downstream rather than as "not pinned to a ledger".
    expect("ledger_id" in claims).toBe(false);
  });
});
