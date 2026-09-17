import { asyncContext } from "@/shared/async-context";
import {
  FORWARDED_CONTEXT_HEADER,
  forwardedContextHeaders,
} from "../forwarded-context";

const inRequest = <T>(requestId: string, fn: () => T): T =>
  asyncContext.run({ requestId }, fn);

describe("forwardedContextHeaders", () => {
  it("serializes the current request id into the envelope", () => {
    expect(inRequest("abc-123", forwardedContextHeaders)).toEqual({
      [FORWARDED_CONTEXT_HEADER]: "request-id=abc-123",
    });
  });

  it("sends no header outside a request, so the ledger mints its own id", () => {
    expect(forwardedContextHeaders()).toEqual({});
  });

  it.each([
    ["a comma, which is the grammar's separator", "a,b"],
    ["a newline", "a\nb"],
    ["a space", "a b"],
    ["an over-long id", "a".repeat(129)],
    ["an empty id", ""],
  ])(
    "omits a request id containing %s rather than sending it",
    (_label, id) => {
      expect(inRequest(id, forwardedContextHeaders)).toEqual({});
    },
  );

  it("sends a request id exactly at the 128-character bound", () => {
    // The bound is the ledger parser's; one character under it must still
    // travel, or a legitimate trace id would be silently dropped.
    const id = "a".repeat(128);
    expect(inRequest(id, forwardedContextHeaders)).toEqual({
      [FORWARDED_CONTEXT_HEADER]: `request-id=${id}`,
    });
  });

  it("sends an id drawn from the whole accepted charset", () => {
    expect(inRequest("Abc.09:x-y", forwardedContextHeaders)).toEqual({
      [FORWARDED_CONTEXT_HEADER]: "request-id=Abc.09:x-y",
    });
  });

  it("uses the header name the ledger service parses", () => {
    expect(FORWARDED_CONTEXT_HEADER).toBe("x-bcio-context");
  });
});

describe("forwardedContextHeaders — session token", () => {
  const withContext = (sessionToken?: string) =>
    asyncContext.run({ requestId: "req-1", sessionToken }, () =>
      forwardedContextHeaders(),
    )[FORWARDED_CONTEXT_HEADER];

  it("relays the caller's credential alongside the request id", () => {
    expect(withContext("header.payload.signature")).toBe(
      "request-id=req-1,session-token=header.payload.signature",
    );
  });

  it("relays any credential kind, because the far end resolves them all", () => {
    for (const token of ["bcio_AAAABBBBCCCC", "oauth-token", "a.b.c"]) {
      expect(withContext(token)).toBe(
        `request-id=req-1,session-token=${token}`,
      );
    }
  });

  it("omits the field when the request carried no credential", () => {
    expect(withContext(undefined)).toBe("request-id=req-1");
  });

  it("carries a credential-sized value, which is what session-token needs", () => {
    const token = `${"h".repeat(36)}.${"p".repeat(200)}.${"s".repeat(43)}`;
    expect(token.length).toBeGreaterThan(256);
    expect(withContext(token)).toContain(`session-token=${token}`);
  });

  it("carries a token exactly at the 2048 bound, which is still in range", () => {
    const token = "t".repeat(2048);
    expect(withContext(token)).toBe(`request-id=req-1,session-token=${token}`);
  });

  it.each([
    ["a comma, the entry separator", "a,b"],
    ["a space", "a b"],
    ["a newline", "a\nb"],
    ["one over the 2048 bound", "t".repeat(2049)],
  ])(
    "omits a token containing %s rather than corrupting the envelope",
    (_l, token) => {
      expect(withContext(token)).toBe("request-id=req-1");
    },
  );
});
