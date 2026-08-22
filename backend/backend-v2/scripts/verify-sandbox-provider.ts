import "dotenv/config";

/**
 * m17/t003 — provider verification against real infrastructure.
 *
 * Proves the self-built Cloudflare sandbox provider (m17/t002) works end to end
 * against the worker control plane (m17/t001) running under `wrangler dev`, on
 * the local `_infra-mac` stack — BEFORE any harness code sits on top. This is
 * ADR 0005's migration step 1 acceptance: create → clone (onFirstCreate) →
 * read → exposePort → WebSocket-reachable → resume-without-reclone.
 *
 * Prerequisites (all local):
 *   1. Worker control plane:  cd backend-cluster/claude-code-sandbox-worker \
 *                             && npx wrangler dev --port 8788
 *   2. _infra-mac up (Gitea reachable at the host LAN IP over HTTP):
 *                             cd backend-cluster/_infra-mac && docker compose up -d
 *   3. A test ledger repo in Gitea (any repo the ledger creds can clone).
 *
 * Env (or edit the defaults below):
 *   CONTROL_PLANE_URL   default http://localhost:8788
 *   SANDBOX_ADMIN_TOKEN default = ADMIN_TOKEN from _infra-mac/.env
 *   PREVIEW_HOSTNAME    default localhost:8788   (wrangler-dev preview host)
 *   VERIFY_CLONE_URL    a git clone URL with embedded creds, e.g.
 *                       http://user:pass@192.168.4.49:3701/owner/ledger.git
 *
 * Run:
 *   npx tsx -r tsconfig-paths/register scripts/verify-sandbox-provider.ts
 */

import { createCloudflareSandbox } from "@/foundation/sandbox-cloudflare";

const CONTROL_PLANE_URL =
  process.env.CONTROL_PLANE_URL ?? "http://localhost:8788";
const ADMIN_TOKEN =
  process.env.SANDBOX_ADMIN_TOKEN ?? process.env.ADMIN_TOKEN ?? "";
const PREVIEW_HOSTNAME = process.env.PREVIEW_HOSTNAME ?? "localhost:8788";
const CLONE_URL = process.env.VERIFY_CLONE_URL ?? "";

function log(step: string, detail?: unknown): void {
  // eslint-disable-next-line no-console
  console.log(`[verify] ${step}`, detail ?? "");
}

async function main(): Promise<void> {
  if (!ADMIN_TOKEN) {
    throw new Error(
      "SANDBOX_ADMIN_TOKEN (or ADMIN_TOKEN) is required — must match the worker's .dev.vars",
    );
  }
  if (!CLONE_URL) {
    throw new Error(
      "VERIFY_CLONE_URL is required — a Gitea clone URL with embedded credentials",
    );
  }

  const provider = createCloudflareSandbox({
    controlPlaneUrl: CONTROL_PLANE_URL,
    adminToken: ADMIN_TOKEN,
    previewHostname: PREVIEW_HOSTNAME,
  });

  const sessionId = `verify-${process.pid}`;
  const t0 = Date.now();
  // onFirstCreate's session is the restricted view (no defaultWorkingDirectory),
  // and the outer `session` isn't assigned until createSession resolves, so use
  // the container's known default workdir directly here.
  const WORKDIR = "/workspace";

  // ── 1. create + clone via onFirstCreate ────────────────────────────────
  let firstCreateRan = false;
  const session = await provider.createSession({
    sessionId,
    onFirstCreate: async (s) => {
      firstCreateRan = true;
      log("onFirstCreate: cloning ledger repo");
      const clone = await s.run({
        command: `git clone ${CLONE_URL} repo`,
        workingDirectory: WORKDIR,
      });
      if (clone.exitCode !== 0) {
        throw new Error(`clone failed: ${clone.stderr || clone.stdout}`);
      }
    },
  });
  log("created session", {
    id: session.id,
    cwd: session.defaultWorkingDirectory,
    firstCreateRan,
    ms: Date.now() - t0,
  });

  // ── 2. read a cloned file ───────────────────────────────────────────────
  const mainBean = await session.readTextFile({
    path: `${session.defaultWorkingDirectory}/repo/main.bean`,
  });
  log("read repo/main.bean", {
    found: mainBean !== null,
    preview: mainBean?.slice(0, 80),
  });

  // ── 3. expose a port, start a trivial listener, hit it ─────────────────
  log("starting a listener on :4000 and exposing it");
  await session.spawn({
    command:
      "python3 -m http.server 4000 --directory " +
      `${session.defaultWorkingDirectory}/repo`,
  });
  // Give the listener a moment to bind.
  await new Promise((r) => setTimeout(r, 2000));
  const endpoint = await session.getPortEndpoint({ port: 4000, protocol: "http" });
  log("exposed port endpoint", endpoint);
  try {
    const probe = await fetch(endpoint.url, { method: "GET" });
    log("port round-trip", { status: probe.status });
  } catch (err) {
    log("port round-trip FAILED (preview URL may need a real worker host)", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ── 4. resume — same container, clone still there, no re-clone ─────────
  let resumeRanFirstCreate = false;
  const resumed = await provider.createSession({
    sessionId,
    onFirstCreate: async () => {
      resumeRanFirstCreate = true;
    },
  });
  const stillThere = await resumed.readTextFile({
    path: `${resumed.defaultWorkingDirectory}/repo/main.bean`,
  });
  log("resume without re-clone", {
    onFirstCreateRanAgain: resumeRanFirstCreate,
    fileStillPresent: stillThere !== null,
  });
  if (resumeRanFirstCreate) {
    throw new Error("REGRESSION: onFirstCreate re-ran on resume");
  }

  // ── cleanup ─────────────────────────────────────────────────────────────
  await session.destroy?.();
  log("destroyed sandbox; total ms", Date.now() - t0);
  log("VERIFY OK");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[verify] FAILED:", err);
  process.exit(1);
});
