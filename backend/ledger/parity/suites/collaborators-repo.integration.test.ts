import { expectParity, GITEA_URL } from "../expect-parity";
import { PARITY_USER } from "../seed";

const ADMIN_HEADER = `Basic ${Buffer.from("parityadmin:parityadmin123").toString("base64")}`;
const FRIEND = "parityfriend";

beforeAll(async () => {
  // idempotently ensure a second user to collaborate with
  await fetch(`${GITEA_URL}/api/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: ADMIN_HEADER,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: FRIEND,
      email: `${FRIEND}@example.com`,
      password: "parity-friend-123A!",
      must_change_password: false,
    }),
  });
});

describe("parity: collaborators", () => {
  it("add → permission → list → delete collaborator lifecycle", async () => {
    const added = await expectParity({
      operation: "addOrUpdateLedgerCollaborator",
      method: "PUT",
      path: `/collaborators/${PARITY_USER}/book/${FRIEND}`,
      body: { permission: "write" },
    });
    expect(added.status).toBe(200);
    expect(added.normalized).toEqual({ success: true, data: null });

    const permission = await expectParity({
      operation: "getLedgerCollaboratorPermission",
      path: `/collaborators/${PARITY_USER}/book/${FRIEND}`,
    });
    expect(permission.status).toBe(200);

    const listed = await expectParity({
      operation: "listLedgerCollaborators",
      path: `/collaborators/${PARITY_USER}/book`,
    });
    expect(listed.status).toBe(200);

    const removed = await expectParity({
      operation: "deleteLedgerCollaborator",
      method: "DELETE",
      path: `/collaborators/${PARITY_USER}/book/${FRIEND}`,
    });
    expect(removed.status).toBe(200);
  });

  it("permission — owner has admin on own repo", async () => {
    const res = await expectParity({
      operation: "getLedgerCollaboratorPermission",
      path: `/collaborators/${PARITY_USER}/book/${PARITY_USER}`,
    });
    expect(res.status).toBe(200);
  });
});

describe("parity: repo commits", () => {
  it("repoGetAllCommits — same repo, identical history", async () => {
    const res = await expectParity({
      operation: "repoGetAllCommits",
      path: `/repo/${PARITY_USER}/book/commits`,
      query: { limit: 5, stat: false, verification: false, files: false },
    });
    expect(res.status).toBe(200);
  });

  it("repoGetAllCommits — 404 for unknown repo", async () => {
    const res = await expectParity({
      operation: "repoGetAllCommits",
      path: `/repo/${PARITY_USER}/no-such-repo/commits`,
    });
    expect(res.status).toBe(404);
  });
});
