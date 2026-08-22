import jwt from "jsonwebtoken";
import type { AuthJwt } from "../data/jwt-model/types";

/**
 * JWT payload for signing
 */
export interface JwtPayload {
  jti: string;
  sub: string;
  exp: number;
  iat: number;
}

/**
 * Type definition for JWT sign function
 * Signs a JWT token with the given payload and secret
 */
export type SignJwt = (payload: JwtPayload, secret: string) => Promise<string>;

/**
 * Type definition for JWT verify function
 * Verifies and decodes a JWT token, returns null if invalid
 */
export type VerifyJwt = (
  token: string,
  secret: string,
) => Promise<AuthJwt | null>;

/**
 * Sign a JWT token with the given payload and secret
 *
 * @param payload - JWT claims (jti, sub, exp, iat)
 * @param secret - Secret key for signing
 * @returns Signed JWT token string
 *
 * @example
 * const token = await signJwt({
 *   jti: '123',
 *   sub: 'user-id',
 *   exp: Math.floor(Date.now() / 1000) + 3600,
 *   iat: Math.floor(Date.now() / 1000)
 * }, 'my-secret');
 */
export const signJwt: SignJwt = async (payload, secret) => {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, secret, (err, token) => {
      if (err || !token) {
        reject(err || new Error("Failed to sign JWT"));
      } else {
        resolve(token);
      }
    });
  });
};

/**
 * Verify and decode a JWT token
 *
 * @param token - JWT token string to verify
 * @param secret - Secret key for verification
 * @returns Decoded JWT payload or null if verification fails
 *
 * @example
 * const decoded = await verifyJwt(token, 'my-secret');
 * if (decoded) {
 *   console.log('User ID:', decoded.sub);
 * }
 */
export const verifyJwt: VerifyJwt = async (token, secret) => {
  return new Promise((resolve) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err || !decoded || typeof decoded === "string") {
        resolve(null);
      } else {
        resolve(decoded as AuthJwt);
      }
    });
  });
};
