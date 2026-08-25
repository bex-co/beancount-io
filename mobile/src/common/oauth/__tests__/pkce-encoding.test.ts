import {
  base64UrlFromBase64,
  CODE_VERIFIER_LENGTH,
  highEntropyStringFromBytes,
} from "../pkce-encoding";

describe("PKCE encoding", () => {
  it("converts standard base64 to unpadded base64url", () => {
    expect(base64UrlFromBase64("ab+/cd==")).toBe("ab-_cd");
  });

  it("produces a verifier of the RFC 7636 minimum length", () => {
    const bytes = new Uint8Array(CODE_VERIFIER_LENGTH).fill(0);
    const verifier = highEntropyStringFromBytes(bytes);
    expect(verifier.length).toBe(43);
    expect(/^[A-Za-z0-9\-._~]+$/.test(verifier)).toBeTruthy();
  });

  it("uses only the low six bits, so every byte maps uniformly", () => {
    const bytes = new Uint8Array(64);
    for (let index = 0; index < 64; index += 1) bytes[index] = index;
    const low = highEntropyStringFromBytes(bytes, 64);
    for (let index = 0; index < 64; index += 1) bytes[index] = index + 64;
    expect(highEntropyStringFromBytes(bytes, 64)).toBe(low);
  });

  it("never silently shortens a verifier when entropy is missing", () => {
    expect(() => highEntropyStringFromBytes(new Uint8Array(8))).toThrow();
  });
});
