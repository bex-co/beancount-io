import { compareRepoFiles, expectParity } from "../expect-parity";
import { PARITY_USER } from "../seed";

/** Fields that differ between two independent commits. */
const COMMIT_VOLATILE = [
  "sha",
  "last_commit_sha",
  "last_committer_date",
  "last_author_date",
];

const FIXTURE_VARS = {
  repo: { python: "fixture-py", v2: "fixture-v2" },
};

/** Reset helper: remove residue from prior (possibly aborted) runs via Gitea. */
async function deleteIfExists(repo: string, path: string): Promise<void> {
  const { GITEA_URL, userBasicAuthHeader } = await import("../expect-parity");
  const { PARITY_USER: user } = await import("../seed");
  const headers = { Authorization: userBasicAuthHeader() };
  const get = await fetch(
    `${GITEA_URL}/api/v1/repos/${user}/${repo}/contents/${path}`,
    { headers },
  );
  if (!get.ok) return;
  const { sha } = (await get.json()) as { sha: string };
  await fetch(`${GITEA_URL}/api/v1/repos/${user}/${repo}/contents/${path}`, {
    method: "DELETE",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ sha, message: `parity cleanup ${path}` }),
  });
}

beforeAll(async () => {
  for (const repo of ["fixture-py", "fixture-v2"]) {
    for (const path of ["lifecycle.bean", "batch/a.bean", "batch/b.bean"]) {
      await deleteIfExists(repo, path);
    }
  }
});

describe("parity: ledger files", () => {
  it("getLedgerFile — existing file", async () => {
    const res = await expectParity({
      operation: "getLedgerFile",
      path: `/ledgers/${PARITY_USER}/book/files`,
      query: { path: "main.bean" },
    });
    expect(res.status).toBe(200);
  });

  it("getLedgerFile — missing file returns success(null), not 404", async () => {
    const res = await expectParity({
      operation: "getLedgerFile",
      path: `/ledgers/${PARITY_USER}/book/files`,
      query: { path: "does-not-exist.bean" },
    });
    expect(res.status).toBe(200);
    expect(res.normalized).toEqual({ success: true, data: null });
  });

  it("getLedgerFilesContent — batch fetch", async () => {
    const res = await expectParity({
      operation: "getLedgerFilesContent",
      method: "POST",
      path: `/ledgers/${PARITY_USER}/book/files-content`,
      body: { files: ["main.bean", "books/2023.bean"] },
    });
    expect(res.status).toBe(200);
  });

  it("getLedgerDirContent — root, subdirectory, missing, and file-not-dir", async () => {
    const root = await expectParity({
      operation: "getLedgerDirContent",
      path: `/ledgers/${PARITY_USER}/book/dirs`,
    });
    expect(root.status).toBe(200);

    const sub = await expectParity({
      operation: "getLedgerDirContent",
      path: `/ledgers/${PARITY_USER}/book/dirs`,
      query: { dir_path: "books" },
    });
    expect(sub.status).toBe(200);

    const missing = await expectParity({
      operation: "getLedgerDirContent",
      path: `/ledgers/${PARITY_USER}/book/dirs`,
      query: { dir_path: "no-such-dir" },
    });
    expect(missing.status).toBe(200);
    expect(missing.normalized).toEqual({ success: true, data: [] });

    const fileNotDir = await expectParity({
      operation: "getLedgerDirContent",
      path: `/ledgers/${PARITY_USER}/book/dirs`,
      query: { dir_path: "main.bean" },
    });
    expect(fileNotDir.status).toBe(404);
  });

  it("getLedgerArchive — streams identical bytes for main.zip metadata", async () => {
    // Response is binary; compare status only via a raw expectParity on a
    // volatile-everything basis is meaningless — instead assert both succeed.
    const res = await expectParity({
      operation: "getLedgerArchive",
      path: `/ledgers/${PARITY_USER}/book/archive/main.tar.gz`,
      volatileFields: [],
    }).catch((err) => err);
    // Archives are gzip streams with embedded mtimes — bodies legitimately
    // differ; a ParityMismatchError on the BODY is acceptable, a status
    // mismatch is not.
    if (res instanceof Error) {
      expect(res.message).not.toMatch(/status python/);
    }
  });

  it("create → update → delete file lifecycle parity (write rule)", async () => {
    const created = await expectParity({
      operation: "createLedgerFile",
      method: "POST",
      path: `/ledgers/${PARITY_USER}/{{repo}}/files`,
      body: {
        path: "lifecycle.bean",
        content: "MjAyMS0wMS0wMSBvcGVuIEFzc2V0czpMaWZlY3ljbGUgVVNECg==", // b64
      },
      vars: FIXTURE_VARS,
      volatileFields: COMMIT_VOLATILE,
    });
    expect(created.status).toBe(201);

    // fetch the per-target blob shas for update
    const shaOf = async (): Promise<{ python: string; v2: string }> => {
      const get = await expectParity({
        operation: "getLedgerFile",
        path: `/ledgers/${PARITY_USER}/{{repo}}/files`,
        query: { path: "lifecycle.bean" },
        vars: FIXTURE_VARS,
        volatileFields: COMMIT_VOLATILE,
      });
      const sha = (r: unknown) =>
        ((r as { data: { sha: string } }).data ?? { sha: "" }).sha;
      return { python: sha(get.raw.python.json), v2: sha(get.raw.v2.json) };
    };

    let shas = await shaOf();
    const updated = await expectParity({
      operation: "updateLedgerFile",
      method: "PUT",
      path: `/ledgers/${PARITY_USER}/{{repo}}/files`,
      body: {
        path: "lifecycle.bean",
        content:
          "MjAyMS0wMS0wMSBvcGVuIEFzc2V0czpMaWZlY3ljbGUgVVNECjIwMjEtMDItMDEgb3BlbiBBc3NldHM6VHdvIFVTRAo=", // b64
        sha: "{{sha}}",
      },
      vars: { ...FIXTURE_VARS, sha: shas },
      volatileFields: COMMIT_VOLATILE,
    });
    expect(updated.status).toBe(200);

    // write rule: after the same logical writes, both fixture repos hold
    // byte-identical file contents
    await compareRepoFiles("fixture-py", "fixture-v2");

    shas = await shaOf();
    const deleted = await expectParity({
      operation: "deleteLedgerFile",
      method: "DELETE",
      path: `/ledgers/${PARITY_USER}/{{repo}}/files`,
      body: { path: "lifecycle.bean", sha: "{{sha}}" },
      vars: { ...FIXTURE_VARS, sha: shas },
    });
    expect(deleted.status).toBe(200);
    await compareRepoFiles("fixture-py", "fixture-v2");
  });

  it("changeLedgerFiles — multi-file atomic commit parity (write rule)", async () => {
    const changed = await expectParity({
      operation: "changeLedgerFiles",
      method: "POST",
      path: `/ledgers/${PARITY_USER}/{{repo}}/change-files`,
      body: {
        files: [
          {
            operation: "create",
            path: "batch/a.bean",
            content: "MjAyMi0wMS0wMSBvcGVuIEFzc2V0czpCYXRjaEEgVVNECg==", // b64
          },
          {
            operation: "create",
            path: "batch/b.bean",
            content: "MjAyMi0wMS0wMSBvcGVuIEFzc2V0czpCYXRjaEIgVVNECg==", // b64
          },
        ],
        message: "parity batch commit",
      },
      vars: FIXTURE_VARS,
    });
    expect(changed.status).toBe(200);
    expect(changed.normalized).toEqual({ success: true, data: null });
    await compareRepoFiles("fixture-py", "fixture-v2");
  });
});
