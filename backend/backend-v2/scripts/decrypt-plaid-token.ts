import "dotenv/config";

import { decryptToken } from "../src/features/plaid/utils/encryption";

/**
 * Decrypts an encrypted Plaid token using AES-256-GCM
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register --transpile-only ./scripts/decrypt-plaid-token.ts "salt:iv:tag:ciphertext"
 *
 * The encrypted token should be in the format: salt:iv:tag:ciphertext (all base64-encoded)
 */
async function decryptPlaidTokenScript() {
  console.log("🔓 Plaid Token Decryption Utility");
  console.log("================================================\n");

  // Get encrypted token from command line argument
  const encryptedToken = process.argv[2];

  if (!encryptedToken) {
    console.error("❌ Error: No encrypted token provided");
    console.log("\nUsage:");
    console.log(
      '  npx ts-node -r tsconfig-paths/register --transpile-only ./scripts/decrypt-plaid-token.ts "salt:iv:tag:ciphertext"',
    );
    console.log("\nExample:");
    console.log(
      '  npx ts-node -r tsconfig-paths/register --transpile-only ./scripts/decrypt-plaid-token.ts "xyz123:abc456:def789:ghi012"',
    );
    process.exit(1);
  }

  try {
    // Validate format
    const parts = encryptedToken.split(":");
    if (parts.length !== 4) {
      throw new Error(
        "Invalid encrypted token format. Expected format: salt:iv:tag:ciphertext",
      );
    }

    console.log("Encrypted Token (first 50 chars):");
    console.log(
      encryptedToken.length > 50
        ? `${encryptedToken.substring(0, 50)}...`
        : encryptedToken,
    );
    console.log(`\nToken Length: ${encryptedToken.length} characters`);
    console.log("Components: salt, iv, tag, ciphertext (all base64-encoded)");
    console.log("\nDecrypting...\n");

    // Decrypt the token
    const plaintext = decryptToken(encryptedToken);

    console.log("================================================");
    console.log("✅ Decryption successful!");
    console.log("================================================\n");

    console.log("Decrypted Token:");
    console.log(plaintext);
    console.log(`\nPlaintext Length: ${plaintext.length} characters`);

    console.log("\n================================================");
    console.log("🎉 Decryption complete!");
  } catch (error) {
    console.error("\n❌ Decryption failed!");
    console.error("================================================");

    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);

      if (error.message.includes("Invalid encrypted token format")) {
        console.error(
          "\nThe encrypted token must be in format: salt:iv:tag:ciphertext",
        );
      } else if (
        error.message.includes("Unsupported state") ||
        error.message.includes("auth")
      ) {
        console.error(
          "\nThis could mean:",
          "\n  - The token was tampered with",
          "\n  - Wrong encryption key (AUTH_SECRET mismatch)",
          "\n  - Corrupted data",
        );
      }
    } else {
      console.error("Unknown error:", error);
    }

    process.exit(1);
  }
}

// Run the script
decryptPlaidTokenScript().catch((error) => {
  console.error("❌ Script failed with unexpected error:", error);
  process.exit(1);
});
