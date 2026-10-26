# Live QA contract

Read this contract when running `qa-find-bugs-dashboard`,
`qa-find-bugs-mobile`, `qa-find-bugs-cli`, or `qa-find-bugs-mcp`. Hunt through the running product,
reproduce the failures, research fixes in this checkout, and deliver evidence
another person can rerun.
This workflow reports and schedules fixes; implementing them is separate work.

Platform setup comes from the individual skill. CLI QA defaults to isolated
local ledgers without login; MCP QA drives the hosted JSON-RPC endpoint with a
designated API key through its own helper; the production URL and
browser/native credential procedures below apply to those clients. For CLI journeys, use fresh processes,
stdout/stderr, exit codes and file effects in place of page reloads, screenshots
and UI state. Compare hosted CLI behavior with REST responses; local operations
use ledger contents and independent calculations as controls.

## Scope and preflight

- Read root and owning-package `AGENTS.md`, plus nested guidance for the code you
  investigate. Record branch, HEAD, initial dirty files, target server, client
  build, account role, and chosen ledger. A local client may use production APIs.
- Use a supplied target; otherwise use `https://beancount.io`. Use
  `QA_EMAIL` / `QA_PASSWORD` for a dedicated QA login. Prefer a ledger with
  synthetic data. The anonymous public control is
  `/ledger/open_ledger/example`; it does not prove authenticated behavior.
- Read `.pm/DO_NOT_DO.md` before proposing follow-up work. Respect deliberate
  feature gates, plan limits, and upstream behavior. Do not enable a feature to
  manufacture a finding.
- Report mode is the default. `wN` requests filing through the repository's `pm`
  skill; `SHIP=1` also requests shipping those findings through `ship`.
  `DRY_RUN=1` overrides both: local evidence and a report, no board writes or push.
  Do not carry a worker number or external product's parity requirements into
  this repository. Its workstreams are general worker queues.

## Credentials and real data

Load credentials only inside a helper process, preferring the repo-root
`./.env` file: run helpers from the repo root with no file flag, and when
`./.env` names the needed variables those win over the ambient environment.
An explicit `--env-file` / `--credentials-file` still wins over both, for
runs that need a different account than the shared one. A file that names
only half of a multi-variable credential fails instead of mixing accounts;
an `./.env` that names none of the needed variables leaves the ambient
environment alone. Never print, `cat`, source with shell tracing,
or paste the values into a tool call. Ask for the file path or missing variable
names, never for the password in chat. Do not search unrelated credential stores.

Keep password submission outside tools that record request bodies or echo code.
From the repo root, use the bundled helper (Node >=20.12):

```sh
node .agents/skills/qa-shared/scripts/qa-login.mjs
```

With no flag the helper prefers `./.env` at the repo root, then the ambient
environment. Pass `--env-file /path/to/.env` only for a run that needs a
different account: an explicit file supplies both QA variables and overrides
`./.env` and any inherited account, and an incomplete file fails instead of
mixing credentials. For a
user-selected deployment, pass its `--server-url`; the default is
`https://beancount.io/`. It authenticates through GraphQL, retains the session
cookie in memory, and prints only a one-use loopback URL that expires after 60s.
Fetch that URL with `page.request.get(url)`, add `(await response.json()).cookies`
to `page.context()`, and navigate to the app. Never return the response/cookies
from the browser snippet. Missing variables/file exit with code 2; errors are
sanitized. Recheck the current auth implementation if its contract changes.

Native sign-in must complete the app's own OAuth/PKCE flow. Do not copy another
simulator's keychain, inject a made-up session, or count a browser login as a
native login. If secure native text entry is needed, have a local helper type
from its environment into a verified, focused secure field; never send the
password as a literal to MCP or put it on the clipboard. The same helper's
`--type-field email` / `--type-field password` modes use Simulator's hardware
keyboard through AppleScript, reading values from the child environment. Verify
the intended field is focused before each call. Capture no credential
entry screen or authentication request body.

Read-only journeys can proceed immediately.

**Standing write authorization (user decision 2026-10-17).** Signed in as the
`QA_*` account, QA runs may write without asking to a *designated disposable
ledger*: one that account owns whose name starts with `qa-` or whose
description marks it synthetic and safe to reset (today
`<qa-owner>/mcp-agent-eval`). Within it, entries, accounts, budgets, files,
uploads and imports may be created, edited and deleted to exercise write
journeys end to end. The rules:

- Before the first write, snapshot every file the run may touch (path and
  content hash, kept under `.tmp/qa-<date>/`) and run the ledger check.
- Prefix every created entry, file, payee, narration or account segment with
  `qa-<yyyymmdd>-` where the format allows, and record each write (commit SHA or
  entry) as it happens.
- Never edit or delete pre-existing content except to restore it.
- At the end, restore each touched file **byte-for-byte** to its snapshot, not
  merely "the added entries removed". `mcp-agent-eval` is also the
  `yarn mcp:agent-eval` fixture (`backend-cluster/backend-v2/docs/mcp-agent-eval.md`),
  whose expected facts depend on exact content. Then verify the hashes and a
  clean ledger check. Extra commits in the ledger's history are acceptable.
  If restoration fails, stop writing and report the exact residue.
