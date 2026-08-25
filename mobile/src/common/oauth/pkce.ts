import * as Crypto from "expo-crypto";
import {
  base64UrlFromBase64,
  CODE_VERIFIER_LENGTH,
  highEntropyStringFromBytes,
} from "./pkce-encoding";

export type PkceChallenge = {
  codeVerifier: string;
  codeChallenge: string;
};

/**
 * One S256 PKCE pair per authorization request (RFC 7636). The verifier is the
 * only thing that proves this app started the flow, so it comes from the OS
 * CSPRNG and never from a time- or counter-derived value.
 */
export async function createPkceChallenge(): Promise<PkceChallenge> {
  const codeVerifier = highEntropyStringFromBytes(
    Crypto.getRandomBytes(CODE_VERIFIER_LENGTH),
  );
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  return { codeVerifier, codeChallenge: base64UrlFromBase64(digest) };
}

/** The `state` value, drawn the same way and compared on the way back. */
export function createAuthorizationState(): string {
  return highEntropyStringFromBytes(
    Crypto.getRandomBytes(CODE_VERIFIER_LENGTH),
  );
}
