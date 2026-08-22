import {
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  randomBytes,
} from "crypto";
import { config } from "@/config/config";

const ALGORITHM = "aes-256-gcm";
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

/**
 * Derives a 256-bit encryption key from AUTH_SECRET using PBKDF2
 */
function deriveKey(salt: Buffer): Buffer {
  return pbkdf2Sync(
    config.jwt.secret,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    "sha256",
  );
}

/**
 * Encrypts a Plaid access token using AES-256-GCM
 * @param plaintext - The Plaid access token to encrypt
 * @returns Encrypted string in format: salt:iv:tag:ciphertext (all base64-encoded)
 */
export function encryptToken(plaintext: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(salt);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    salt.toString("base64"),
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypts a Plaid access token encrypted with encryptToken
 * @param encryptedToken - Encrypted token in format: salt:iv:tag:ciphertext
 * @returns Decrypted plaintext token
 * @throws Error if decryption fails (tampered data or wrong key)
 */
export function decryptToken(encryptedToken: string): string {
  const parts = encryptedToken.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted token format");
  }

  const [saltB64, ivB64, tagB64, ciphertextB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const key = deriveKey(salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
