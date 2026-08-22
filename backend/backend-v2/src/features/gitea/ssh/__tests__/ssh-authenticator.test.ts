import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { itWithSshKeygen } from "./ssh-keygen-available";
import { sshFingerprint, SshAuthenticator } from "../ssh-authenticator";
import { generateTestKeyPair } from "./test-keys";

jest.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

describe("sshFingerprint", () => {
  itWithSshKeygen("matches what ssh-keygen reports for the same key", () => {
    // Gitea searches by this exact string, so ours has to be the one OpenSSH
    // produces — asserting against our own implementation would prove nothing.
    const { publicKey } = generateTestKeyPair("probe");
    const blob = Buffer.from(publicKey.split(" ")[1], "base64");

    const dir = mkdtempSync(join(tmpdir(), "fp-"));
    try {
      const file = join(dir, "id.pub");
      writeFileSync(file, publicKey + "\n");
      const reported = execFileSync("ssh-keygen", ["-l", "-f", file], {
        encoding: "utf8",
      }).split(/\s+/)[1];

      expect(sshFingerprint(blob)).toBe(reported);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("strips base64 padding, as OpenSSH does", () => {
    expect(sshFingerprint(Buffer.from("x"))).not.toContain("=");
    expect(sshFingerprint(Buffer.from("x")).startsWith("SHA256:")).toBe(true);
  });
});

describe("SshAuthenticator", () => {
  const blob = Buffer.from("a-key-blob");
  const fingerprint = sshFingerprint(blob);

  /** A stand-in for Gitea holding a set of keys, so one can be taken away. */
  function giteaHolding(keys: Array<{ fingerprint: string; login: string }>) {
    const store = [...keys];
    const listKeys = jest
      .fn()
      .mockImplementation(
        async ({ fingerprint: q }: { fingerprint: string }) => ({
          data: store
            .filter((k) => k.fingerprint === q)
            .map((k) => ({
              fingerprint: k.fingerprint,
              user: { login: k.login },
            })),
        }),
      );
    return {
      factory: {
        getAdminApiClient: () => ({ user: { userCurrentListKeys: listKeys } }),
      },
      listKeys,
      revoke: (fp: string) => {
        const i = store.findIndex((k) => k.fingerprint === fp);
        if (i >= 0) store.splice(i, 1);
      },
    };
  }

  const userModel = (login: string | null) => ({
    getUserByUsername: jest
      .fn()
      .mockImplementation(async (_db: unknown, name: string) =>
        login && name === login
          ? { id: "usr_1", ledger_username: "un_alice", ledger_password: "pw" }
          : null,
      ),
  });

  it("resolves a key Gitea knows to its owner", async () => {
    const gitea = giteaHolding([{ fingerprint, login: "un_alice" }]);
    const auth = new SshAuthenticator(
      gitea.factory as never,
      userModel("un_alice") as never,
      {} as never,
    );

    // giteaAuth is the credential translation the HTTPS git path already does,
    // carried here so the bridge needs no second query per connection.
    await expect(auth.identify(blob)).resolves.toEqual({
      userId: "usr_1",
      fingerprint,
      giteaAuth: Buffer.from("un_alice:pw").toString("base64"),
    });
    // `format: "json"` is load-bearing, not decoration: without it the generated
    // client never parses the body and leaves `data` null, which is
    // indistinguishable from "Gitea has never seen this key". That shipped once
    // and only a real stack caught it, so the call shape is asserted here.
    expect(gitea.listKeys).toHaveBeenCalledWith(
      { fingerprint },
      { format: "json" },
    );
  });

  it("refuses a key Gitea does not know", async () => {
    const gitea = giteaHolding([]);
    const auth = new SshAuthenticator(
      gitea.factory as never,
      userModel("un_alice") as never,
      {} as never,
    );
    await expect(auth.identify(blob)).resolves.toBeNull();
  });

  it("refuses the moment the key is deleted in Gitea, with no cache in between", async () => {
    // The property this whole design exists for. The previous implementation
    // read a local copy, so a key deleted in Gitea kept working — at exactly the
    // moment revocation matters most.
    const gitea = giteaHolding([{ fingerprint, login: "un_alice" }]);
    const auth = new SshAuthenticator(
      gitea.factory as never,
      userModel("un_alice") as never,
      {} as never,
    );

    expect(await auth.identify(blob)).not.toBeNull();
    gitea.revoke(fingerprint);
    expect(await auth.identify(blob)).toBeNull();
  });

  it("refuses rather than throwing when Gitea is unreachable", async () => {
    const factory = {
      getAdminApiClient: () => ({
        user: {
          userCurrentListKeys: jest
            .fn()
            .mockRejectedValue(new Error("ECONNREFUSED")),
        },
      }),
    };
    const auth = new SshAuthenticator(
      factory as never,
      userModel("un_alice") as never,
      {} as never,
    );
    await expect(auth.identify(blob)).resolves.toBeNull();
  });

  it("refuses a key whose owner has no account here", async () => {
    const gitea = giteaHolding([{ fingerprint, login: "un_stranger" }]);
    const auth = new SshAuthenticator(
      gitea.factory as never,
      userModel("un_alice") as never,
      {} as never,
    );
    await expect(auth.identify(blob)).resolves.toBeNull();
  });

  it("ignores a returned key whose fingerprint does not actually match", async () => {
    // Trusting the search blindly would authenticate the wrong person if the
    // filter ever loosened; the match is re-checked locally.
    const factory = {
      getAdminApiClient: () => ({
        user: {
          userCurrentListKeys: jest.fn().mockResolvedValue({
            data: [
              {
                fingerprint: "SHA256:someoneelse",
                user: { login: "un_alice" },
              },
            ],
          }),
        },
      }),
    };
    const auth = new SshAuthenticator(
      factory as never,
      userModel("un_alice") as never,
      {} as never,
    );
    await expect(auth.identify(blob)).resolves.toBeNull();
  });
});
