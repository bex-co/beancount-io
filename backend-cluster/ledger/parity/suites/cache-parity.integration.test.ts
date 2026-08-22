import {
  expectParity,
  GITEA_URL,
  PYTHON_URL,
  V2_URL,
  userBasicAuthHeader,
} from "../expect-parity";
import { PARITY_USER } from "../seed";

/**
 * Cache-SEMANTICS parity. The mechanisms differ by design:
 *
 *  - python: in-process LRUCache[FavaLedger] keyed by owner/repo, invalidated
 *    by its own write routes (`clear()`) and by Gitea's `repo-push` webhook.
 *  - v2: FileMap cache keyed by the repo HEAD commit SHA (resolved per read),
 *    so ANY commit is an automatic miss — no webhook required. The parsed
 *    snapshot cache additionally keys on local `today` (forecast/amortize are
 *    date-sensitive).
 *
 * The contract both must honor: after an OUT-OF-BAND git commit (bypassing
 * both services), reads reflect the new data — v2 immediately (SHA keying),
 * python once the `repo-push` webhook is delivered (which Gitea does in
 * production; this test plays Gitea's role). Ends with a strict dual read.
 */
const REPO = "cache-book";
const BOOK = `${PARITY_USER}/${REPO}`;
const BEARER = "Bearer parity-webhook-token";

const BASE_MAIN = `option "title" "Cache parity book"
option "operating_currency" "USD"

2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Misc USD

2024-01-10 * "Shop" "first entry"
  Expenses:Misc  10.00 USD
  Assets:Cash  -10.00 USD
`;

const giteaHeaders = {
  Authorization: userBasicAuthHeader(),
  "Content-Type": "application/json",
};

async function giteaGetFile(): Promise<{ sha: string } | null> {
  const res = await fetch(
    `${GITEA_URL}/api/v1/repos/${BOOK}/contents/main.bean`,
    { headers: giteaHeaders },
  );
  return res.ok ? ((await res.json()) as { sha: string }) : null;
}

/** (Re)create the repo with the base ledger, entirely out-of-band via Gitea. */
async function resetRepo(): Promise<void> {
  await fetch(`${GITEA_URL}/api/v1/repos/${BOOK}`, {
    method: "DELETE",
    headers: giteaHeaders,
  });
  const create = await fetch(`${GITEA_URL}/api/v1/user/repos`, {
    method: "POST",
    headers: giteaHeaders,
    body: JSON.stringify({
      name: REPO,
      private: true,
      auto_init: false,
      default_branch: "main",
    }),
  });
  if (!create.ok) throw new Error(`repo create failed: ${create.status}`);
  const put = await fetch(
    `${GITEA_URL}/api/v1/repos/${BOOK}/contents/main.bean`,
    {
      method: "POST",
      headers: giteaHeaders,
      body: JSON.stringify({
        content: Buffer.from(BASE_MAIN, "utf8").toString("base64"),
        message: "seed cache book",
      }),
    },
  );
  if (!put.ok) throw new Error(`seed failed: ${put.status}`);
  // In production every push fires the repo-push webhook; deliver it so
  // python drops any cached FavaLedger from a previous test/run. v2 needs no
  // equivalent — the recreated repo has a new HEAD SHA. (Skipping this line
  // makes python serve the PRE-reset ledger: the exact staleness this suite
  // documents.)
  await deliverPushWebhookToPython();
}

async function journalTotal(base: string): Promise<number> {
  const res = await fetch(`${base}/journal/${BOOK}`, {
    headers: { Authorization: userBasicAuthHeader() },
  });
  const body = (await res.json()) as { data: { total: number } };
  return body.data.total;
}

/** Play Gitea's production role: deliver the repo-push webhook to python. */
async function deliverPushWebhookToPython(): Promise<void> {
  const res = await fetch(`${PYTHON_URL}/webhook/gitea/repo-push`, {
    method: "POST",
    headers: { Authorization: BEARER, "Content-Type": "application/json" },
    body: JSON.stringify({
      repository: {
        full_name: BOOK,
        name: REPO,
        owner: { username: PARITY_USER },
      },
      sender: { username: PARITY_USER },
    }),
  });
  if (res.status !== 200) throw new Error(`webhook delivery: ${res.status}`);
}

describe("parity: cache freshness semantics", () => {
  jest.setTimeout(60000);

  it("out-of-band commit → v2 fresh immediately, python fresh after repo-push webhook, then strict parity", async () => {
    await resetRepo();

    // Warm BOTH caches on the 3-entry base ledger.
    expect(await journalTotal(PYTHON_URL)).toBe(3);
    expect(await journalTotal(V2_URL)).toBe(3);

    // Out-of-band commit straight to Gitea (as a git push would land).
    const file = await giteaGetFile();
    const appended =
      BASE_MAIN +
      '\n2024-02-15 * "Shop" "out-of-band entry"\n' +
      "  Expenses:Misc  20.00 USD\n" +
      "  Assets:Cash  -20.00 USD\n";
    const update = await fetch(
      `${GITEA_URL}/api/v1/repos/${BOOK}/contents/main.bean`,
      {
        method: "PUT",
        headers: giteaHeaders,
        body: JSON.stringify({
          content: Buffer.from(appended, "utf8").toString("base64"),
          sha: file!.sha,
          message: "out-of-band commit (simulated git push)",
        }),
      },
    );
    expect(update.ok).toBe(true);

    // v2: HEAD-SHA keying makes the very next read fresh — no webhook needed.
    expect(await journalTotal(V2_URL)).toBe(4);

    // python: the in-process FavaLedger cache is still warm — production
    // freshness depends on Gitea's repo-push webhook. Deliver it, as Gitea
    // would, then python is fresh too.
    await deliverPushWebhookToPython();
    expect(await journalTotal(PYTHON_URL)).toBe(4);

    // With both caches settled, the full journal must be strictly equal.
    const res = await expectParity({
      operation: "getJournal",
      path: `/journal/${BOOK}`,
    });
    expect(
      (res.normalized as { data: { total: number } }).data.total,
    ).toBe(4);
  });

  it("service-mediated write invalidates the writer's own cache (both services)", async () => {
    // Each service reads (warming its cache), then writes THROUGH ITSELF and
    // must observe its own write on the immediate next read: python via
    // clear()-on-write, v2 via the moved HEAD SHA.
    for (const base of [PYTHON_URL, V2_URL]) {
      await resetRepo();
      // warm this service's cache
      expect(await journalTotal(base)).toBe(3);

      const res = await fetch(`${base}/entries/${BOOK}/bulk`, {
        method: "POST",
        headers: {
          Authorization: userBasicAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entries: [
            {
              type: "note",
              item: {
                date: "2024-03-01",
                account: "Assets:Cash",
                comment: "cache probe",
              },
            },
          ],
        }),
      });
      expect(res.status).toBe(200);
      expect(await journalTotal(base)).toBe(4);
    }
  });
});
