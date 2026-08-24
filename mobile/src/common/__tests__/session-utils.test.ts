import { createSession, sessionTokenForServer } from "../session-utils";

const serverUrl = "https://ledger.example.com/";

const createTokenWithPayload = (payload: Record<string, unknown>) => {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
};

describe("createSession", () => {
  it("extracts the user id from the JWT subject", () => {
    const token = createTokenWithPayload({ sub: "user-123" });
    expect(createSession(token, serverUrl)).toEqual({
      kind: "legacy",
      userId: "user-123",
      authToken: token,
      serverUrl,
    });
  });

  it("works with tokens that include additional claims", () => {
    const token = createTokenWithPayload({ sub: "user-456", role: "admin" });
    expect(createSession(token, serverUrl)).toEqual({
      kind: "legacy",
      userId: "user-456",
      authToken: token,
      serverUrl,
    });
  });

  it("throws error for invalid token format", () => {
    expect(() => createSession("invalid-token", serverUrl)).toThrow();
  });

  it("throws error for token without sub claim", () => {
    const token = createTokenWithPayload({ role: "admin" });
    expect(() => createSession(token, serverUrl)).toThrow();
  });

  it("handles numeric sub claim", () => {
    const token = createTokenWithPayload({ sub: 12345 });
    const session = createSession(token, serverUrl);
    expect(session.userId).toBe("12345");
    expect(session.authToken).toBe(token);
    expect(session.serverUrl).toBe(serverUrl);
  });

  it("returns a token only for the server that issued it", () => {
    const token = createTokenWithPayload({ sub: "user-123" });
    const session = createSession(token, serverUrl);
    expect(sessionTokenForServer(session, serverUrl)).toBe(token);
    expect(
      sessionTokenForServer(session, "https://other-ledger.example.com/"),
    ).toBe(undefined);
  });

  it("does not send legacy unscoped sessions to any server", () => {
    expect(
      sessionTokenForServer(
        { kind: "legacy", userId: "user-123", authToken: "legacy-token" },
        serverUrl,
      ),
    ).toBe(undefined);
  });
});