- Keep write volume at human pace, and never probe write rate limits against
  production.
- The designated ledger is shared: sibling QA loops may run concurrently.
  Never edit or delete another loop's `qa-`-prefixed probes, and never assume
  count or file-byte baselines hold across a run — re-pin (re-snapshot and
  re-check) before each comparison, and on mismatch re-verify inside the fresh
  window rather than filing the drift as a bug (w23/110).

The authorization does **not** cover: any other ledger (the QA account's other
ledgers, which may hold real data; public `open_ledger/*` ledgers; other
owners' ledgers), ledger rename/delete or visibility changes, collaborators and
invitations, credentials (tokens, SSH keys), bank connections, subscriptions,
billing, account deletion, outgoing email, or flows that spend shared AI quota.
For those, prepare the exact synthetic action and ask once while continuing
read-only work. Outside a designated ledger, an authenticated personal ledger is
not a disposable fixture.

## Journey, triage, and research

1. Complete each selected journey: act, wait for asynchronous work to settle,
   inspect the resulting UI and API, then reload or relaunch to check persistence.
   Capture console/native errors and failed or hanging requests at each failure.
2. Reproduce each candidate from a fresh load. Retry throttling at human pace
   after a short pause. Check the actual route after redirects. Use real
   accessibility names, not DOM text heuristics. An unavailable automation tool,
   stale native binary, development warning overlay, or fixture is not a product
   bug. Never represent a synthetic response as production evidence.
3. Compare UI state with the corresponding GraphQL response, and REST/MCP only
   where that operation exists. Distinguish no data, not found, forbidden,
   unauthenticated, malformed input, and service failure. Avoid interpreting a
   non-browser bot-protection response as an application error.
4. Trace the producer, serializer/schema, and consumer to `file:line`. Read
   governing ADRs and the installed dependency implementation when the mechanism
   depends on a framework. Say what the correct behavior is and why; "make the
   surfaces consistent" is not a fix specification.
5. Search all callers of a shared helper and enumerate affected routes/aliases.
   Verify a working control and explain why it works. Define both loading and
   settled states if a fix changes asynchronous rendering. Similar symptoms need
   independent evidence before sharing a cause. Mark an untraced cause unverified.
6. Search all `.pm/**/*.md`, including `done/`, for distinctive terms and scan
   open milestones in every queue. Extend an overlapping open item through `pm`;
   identify regressions against completed work and recheck its full DoD. Check
   recent and targeted `git log -S` history. A fix already on main is deployment
   lag, not a new implementation task. Record dedupe outcomes even in report mode.

## Finding record and handoff

Use one record per reproduced bug:

```text
Title / Severity: blocker | major | minor
Environment: server, client build/HEAD, device/browser, role, synthetic ledger
Repro: exact route and numbered user actions; repeat result
Expected / Actual: observable values and states
Evidence: verified paths; sanitized request + response or console excerpt
Root cause: file:line and mechanism, or cause unverified
Fix: explicit target behavior; owning package and API surfaces
Blast radius: searched callers, route aliases, working controls
Adjacent states: loading, empty, denied, expired session, network failure
Dedupe: searches, existing item or deployment-lag disposition
Unverified: journeys, causes, platforms not exercised
Estimate: tens of minutes, with uncertainty if cause is unverified
```

Store every scratch file, fixture, and artifact under the gitignored repo-root
`.tmp/qa-<date>/`, addressed by absolute path. Never write a one-off file into
the working directory, a package directory, or the repo root — a QA run leaves
no untracked files behind, and `git status` after the run proves it. Browser MCP
may use a configured output directory instead; pass bare screenshot filenames
there and record the returned actual paths. If no output directory is configured,
point it at an absolute `.tmp/qa-<date>/` path. Verify every cited artifact exists.
Screenshots can be resized: retain their dimensions and do not infer device
coordinates from an assumed pixel ratio. Keep private account data local; public
filings use a synthetic reproducer and sanitized captures. Do not place access
headers, cookies, passwords, or private ledger payloads in reports.

For `wN`, read and apply `../pm/SKILL.md`; it alone writes `.pm/`. Let it own IDs,
sizing (>1h across multiple tasks for a milestone), adoption linkage, and closing
tasks. Include exact repros and text evidence so ignored screenshots are not the
only support. DoD bullets specify successful outcomes from journeys actually
exercised. Give shared-code regression coverage its own task when warranted.

For authorized shipping, read `../ship/SKILL.md`, validate changed files, scan for
secrets, and ship only this run's work. Existing user changes stay out. A branch
restriction in `ship` affects shipping, not independent QA or report preparation.

Finish with findings by severity, a coverage/skips list, dedupe/filing status,
cleanup status, and validation. State whether fixes were implemented and whether
anything was shipped. Restore local device appearance and previously booted
simulators; stop only helper processes started by this run. Report any test
resource left behind precisely.
