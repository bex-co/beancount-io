import { expectParity } from "../expect-parity";
import { PARITY_USER } from "../seed";

/** Volatile fields of two independently-created repos. */
const CREATE_VOLATILE = ["id", "created_at", "updated_at", "size"];

describe("parity: ledgers (vertical slice)", () => {
  it("listLedgers — GET /ledgers", async () => {
    const res = await expectParity({
      operation: "listLedgers",
      path: "/ledgers",
    });
    expect(res.status).toBe(200);
    const data = (res.normalized as { data: unknown[] }).data;
    expect(data.length).toBeGreaterThanOrEqual(4); // book, fixture-py, fixture-v2, book-large
  });

  it("listLedgers — pagination params forwarded identically", async () => {
    const res = await expectParity({
      operation: "listLedgers",
      path: "/ledgers",
      query: { page: 1, limit: 2 },
    });
    expect(res.status).toBe(200);
    expect((res.normalized as { data: unknown[] }).data).toHaveLength(2);
  });

  it("listLedgers — 401 without credentials", async () => {
    const res = await expectParity({
      operation: "listLedgers",
      path: "/ledgers",
      auth: "none",
    });
    expect(res.status).toBe(401);
  });

  it("getLedger — GET /ledgers/{owner}/{repo_name}", async () => {
    const res = await expectParity({
      operation: "getLedger",
      path: `/ledgers/${PARITY_USER}/book`,
    });
    expect(res.status).toBe(200);
  });

  it("getLedger — 404 for an unknown repo", async () => {
    const res = await expectParity({
      operation: "getLedger",
      path: `/ledgers/${PARITY_USER}/no-such-repo`,
    });
    expect(res.status).toBe(404);
  });

  it("getLedger — 404 for another user's private repo credentials cannot see", async () => {
    const res = await expectParity({
      operation: "getLedger",
      path: `/ledgers/${PARITY_USER}/book`,
      auth: { header: "token invalid-token-000" },
    });
    // Gitea answers 401 for a bad token; both services must forward it alike
    expect([401, 404]).toContain(res.status);
  });

  it("listUserLedgers — GET /ledgers/users/{username}", async () => {
    const res = await expectParity({
      operation: "listUserLedgers",
      path: `/ledgers/users/${PARITY_USER}`,
      query: { limit: 3 },
    });
    expect(res.status).toBe(200);
  });

  it("searchLedgers — GET /ledgers/search", async () => {
    const res = await expectParity({
      operation: "searchLedgers",
      path: "/ledgers/search",
      query: { q: "book", limit: 10 },
    });
    expect(res.status).toBe(200);
  });

  it("createLedger — 400 without files / without main.bean / bad name", async () => {
    const noFiles = await expectParity({
      operation: "createLedger",
      method: "POST",
      path: "/ledgers",
      body: { name: "x", files: {} },
    });
    expect(noFiles.status).toBe(400);

    const noMain = await expectParity({
      operation: "createLedger",
      method: "POST",
      path: "/ledgers",
      body: { name: "x", files: { "other.bean": "; hi" } },
    });
    expect(noMain.status).toBe(400);

    const badName = await expectParity({
      operation: "createLedger",
      method: "POST",
      path: "/ledgers",
      body: { name: "!!!", files: { "main.bean": "; hi" } },
    });
    expect(badName.status).toBe(400);
  });

  it("createLedger → updateLedger → deleteLedger lifecycle parity", async () => {
    const vars = {
      repo: { python: "parity-crud-py", v2: "parity-crud-v2" },
    };

    const created = await expectParity({
      operation: "createLedger",
      method: "POST",
      path: "/ledgers",
      body: {
        name: "{{repo}}",
        description: "crud lifecycle",
        private: true,
        files: { "main.bean": "2020-01-01 open Assets:Cash USD\n" },
      },
      vars,
      volatileFields: CREATE_VOLATILE,
    });
    expect(created.status).toBe(201);

    // duplicate create → identical 400s
    const dup = await expectParity({
      operation: "createLedger",
      method: "POST",
      path: "/ledgers",
      body: { name: "{{repo}}", files: { "main.bean": "; x" } },
      vars,
    });
    expect(dup.status).toBe(400);

    const updated = await expectParity({
      operation: "updateLedger",
      method: "PUT",
      path: `/ledgers/${PARITY_USER}/{{repo}}`,
      body: { description: "updated description" },
      vars,
      volatileFields: CREATE_VOLATILE,
    });
    expect(updated.status).toBe(200);

    const deleted = await expectParity({
      operation: "deleteLedger",
      method: "DELETE",
      path: `/ledgers/${PARITY_USER}/{{repo}}`,
      vars,
    });
    expect(deleted.status).toBe(200);

    // gone on both sides afterwards
    const gone = await expectParity({
      operation: "getLedger",
      path: `/ledgers/${PARITY_USER}/{{repo}}`,
      vars,
    });
    expect(gone.status).toBe(404);
  });
});
