import { Client } from "ssh2";
import { SshProxyServer } from "../ssh-proxy-server";
import { generateTestKeyPair } from "./test-keys";
import { sshFingerprint } from "../ssh-authenticator";
import { SshAuthenticator } from "../ssh-authenticator";

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

/**
 * These drive a real ssh2 server with a real ssh2 client, because the parts
 * worth testing here are the ones the pure functions cannot cover: that an
 * unindexed key is actually refused at the protocol level, and that a shell
 * request is actually rejected rather than merely intended to be.
 */

function rsaHostKey(): string {
  // Generated through ssh2 rather than the ssh-keygen binary: the CI runner has
  // no OpenSSH tooling, and a host key is not what these tests are about.
  return generateTestKeyPair("test-host").privateKey;
}

function makeServer(indexed: Record<string, string>) {
  // A stand-in for Gitea: it answers a fingerprint search with the owner, which
  // is the only thing the authenticator asks anyone.
  const giteaFactory = {
    getAdminApiClient: () => ({
      user: {
        userCurrentListKeys: jest
          .fn()
          .mockImplementation(
            async ({ fingerprint }: { fingerprint: string }) => ({
              data: indexed[fingerprint]
                ? [
                    {
                      fingerprint,
                      user: { login: `login-${indexed[fingerprint]}` },
                    },
                  ]
                : [],
            }),
          ),
      },
    }),
  };
  const userModel = {
    getUserByUsername: jest
      .fn()
      .mockImplementation(async (_db: unknown, login: string) =>
        login.startsWith("login-")
          ? {
              id: login.slice("login-".length),
              ledger_username: login,
              ledger_password: "pw",
            }
          : null,
      ),
  };
  const server = new SshProxyServer(
    {
      port: 0,
      hostKeys: [rsaHostKey()],
      gitea: { host: "127.0.0.1", port: 1 },
      ledgerApiBaseUrl: "http://ledger.invalid",
    },
    new SshAuthenticator(
      giteaFactory as never,
      userModel as never,
      {} as never,
    ),
    // No user matches the repo owner, so the shadow directive-limit check fails
    // open on every push here. Deliberate: these tests assert the transport, and
    // a verdict must never be able to change whether a push is forwarded.
    {
      models: { user: { getUserByUsername: async () => null } },
      db: {},
      stripe: {},
      cacheHelper: {},
    } as never,
  );
  return { server };
}

function connect(
  port: number,
  privateKey: string,
): Promise<{ client: Client } | { error: Error }> {
  return new Promise((resolve) => {
    const client = new Client();
    client.once("ready", () => resolve({ client }));
    client.once("error", (error) => resolve({ error }));
    client.connect({
      host: "127.0.0.1",
      port,
      username: "git",
      privateKey,
      readyTimeout: 5000,
    });
  });
}

describe("SshProxyServer", () => {
  let server: SshProxyServer;
  let port: number;
  let clientKey: { publicKey: string; privateKey: string };

  afterEach(async () => {
    await server?.close();
  });

  async function start(indexUser: string | null) {
    clientKey = generateTestKeyPair("client");
    const blob = Buffer.from(clientKey.publicKey.split(" ")[1], "base64");
    const indexed = indexUser ? { [sshFingerprint(blob)]: indexUser } : {};
    const made = makeServer(indexed);
    server = made.server;
    await server.listen();
    port = (
      server as unknown as { server: { address(): { port: number } } }
    ).server.address().port;
    return made;
  }

  it("accepts a key Gitea holds", async () => {
    await start("user-1");
    const result = await connect(port, clientKey.privateKey);
    expect("client" in result).toBe(true);
    if ("client" in result) result.client.end();
  });

  it("refuses a key Gitea does not hold", async () => {
    // Fail closed: an unattributable key must not reach Gitea at all.
    await start(null);
    const result = await connect(port, clientKey.privateKey);
    expect("error" in result).toBe(true);
  });

  it("rejects a shell request", async () => {
    // A shell here would be a foothold on the proxy itself, not on Gitea.
    await start("user-1");
    const result = await connect(port, clientKey.privateKey);
    if (!("client" in result)) throw new Error("expected to connect");

    const rejected = await new Promise<boolean>((resolve) => {
      result.client.shell((err) => resolve(Boolean(err)));
    });
    expect(rejected).toBe(true);
    result.client.end();
  });

  it("rejects an exec that is not a git service", async () => {
    await start("user-1");
    const result = await connect(port, clientKey.privateKey);
    if (!("client" in result)) throw new Error("expected to connect");

    const rejected = await new Promise<boolean>((resolve) => {
      result.client.exec("bash -c 'id'", (err) => resolve(Boolean(err)));
    });
    expect(rejected).toBe(true);
    result.client.end();
  });

  // The exit-status ordering that this file used to assert by reading its own
  // source is now covered behaviourally in ssh-relay.test.ts, where a real
  // client observes exit arriving before close.

  // Accepting an exec and everything after it is covered in ssh-relay.test.ts,
  // against a real HTTP upstream. Repeating it here with an unreachable one
  // would assert nothing this file is about.
});
