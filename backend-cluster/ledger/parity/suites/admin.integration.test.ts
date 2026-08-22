import { expectParity, GITEA_URL } from "../expect-parity";
import { PARITY_USER } from "../seed";

const ADMIN_HEADER = `Basic ${Buffer.from("parityadmin:parityadmin123").toString("base64")}`;
const asAdmin = { header: ADMIN_HEADER };

/** Fields differing between two independently-created users. */
const USER_VOLATILE = ["id", "created", "last_login"];

const USER_VARS = {
  u: { python: "tmpuser-py", v2: "tmpuser-v2" },
  u2: { python: "tmpuser2-py", v2: "tmpuser2-v2" },
};

async function adminDeleteIfExists(username: string): Promise<void> {
  await fetch(`${GITEA_URL}/api/v1/admin/users/${username}?purge=true`, {
    method: "DELETE",
    headers: { Authorization: ADMIN_HEADER },
  });
}

beforeAll(async () => {
  for (const u of ["tmpuser-py", "tmpuser-v2", "tmpuser2-py", "tmpuser2-v2"]) {
    await adminDeleteIfExists(u);
  }
});

describe("parity: admin", () => {
  it("createUser → editUser → renameUser → deleteUser lifecycle", async () => {
    const created = await expectParity({
      operation: "createUser",
      method: "POST",
      path: "/admin/users",
      body: {
        username: "{{u}}",
        password: "parity-pass-123A!",
        email: "{{u}}@example.com",
      },
      auth: asAdmin,
      vars: USER_VARS,
      volatileFields: USER_VOLATILE,
    });
    expect(created.status).toBe(200);

    const edited = await expectParity({
      operation: "editUser",
      method: "PATCH",
      path: "/admin/users/{{u}}",
      body: {
        login_name: "{{u}}",
        source_id: 0,
        description: "edited by parity",
      },
      auth: asAdmin,
      vars: USER_VARS,
      volatileFields: USER_VOLATILE,
    });
    expect(edited.status).toBe(200);

    const renamed = await expectParity({
      operation: "renameUser",
      method: "POST",
      path: "/admin/users/{{u}}/rename",
      body: { new_username: "{{u2}}" },
      auth: asAdmin,
      vars: USER_VARS,
    });
    expect(renamed.status).toBe(200);
    expect(renamed.normalized).toEqual({ success: true, data: null });

    const deleted = await expectParity({
      operation: "deleteUser",
      method: "DELETE",
      path: "/admin/users/{{u2}}",
      auth: asAdmin,
      vars: USER_VARS,
    });
    expect(deleted.status).toBe(200);
  });

  it("createUser — 403 for non-admin credentials", async () => {
    const res = await expectParity({
      operation: "createUser",
      method: "POST",
      path: "/admin/users",
      body: {
        username: "nope",
        password: "parity-pass-123A!",
        email: "nope@example.com",
      },
      // default auth = parityuser (not admin)
    });
    expect(res.status).toBe(403);
  });

  it("getLedgerByRepoId — resolves the book repo id", async () => {
    // discover the id via Gitea directly (identical for both services)
    const repo = await fetch(`${GITEA_URL}/api/v1/repos/${PARITY_USER}/book`, {
      headers: { Authorization: ADMIN_HEADER },
    }).then((r) => r.json() as Promise<{ id: number }>);

    const res = await expectParity({
      operation: "getLedgerByRepoId",
      path: `/admin/ledgers/${repo.id}`,
      auth: asAdmin,
    });
    expect(res.status).toBe(200);

    const missing = await expectParity({
      operation: "getLedgerByRepoId",
      path: "/admin/ledgers/999999",
      auth: asAdmin,
    });
    expect(missing.status).toBe(404);
  });
});
