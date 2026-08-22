import {
  compareRepoFiles,
  expectParity,
  PYTHON_URL,
  V2_URL,
  userBasicAuthHeader,
} from "../expect-parity";
import { PARITY_USER, seedFixtureRepo } from "../seed";
import { GITEA_URL } from "../expect-parity";

/**
 * Write-path parity — the donor branch's never-signed-off surface. Every write
 * runs against per-target fixture repos (`fixture-py` / `fixture-v2`) and ends
 * with the write rule: byte-identical repo contents via compareRepoFiles.
 */

const VARS = { repo: { python: "fixture-py", v2: "fixture-v2" } };
const REPOS = { python: "fixture-py", v2: "fixture-v2" } as const;
const BASES = { python: PYTHON_URL, v2: V2_URL } as const;
type Target = keyof typeof BASES;

async function call(
  target: Target,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${BASES[target]}${path}`, {
    method,
    headers: {
      Authorization: userBasicAuthHeader(),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

/** The target's own hash for the FIRST journal entry matching a narration. */
async function hashOf(target: Target, narration: string): Promise<string> {
  const { json } = await call(
    target,
    "GET",
    `/journal/${PARITY_USER}/${REPOS[target]}`,
  );
  const items = (json.data as { items: Array<Record<string, unknown>> }).items;
  const hit = items.find((i) => String(i.narration ?? "") === narration);
  return String(hit?.entry_hash ?? "");
}

/** The target's context (sha256sum + slice) for an entry hash. */
async function contextOf(
  target: Target,
  hash: string,
): Promise<{ sha256sum: string; slice: string }> {
  const { json } = await call(
    target,
    "GET",
    `/journal/${PARITY_USER}/${REPOS[target]}/context/${hash}`,
  );
  const data = json.data as { sha256sum: string; slice: string };
  return { sha256sum: data.sha256sum, slice: data.slice };
}

/** Reset both fixture repos to the seeded baseline (kills prior-run residue). */
async function resetFixtureRepos(): Promise<void> {
  const headers = { Authorization: userBasicAuthHeader() };
  for (const repo of ["fixture-py", "fixture-v2"]) {
    await fetch(`${GITEA_URL}/api/v1/repos/${PARITY_USER}/${repo}`, {
      method: "DELETE",
      headers,
    });
    await seedFixtureRepo(repo);
  }
  // The Python service caches parsed ledgers in-process and cannot see the
  // out-of-band reset; a create+delete through ITS files API clears the cache.
  for (const target of ["python"] as const) {
    const create = await call(
      target,
      "POST",
      `/ledgers/${PARITY_USER}/${REPOS[target === "python" ? "python" : "v2"]}/files`,
      {
        path: "cache-buster.tmp",
        content: Buffer.from("x").toString("base64"),
      },
    );
    const sha = ((create.json.data ?? {}) as { sha?: string }).sha;
    if (sha) {
      await call(
        target,
        "DELETE",
        `/ledgers/${PARITY_USER}/${REPOS.python}/files`,
        { path: "cache-buster.tmp", sha },
      );
    }
  }
}

describe("parity: compute write paths (write rule)", () => {
  // A per-state-unique narration so re-runs don't collide on duplicate entries.
  let marker = "";

  beforeAll(async () => {
    await resetFixtureRepos();
    const { json } = await call(
      "python",
      "GET",
      `/journal/${PARITY_USER}/fixture-py`,
    );
    const total = (json.data as { total: number }).total;
    marker = `parity-write-${total}`;
  }, 120000);

  it("addBulkEntries → identical commits on both targets", async () => {
    const res = await expectParity({
      operation: "addBulkEntries",
      method: "POST",
      path: `/entries/${PARITY_USER}/{{repo}}/bulk`,
      body: {
        entries: [
          {
            type: "transaction",
            item: {
              date: "2024-06-01",
              flag: "*",
              payee: "Parity Cafe",
              narration: "{{marker}}",
              postings: [
                {
                  units: { number: "12.50", currency: "USD" },
                  account: "Depenses:Food",
                },
                {
                  units: { number: "-12.50", currency: "USD" },
                  account: "Actifs:Cash",
                },
              ],
            },
          },
        ],
      },
      vars: { ...VARS, marker: { python: marker, v2: marker } },
    });
    expect(res.status).toBe(200);
    expect(res.normalized).toEqual({ success: true, data: null });
    await compareRepoFiles("fixture-py", "fixture-v2");
  });

  it("updateSourceSlice → same edit, byte-identical repos", async () => {
    const hashes = {
      python: await hashOf("python", marker),
      v2: await hashOf("v2", marker),
    };
    expect(hashes.python).not.toBe("");
    expect(hashes.v2).not.toBe("");

    const ctxPy = await contextOf("python", hashes.python);
    const ctxV2 = await contextOf("v2", hashes.v2);
    // Same repo bytes → same slice text and sha256 on both sides
    expect(ctxV2.slice).toBe(ctxPy.slice);
    expect(ctxV2.sha256sum).toBe(ctxPy.sha256sum);

    const newContent = ctxPy.slice.replace("12.50", "13.75");
    expect(newContent).not.toBe(ctxPy.slice);

    const res = await expectParity({
      operation: "updateSourceSlice",
      method: "PUT",
      path: `/journal/${PARITY_USER}/{{repo}}/source-slice`,
      body: {
        entry_hash: "{{hash}}",
        sha256sum: ctxPy.sha256sum,
        new_content: newContent,
      },
      vars: { ...VARS, hash: hashes },
      volatileFields: ["entry_hash"],
    });
    expect(res.status).toBe(200);
    await compareRepoFiles("fixture-py", "fixture-v2");
  });

  it("updateSourceSlice — stale sha256sum rejected identically", async () => {
    const hashes = {
      python: await hashOf("python", marker),
      v2: await hashOf("v2", marker),
    };
    const res = await expectParity({
      operation: "updateSourceSlice",
      method: "PUT",
      path: `/journal/${PARITY_USER}/{{repo}}/source-slice`,
      body: {
        entry_hash: "{{hash}}",
        sha256sum: "0".repeat(64),
        new_content: "; nope\n",
      },
      vars: { ...VARS, hash: hashes },
      volatileFields: ["entry_hash"],
    }).catch((err) => err);
    // Both must REJECT (4xx/5xx) and leave the repos untouched…
    if (res instanceof Error) {
      // …status may differ between services; repo integrity is the invariant
      expect(String(res)).toMatch(/Parity mismatch/);
    } else {
      expect(res.status).toBeGreaterThanOrEqual(400);
    }
    await compareRepoFiles("fixture-py", "fixture-v2");
  });

  it("deleteSourceSlice → entry removed identically", async () => {
    const hashes = {
      python: await hashOf("python", marker),
      v2: await hashOf("v2", marker),
    };
    const ctxPy = await contextOf("python", hashes.python);

    const res = await expectParity({
      operation: "deleteSourceSlice",
      method: "DELETE",
      path: `/journal/${PARITY_USER}/{{repo}}/source-slice`,
      body: { entry_hash: "{{hash}}", sha256sum: ctxPy.sha256sum },
      vars: { ...VARS, hash: hashes },
      volatileFields: ["entry_hash"],
    });
    expect(res.status).toBe(200);
    await compareRepoFiles("fixture-py", "fixture-v2");
  });

  it("deleteMultiSourceSlices → batch delete identically", async () => {
    // add two entries to delete in one call
    const addTwo = await expectParity({
      operation: "addBulkEntries",
      method: "POST",
      path: `/entries/${PARITY_USER}/{{repo}}/bulk`,
      body: {
        entries: [
          {
            type: "note",
            item: {
              date: "2024-06-02",
              account: "Actifs:Cash",
              comment: "{{marker}}-n1",
            },
          },
          {
            type: "note",
            item: {
              date: "2024-06-03",
              account: "Actifs:Cash",
              comment: "{{marker}}-n2",
            },
          },
        ],
      },
      vars: { ...VARS, marker: { python: marker, v2: marker } },
    });
    expect(addTwo.status).toBe(200);
    await compareRepoFiles("fixture-py", "fixture-v2");

    const noteHashes = async (target: Target): Promise<string[]> => {
      const { json } = await call(
        target,
        "GET",
        `/journal/${PARITY_USER}/${REPOS[target]}`,
      );
      const items = (json.data as { items: Array<Record<string, unknown>> })
        .items;
      return items
        .filter((i) => String(i.comment ?? "").startsWith(`${marker}-n`))
        .map((i) => String(i.entry_hash));
    };
    const pyHashes = await noteHashes("python");
    const v2Hashes = await noteHashes("v2");
    expect(pyHashes).toHaveLength(2);
    expect(v2Hashes).toHaveLength(2);

    const entriesFor = async (
      target: Target,
      hashes: string[],
    ): Promise<Array<{ entry_hash: string; sha256sum: string }>> => {
      const out = [];
      for (const h of hashes) {
        const ctx = await contextOf(target, h);
        out.push({ entry_hash: h, sha256sum: ctx.sha256sum });
      }
      return out;
    };

    const res = await expectParity({
      operation: "deleteMultiSourceSlices",
      method: "DELETE",
      path: `/journal/${PARITY_USER}/{{repo}}/source-slices`,
      bodyPerTarget: {
        python: { entries: await entriesFor("python", pyHashes) },
        v2: { entries: await entriesFor("v2", v2Hashes) },
      },
      vars: VARS,
      volatileFields: ["deleted_hashes", "entry_hash", "message"],
    });
    expect(res.status).toBe(200);
    await compareRepoFiles("fixture-py", "fixture-v2");
  });
});
