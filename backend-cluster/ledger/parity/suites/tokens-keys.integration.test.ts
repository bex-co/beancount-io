import { expectParity, GITEA_URL, userBasicAuthHeader } from "../expect-parity";
import { PARITY_USER } from "../seed";

const TOKEN_VOLATILE = [
  "id",
  "sha1",
  "token_last_eight",
  "created_at",
  "last_used_at",
];
const KEY_VOLATILE = [
  "id",
  "fingerprint",
  "key",
  "title",
  "created_at",
  "last_used_at",
];

const TOKEN_VARS = { tok: { python: "parity-tok-py", v2: "parity-tok-v2" } };
const KEY_VARS = {
  title: { python: "parity-key-py", v2: "parity-key-v2" },
  pubkey: {
    python:
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGUft3+dqMXEpVFrrW6UqdhYb20T3rTGSBD6E0HdOIPd parity-py",
    v2: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIC5uYJhAEBm0LN22uSNrBAnEBgxp/8BXhHJ/FJpkiEvD parity-v2",
  },
};

async function cleanupTokens(): Promise<void> {
  const headers = { Authorization: userBasicAuthHeader() };
  const res = await fetch(`${GITEA_URL}/api/v1/users/${PARITY_USER}/tokens`, {
    headers,
  });
  if (!res.ok) return;
  const tokens = (await res.json()) as Array<{ id: number; name: string }>;
  for (const t of tokens) {
    if (t.name.startsWith("parity-tok-")) {
      await fetch(`${GITEA_URL}/api/v1/users/${PARITY_USER}/tokens/${t.id}`, {
        method: "DELETE",
        headers,
      });
    }
  }
}

async function cleanupKeys(): Promise<void> {
  const headers = { Authorization: userBasicAuthHeader() };
  const res = await fetch(`${GITEA_URL}/api/v1/user/keys`, { headers });
  if (!res.ok) return;
  const keys = (await res.json()) as Array<{ id: number; title: string }>;
  for (const k of keys) {
    if (k.title.startsWith("parity-key-")) {
      await fetch(`${GITEA_URL}/api/v1/user/keys/${k.id}`, {
        method: "DELETE",
        headers,
      });
    }
  }
}

beforeAll(async () => {
  await cleanupTokens();
  await cleanupKeys();
});

describe("parity: tokens", () => {
  it("createUserToken — 201 with masked secret material", async () => {
    const res = await expectParity({
      operation: "createUserToken",
      method: "POST",
      path: `/tokens/${PARITY_USER}`,
      body: { name: "{{tok}}", scopes: ["read:repository"] },
      vars: TOKEN_VARS,
      volatileFields: TOKEN_VOLATILE,
    });
    expect(res.status).toBe(201);
    await cleanupTokens();
  });

  it("createUserToken — 403 creating a token for another user", async () => {
    const res = await expectParity({
      operation: "createUserToken",
      method: "POST",
      path: "/tokens/parityadmin",
      body: { name: "should-fail" },
    });
    expect([403, 422]).toContain(res.status);
  });
});

describe("parity: keys", () => {
  it("createPublicKey → get → list → delete lifecycle", async () => {
    const created = await expectParity({
      operation: "createPublicKey",
      method: "POST",
      path: "/keys",
      body: { key: "{{pubkey}}", title: "{{title}}", read_only: true },
      vars: KEY_VARS,
      volatileFields: KEY_VOLATILE,
    });
    expect(created.status).toBe(201);
    const keyId = (raw: unknown): number =>
      ((raw as { data: { id: number } }).data ?? { id: 0 }).id;
    const ids = {
      python: String(keyId(created.raw.python.json)),
      v2: String(keyId(created.raw.v2.json)),
    };

    const got = await expectParity({
      operation: "getPublicKey",
      path: "/keys/{{id}}",
      vars: { ...KEY_VARS, id: ids },
      volatileFields: KEY_VOLATILE,
    });
    expect(got.status).toBe(200);

    const listed = await expectParity({
      operation: "listPublicKeys",
      path: "/keys",
      vars: KEY_VARS,
      volatileFields: KEY_VOLATILE,
    });
    expect(listed.status).toBe(200);

    const deleted = await expectParity({
      operation: "deletePublicKey",
      method: "DELETE",
      path: "/keys/{{id}}",
      vars: { ...KEY_VARS, id: ids },
    });
    expect(deleted.status).toBe(200);
  });

  it("getPublicKey — 404 for an unknown id", async () => {
    const res = await expectParity({
      operation: "getPublicKey",
      path: "/keys/999999",
    });
    expect(res.status).toBe(404);
  });
});
