import { utils } from "ssh2";

/**
 * Keypairs for tests — host keys and client keys.
 *
 * This lived in production code while the proxy minted relay keys. It no longer
 * does: Gitea holds the only SSH keys now, and the proxy reaches Gitea over
 * HTTP with the user's own credentials. Only the tests still need to invent a
 * key, so the generator moved here rather than staying as unreachable code.
 *
 * The retry is not defensive padding. ssh2 1.17.0 returns a private key it
 * cannot itself parse roughly three times in a thousand — measured at 9/3000 —
 * and without this the SSH suite fails about once in twelve full runs, in a
 * different test each time. That flake is how the defect was found.
 */
export function generateTestKeyPair(comment: string): {
  publicKey: string;
  privateKey: string;
} {
  for (let attempt = 0; attempt < 8; attempt++) {
    const { public: publicKey, private: privateKey } =
      utils.generateKeyPairSync("ed25519");
    if (utils.parseKey(privateKey) instanceof Error) continue;
    return { publicKey: `${publicKey.trim()} ${comment}`.trim(), privateKey };
  }
  throw new Error("Could not generate a usable test keypair in 8 attempts.");
}
