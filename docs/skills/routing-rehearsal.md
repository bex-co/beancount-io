# Skill routing rehearsal

This record covers real Claude Code and Codex sessions choosing a skill for each
prompt in the suite routing set ([`evals/routing.json`](../../scripts/skills/routing.json)).
It is separate from the deterministic checks: `scripts/ci-check.py` validates
the set itself, and no client runs in CI. Every prompt and the ledger are
synthetic, and no hosted ledger was used.

## Method

- Runner: [`scripts/run-routing.py`](../../scripts/skills/run-routing.py). Each client
  gets a scratch Git repository in the system temp directory, outside this
  repository, with a small synthetic ledger and every `beancount-*` skill linked
  into `.claude/skills` and `.agents/skills`, as the installer links them.
- Claude Code: `claude -p --output-format stream-json --strict-mcp-config`, with
  Edit/Write disallowed. The choice is the first `Skill` tool call.
- Codex: `codex exec --json --sandbox read-only`. Codex has no skill tool, so
  the choice is the first command that names `<skill>/SKILL.md` and prints that
  skill's `name:` frontmatter. The client stops at its first choice; a session
  that exits successfully without one chose no skill. A nonzero exit without
  a choice is an error, including startup failures reported only on stderr.
- A skill outside the suite counts as `none`. Each client's own user-level
  skills still load, as they would for a customer. On this machine that
  includes `dont-code-but-answer`, which Codex chose for the `bea ask` question.
- Each prompt runs once per run. Codex results vary between runs, so the
  baseline is two runs.

Reproduce with `python3 scripts/skills/run-routing.py --codex-model <model>`.
Results land in `scripts/skills/tmp/routing/<UTC stamp>/` (gitignored).

## Codex startup blocker — 2026-11-04

The w2 Codex rerun was attempted against source baseline `48b472185`, with
Codex CLI and the running app server both at 0.166.0, on macOS arm64. The suite
has fourteen skills and the current routing set has 128 prompts. No new model
turn or behavior-eval result was obtained.

The one-prompt preflight was:

```zsh
python3 scripts/skills/run-routing.py --clients codex --codex-model gpt-6-luna \
  --only ask-groceries-last-month --jobs 1
```

The client exited with status 1 before emitting any JSON event:

```text
Error: thread/start: thread/start failed: failed to load configuration: Failed to synchronize managed preferences (code -32600)
```

An independent `codex exec --json --sandbox read-only --skip-git-repo-check
-m gpt-6-luna 'Reply with OK.'` probe and `codex app-server
--print-startup-config` failed at the same configuration stage. The latter
returned `reason: configLoad` and the same detail. `codex login status` reported
ChatGPT authentication; `codex doctor --summary` loaded configuration and
reported matching CLI/server versions, but also reported an unreachable runtime
CDN and a failed Responses WebSocket check. These diagnostics do not establish
the cause of the managed-preferences error or the account's current quota.
Neither a no-daemon invocation nor an invocation that ignored user configuration
resolved the startup failure. No authentication, managed policy, or persistent
user settings were changed.

The runner previously discarded stderr and treated this process exit as `none`.
It now records the nonzero exit and a bounded stderr tail as an error. Regression
tests reproduced the misclassification before the fix and pass afterwards;
they also cover a failure with no stderr, large stderr output, and a successful
session with a harmless warning. Stopping after a detected skill remains a
successful routing observation.

Validation with Python 3.12.10 and the checkout CLI first on `PATH`:
`ci-check.py` passed, `test_ci_check.py` passed all 44 tests, and
`test_beancount_skills.py` passed all 181 tests with three Windows-only skips.
That last run includes all 20 routing-runner tests. The tracked working-tree
publication snapshot passed the repository's gitleaks configuration.

The preserved local probe results are under
`scripts/skills/tmp/w2-codex-20261104/` (gitignored). The original `probe` run's
`none` result is invalid; `probe-fixed` correctly records `error`. No description
was changed on this evidence, and no full routing or behavior run was launched
after the shared startup blocker was established.

The following Codex acceptance checks remain unverified:

| w2 item | Required Codex evidence |
| --- | --- |
| 083 | A linked-install session successfully reads the shared `bea-cli.md`. |
| 086 | All 25 non-English routing prompts. |
| 089 / m40/t010 | Add eval 10 preserves the existing entry and waits for confirmation. |
| 090 | The manual-entry addition and the revised first-month journey on both clients. |
| 094 / m41/t005 | Importer-author eval 5 asks before encoding malformed-row handling; the rewrite's high-risk evals. |
| m42/t007 | One routing prompt from an upgraded installation. |
| m43/t005 | The first-query answer from both supported channel installs. The separate owner decision in t003 still applies. |
| m44/t003, t006 | The plugin first query, including reading the shared contract. |
| m45/t006 | Trade evals 1–8 and routing. |
| m48/t004 | All 22 reconcile and 9 close evals, including confirmation turns. |
| m49/t003 | Ask evals 10–13 and routing. |
| m50/t005 | Trade evals 9–10, import evals 16–20, and routing. |
| m51/t006 | Property evals 1–7 and routing. |
| m52/t004 | Trade evals 11–14 and routing. |
| m53/t003 | All eight first-year journey checkpoints. |

The old November 17 quota-reset estimates are historical evidence, not a
verified current unblock condition. First restore a working Codex startup in
the operator's environment, then establish model/quota availability with a
successful preflight and perform each pending acceptance check. m47 remains
behind m40; m59 remains behind m48 and w3/m58. Owner decisions and production
deployment blockers elsewhere in w2 are unaffected.

## Linux Codex execution restored — 2026-11-08

The macOS CLI 0.167.0 still fails during managed-preferences synchronization.
A separate Linux arm64 client now completes model turns and sandboxed shell
commands with the same ChatGPT account and `gpt-6.1-sol`. The historical
November 17 quota-reset estimate no longer blocks this account's evaluations.
Pending checks still require their own real-client evidence; a working runtime
does not complete them automatically.

Environment: source `50f089477`, suite 0.4.26 (sixteen customer skills), official
`@openai/codex@0.167.0` Linux arm64 package, Debian 13, and a wheel built from
the checkout's CLI, reporting `bea` 0.3.1. Its managed engine was provisioned
before the trials. `/usr/local/bin/bea` and `uv` remain discoverable from login
shells. This source wheel includes unreleased fixes: the published-0.3.1
limitations in Version notes still apply to the published release.

Each trial uses a fresh synthetic Git workspace, the installer's links to the
customer suite, a writable workspace mount and read-only suite mount, and its
own temporary Codex state. Only the existing Codex credential file is supplied;
it is copied to container tmpfs, never included in the image, workspace,
publication or logs. A legitimate refresh is preserved in the client's usual
store only while the host credential remains unchanged. Containers are removed
after their trials. No service stack or database is started.

Docker's default seccomp profile prevented Bubblewrap from creating namespaces.
The task-specific profile retains the [Moby default policy](https://github.com/moby/profiles/blob/main/seccomp/default.json)
(downloaded SHA256 `6416b47770785a41ac59073cdc77d9fe98517df2799dc83ef207e622de3053f6`),
adding user-namespace `clone`, namespace-only `unshare`, and the mount,
`umount2`, `pivot_root` and `setns` calls needed by Bubblewrap. It grants no
additional container capabilities. Codex runs its normal native sandbox with
`--sandbox workspace-write`, or `read-only` for read-only probes. A direct
filesystem test established all three outcomes: read-only rejects a workspace
write, workspace-write permits a workspace write, and workspace-write rejects
a write to an otherwise writable directory outside the workspace. Each check
compares the resulting files and fails on an unexpected exit or mutation.

Local implementation and evidence are under
`scripts/skills/tmp/w2-codex-linux/` (gitignored). Early trials with a missing
`bea` in the login-shell PATH were discarded as harness failures. Scored runs
use the corrected image and real tool execution. The first completed behavioral
retest is [add eval 10](add-rehearsal.md#codex-eval-10-rerun--2026-11-08).

## Baseline — 2026-10-18

- Revision `bd8106f8f` (descriptions as of `4554ba440`). macOS 26.5.1, arm64.
- Claude Code 2.1.289 (`claude-opus-5-5`, the client default). Codex CLI
  0.163.0 with `gpt-6-luna`. The configured Codex default model is rejected for
  this ChatGPT account, so the runs pass `--codex-model gpt-6-luna`.
- Two full runs: 2026-10-18T23:57Z and 2026-10-19T00:00Z UTC.

| Client | Run 1 | Run 2 |
| --- | --- | --- |
| Claude Code | 47/48 | 47/48 |
| Codex | 43/48 | 45/48 |

Every misroute:

| Prompt id | Expected | Claude Code | Codex |
| --- | --- | --- | --- |
| `none-hosted-reconcile` | none | beancount-reconcile (both runs) | beancount-reconcile (both runs) |
| `none-hosted-dining-spend` | none | correct | beancount-ask (both runs) |
| `none-hosted-close-month` | none | correct | beancount-close (both runs) |
| `none-operating-currency-option` | none | correct | beancount-import (run 1 only) |
| `author-schwab-importer` | beancount-importer-author | correct | none (run 1 only) |

What the baseline shows:

- **Hosted ledgers are the consistent failure.** Five of the six hosted-prompt
  results across both clients picked a local skill. No description says the
  skills work only on local files, and Codex read the local skill in every
  run.
- **The name collisions the review predicted did not misroute here.** In both
  runs on both clients, closing one account (`close` directive), ledger
  `option` settings and options education, `bea ask` and documentation
  questions, and single manual entries all route to no suite skill. The one
  `option` miss went to `beancount-import`, not to `beancount-options`.
- **Codex has run-to-run noise.** Each single-run miss is one result out of
  two.

The first attempt at this baseline counted any Codex command naming a
`SKILL.md` as a choice, including searches for a guessed sibling path. It
reported misses that did not reproduce, so it was discarded, and the detector
now requires the skill's frontmatter in the command output.

## After description changes — 2026-10-19

- Revision `780c8094d`: the skip clauses and phrasings of `41d8298f2`, and
  the local-only scope and hosted-ledger hand-off of `780c8094d`. Same
  machine, clients, and models as the baseline.
- Two full runs: 2026-10-19T00:21Z and 00:25Z UTC.

| Client | Baseline runs | After runs |
| --- | --- | --- |
| Claude Code | 47/48, 47/48 | 48/48, 48/48 |
| Codex | 43/48, 45/48 | 47/48, 46/48 |

Fixed in both after runs: `none-hosted-reconcile` on Claude Code;
`none-hosted-dining-spend`, `none-operating-currency-option`, and
`author-schwab-importer` on Codex.

Remaining Codex misses, each in one of the two runs:

| Prompt id | Expected | Codex chose | Cause |
| --- | --- | --- | --- |
| `none-hosted-close-month` | none | beancount-close | Codex opens the local skill, which then hands the hosted ledger off (below). |
| `none-hosted-reconcile` | none | beancount-reconcile | Same. |
| `migrate-new-ledger-from-monarch` | beancount-migrate | beancount-init | One command opened `beancount-init` and then `beancount-migrate`, the skill it composes. The runner now records every skill such a command opens and scores the expected one among them, so this is not a regression. |

Three more Codex runs of these four prompts, after the scoring change: the
migration prompt routed 3/3, and the hosted prompts routed to no suite skill
in 6 of 9 results. Followed to the end, a Codex session that opened
`beancount-reconcile` for "My books live on Beancount.io (MCP connected)"
replied that the skill excludes hosted ledgers. With no Beancount.io tools in
the session, it asked the user to reconnect the MCP server and did not use
the local synthetic ledger. Opening a skill to read its scope counts as a miss
here, but the outcome is the hand-off the skill prescribes.

No prompt that routed correctly in both baseline runs misroutes in the after
runs on either client.

## Proposed renames — 2026-10-19

A scratch copy of the suite at `434d05084` renamed `beancount-options` →
`beancount-options-trades`, `beancount-close` → `beancount-close-month`, and
`beancount-ask` → `beancount-query` (directories, `name:`, and cross-references;
the persisted `;; beancount-options config` header unchanged), with the routing
set relabeled to match. Two runs per client, 2026-10-19T01:05Z and 01:09Z UTC,
compared with the two after runs above under the current names:

| Prompt group | Claude Code, current → renamed | Codex, current → renamed |
| --- | --- | --- |
| `close`/`option` collisions (7) | 7/7, 7/7 → 7/7, 7/7 | 7/7, 7/7 → 7/7, 7/7 |
| close and options positives (6) | 6/6, 6/6 → 6/6, 6/6 | 6/6, 6/6 → 6/6, 6/6 |
| ask/query positives (5) | 5/5, 5/5 → 5/5, 5/5 | 5/5, 5/5 → 5/5, 5/5 |
| ask/query near-misses (4) | 4/4, 4/4 → 4/4, 4/4 | 4/4, 4/4 → 4/4, 4/4 |
| all 48 | 48, 48 → 48, 48 | 47, 46 → 44, 46 |

The new names change nothing measurable for the prompts they were meant to
help: every collision prompt already routes correctly under the current names
on both clients. Codex's lower renamed total comes from prompts unrelated to
the renamed skills (`reconcile-one-account-june` → none and
`none-dinner-on-amex` → beancount-import, one run each, plus the known hosted
prompts), which is within its run-to-run variation. A rename would therefore be
for readability in `/` menus and catalogs, not for routing.

## Draft `beancount-add` — 2026-10-19

A scratch copy of the suite at `1ef07d812` plus a draft `beancount-add`
(description only), with the routing set extended to 53 prompts: the five
manual-entry prompts that were `none` (a dinner, rent, opening an account,
and closing one account two ways) relabeled to `beancount-add`, four new
positives (a transfer, a split receipt, a price, a paycheck), one hosted
near-miss, and `beancount-add` added as a confusable sibling of an import, an
options, a reconcile, a close, and an edit prompt. Two runs per client,
2026-10-19 UTC.

| Client | Run 1 | Run 2 |
| --- | --- | --- |
| Claude Code | 53/53 | 53/53 |
| Codex | 53/53 | 52/53 (`none-hosted-reconcile`, the known hosted miss) |

Every manual-entry prompt routed to the draft on both clients, including
both `close`-directive prompts, and no sibling lost a prompt it owned.

## `beancount-add` description after its evals — 2026-10-19

The eval round added "it never changes existing entries" to the description.
Two runs per client against the live suite: Claude Code 53/53 twice (draft:
53/53 twice); Codex 52/53 and 51/53 (draft: 53/53 and 52/53). Codex's new
single-run misses, `none-what-is-bea-ask` → beancount-ask and
`author-ally-headers-broke` → none, are unrelated to this skill and routed
correctly in four further Codex runs each; the third miss is the known
`none-hosted-reconcile`.

## Sibling hand-offs to `beancount-add` — 2026-10-19

The import, reconcile, options, ask, and close descriptions now name
`beancount-add` for single entries; ask also skips option pricing and greeks.
Claude Code routed 53/53 in both final runs. Codex routed 51/53 in the first
(`none-what-is-bea-ask` and `none-hosted-close-month`, both seen before). The
second Codex run stopped at the account's usage limit after 45 prompts, with
only the known `migrate-new-ledger-from-monarch` and `none-hosted-reconcile`
misses among them. In targeted Codex reruns, `none-what-is-bea-ask` and
`none-fix-payee-typo` routed correctly 4/4. `none-options-greeks` opened
`beancount-ask` in three of nine runs across the hand-off change and the
ask skip clause that followed, against none in ten earlier runs, so it is
recorded as Codex-variable rather than settled.

## Non-English prompts — 2026-10-19

The set gained 25 prompts (`i18n-*`): one ask, one import, one add, one
reconcile, and one hosted hand-off (`none`) each in Chinese, Japanese,
German, Spanish, and French, mirroring the English entries they parallel.
One run at `f060180cd` against the live suite: Claude Code 2.1.289
(`claude-opus-5-5[1m]`) routed 25/25 as labeled, including all five hosted
prompts to no skill, so no description gained non-English trigger words.
Codex 0.163.0 (`gpt-6-luna`) returned errors for all 25 — its account
usage limit ("try again at Nov 17th, 2026") plus connection failures under
parallel jobs — so Codex has not routed these prompts yet. Rerun the
`i18n-*` entries on Codex when usage returns before treating non-English
routing as settled on both clients (tracked in w2/086).

## `beancount-trade` added — 2026-10-19

Before (w2/m45/t001 probe, no trade skill): "Record that I bought 10
shares of VTI at $250 in my Roth", "I sold some bitcoin, record the
gain", and "Record my RSU vest" all opened `beancount-add` on Claude
Code. After `beancount-trade` landed (w2/m45/t002), the same three
prompts — now routing entries `trade-buy-vti-roth`,
`trade-sell-bitcoin-gain`, `trade-rsu-vest` — plus three neighbors
(`trade-ask-performance` → ask, `options-sell-csp` → options,
`add-close-amex-account` → add) routed 6/6 as labeled on Claude Code
2.1.289 (`claude-opus-5-5[1m]`). Codex has not run them (account usage
limit until 2026-11-17); w2/m45/t006 reruns the set there before the
milestone claims both-client routing.

## Full set after `beancount-trade` wiring — 2026-10-19

The set gained the three remaining positive trade prompts
(`trade-cash-dividend`, `trade-stock-split`, `trade-lot-transfer`), 90
prompts in all, against the live suite at `372ecea20` (sibling
descriptions naming `beancount-trade`). One run,
2026-10-19T21:17:06Z: Claude Code 2.1.289 routed 90/90 as labeled —
every label at precision and recall 1.00, `beancount-trade` 6/6, no
sibling lost a prompt. Codex 0.163.0 (`gpt-6-luna`) errored on the one
attempted trade prompt: "You've hit your usage limit… try again at Nov
17th, 2026 3:36 PM" (same verbatim error from a bare `codex exec`
probe). Codex has still routed none of the trade prompts; w2/m45/t006
reruns the full set there when usage returns.

## Holdings questions in `beancount-ask` — 2026-10-19

`beancount-ask`'s description gained "holdings" and an explicit
investment-or-tax-advice skip (w2/m49/t001–t003), and the set gained
`ask-holdings-worth` (→ ask) and `none-sell-for-tax-benefit` (→ none),
92 prompts in all. One run, 2026-10-19T23:52:41Z, against the live
suite: Claude Code 2.1.289 routed 92/92 as labeled (ask 12/12, none
19/19). Codex has not run the new entries (account usage limit until
2026-11-17); w2/m49/t003 reruns there.

## Bulk investment intake — 2026-10-20

w2/m50 changed `beancount-import`'s description (broker activity) and
added `trade-batch-paycheck-buys`, `import-exchange-activity`, and
`import-opening-lots`; 95 prompts in all. One run,
2026-10-20T00:36:44Z: Claude Code 2.1.289 routed 95/95 as labeled
(trade 7/7, import 15/15). Codex has not run the new entries (usage
limit until 2026-11-17); w2/m50/t005 reruns there.

## `beancount-property` added — 2026-10-20

The suite gained an eleventh skill (w2/m51) and five routing entries
(`property-buy-house`, `property-mortgage-payment`,
`property-sell-rental`, `property-rent-received`, and the tenant-rent
near-miss `property-add-rent-payment` → add); 100 prompts in all. One
run, 2026-10-20T01:17:50Z: Claude Code 2.1.289 routed 99/100 —
`beancount-property` 4/4, the one miss an older entry,
`none-sell-for-tax-benefit` → beancount-ask, which routed correctly
in the previous full run and in 3/3 targeted reruns the same day, so
it is recorded as run variance rather than settled either way. (When
ask does open for that prompt shape its answer is figures-only with
advice declined — w2/m49/t003's eval 13 — so the miss costs a route,
not a wrong action.) Codex has not run the property entries (usage
limit until 2026-11-17); w2/m51/t006 reruns there.

## Crypto-native events in `beancount-trade` — 2026-10-20

Trade's description gained swaps and staking/airdrop receipts
(w2/m52), and the set gained `trade-swap-crypto`,
`trade-staking-rewards`, and `none-live-crypto-price`; 103 prompts.
One run, 2026-10-20T01:39:08Z: Claude Code 2.1.289 routed 102/103.
The new entries routed as labeled; the one miss is m50's
`import-opening-lots` → none, correct in its own full run and in 3/3
targeted reruns — variance, recorded as not settled. Codex reruns
with w2/m52/t004 when usage returns (2026-11-17).

## Thirteen-skill native comparison — 2026-10-20

The before suite is `ac95106709fbcbdc9214048c75af258e2a9b71f2` (eleven skills, 103 prompts). The after snapshot is `2900080edb47ec810a7c2c087fe19936e5e01bf2` (thirteen skills), with those same 103 prompts plus ten roll-forward, accrual, variance, and near-miss prompts. All thirteen after descriptions still match the shipped body-fix commit `1537bc6bd`; the original eleven descriptions are identical between before and after. The tracked routing set now matches the scratch 113-prompt set exactly.

Codex CLI 0.163.0 ran with explicit `gpt-6.1-sol`. The runner used real native clients in synthetic workspaces and stopped at the first observed skill read. A user-level skill outside this suite counts as `none`, with its actual name retained in results.

| Measure | Before 1 | Before 2 | After 1 | After 2 |
| --- | --- | --- | --- | --- |
| Raw cohort, including infrastructure errors | 96/103 | 97/103 | 108/113 | 106/113 |
| Infrastructure errors | 2 | 3 | 1 | 2 |
| After replacing only failed infrastructure attempts with actual retries | 98/103 | 100/103 | 109/113 | 108/113 |
| Same 103 original prompts after those retries | 98/103 | 100/103 | 99/103 | 98/103 |
| Ten new prompts | — | — | 10/10 | 10/10 |

The ten additions cover two roll-forward positives, an accrual-drafting positive, missing-payment and single-entry near misses, two variance questions routed to `beancount-ask`, an ordinary paid-rent entry routed to `beancount-add`, and two historical-balance lookups routed to `beancount-ask`. Both after cohorts route all ten correctly.

The original harness treated native `Reconnecting... 2/5 (...)` notices as immediate failures. Eight such infrastructure observations were retained separately and retried after the runner was corrected to wait for native recovery. Only those eight cases were retried, with at most two native calls running; all eight then selected the expected skill. These replacements are recorded in separate `resolved-results.json` artifacts, preserving the initial failures and their source results.

### Every remaining routing difference

| Prompt | Before 1 / 2 | After 1 / 2 |
| --- | --- | --- |
| `import-pdf-no-csv` | external `pdf` / import | external `pdf` / external `pdf` |
| `import-pdf-record-rows` | external `pdf` / import | external `pdf` / external `pdf` |
| `import-pdf-credit-union` | external `pdf` / external `pdf` | external `pdf` / external `pdf` |
| `reconcile-amex-pdf` | external `pdf` / external `pdf` | external `pdf` / external `pdf` |
| `import-opening-lots` | trade / import | import / import |
| `none-hosted-close-month` | none / close | none / none |
| `reconcile-add-missing-assert` | reconcile / reconcile | reconcile / import |

The sole prompt correct in both before cohorts with an after miss is `reconcile-add-missing-assert`. Three additional native turns per side all chose `beancount-reconcile` (6/6). Its one after miss therefore did not reproduce in the targeted comparison.

Three additional paired native turns per side were run for each of `import-pdf-no-csv` and `import-pdf-record-rows` (12 calls, no infrastructure errors). For each prompt, before selected `beancount-import` 1/3 times and external `pdf` 2/3 times; after selected external `pdf` all 3/3 times. Including the original cohorts, each prompt is before 2/5 versus after 0/5 on the first-open metric. Both suites encounter the external-PDF collision, but the after sample is consistently worse and remains an investigation item. Import already explicitly supports PDF statement recording in its unchanged description and body. Because this runner stops at the first skill open, these observations do not establish whether the generic PDF helper would subsequently return to the ledger workflow.

The common-prompt aggregate remains 198/206 before versus 197/206 after. The first-open result is worse for the two PDF prompts; the composition controls below test the subsequent workflow separately and do not alter these scores.

### Provenance and limits

The first three cohorts were interrupted by orchestration cleanup. Native runner console output preserved 36 before-1 choices, 27 before-2 choices, and 28 after-1 choices. Those observations retain prompt IDs and raw selected skill names; their original native shell-command evidence and per-prompt elapsed times are unavailable. Only the remaining 67, 76, and 85 prompts were resumed against the same snapshots and model. The fourth after cohort completed uninterrupted. The first three totals are combined cohort observations, rather than uninterrupted full native traces.

Initial work began at 21:40:31 UTC. The resumed phases completed at 22:01:50, 22:02:55, and 22:04:23 UTC. The uninterrupted after cohort ran from 21:44:57 through 22:04:28 UTC. The six targeted reconciliation turns ran from 22:01:50 through approximately 22:02:48 UTC. The eight infrastructure retries ran from 22:04:29 through 22:05:14 UTC. The twelve paired PDF target calls ran from 22:07:34 through 22:08:36 UTC. Normal runners used two concurrent calls; the second before resume used four, and the retry phase used at most two calls total.

Claude Code 2.1.304 was probed once against the current suite. Its observed default model was `claude-opus-5-5`; the real 3.4-second call returned `You've hit your weekly limit · resets 10am (America/Los_Angeles)` before a usable choice. Full Claude before/after routing remains unverified for this change. A separate native probe with the documented `sonnet` alias received the same account-level limit; no new login or account configuration is needed.

Scratch evidence: `setup.json`, `comparison.json`, `extra-prompts.json`, the four cohorts' raw and resolved results, preserved console logs, targeted result folders, and `infrastructure-retry-status.json`. All are under `scripts/skills/tmp/w6-m6-resume/routing/`.

### PDF helper composition controls

Two additional full native Codex turns used the thirteen-skill suite with the original prompts, synthetic statement PDFs and fresh ledgers. They ran on Codex 0.163.0, `gpt-6.1-sol`, client-default reasoning, from 22:13:40 through 22:16:43 UTC. The only prompt addition was the setup fact giving the absolute published `bea` 0.3.1 executable. No desired skill or expected result was supplied. Unlike routing probes, these turns continued past the first skill read.

| Original prompt | Ordered initial skill reads | Observed result |
| --- | --- | --- |
| `Record the transactions in ./may-statement.pdf in my ledger.` | external `pdf`, then `beancount-import` | Three rows, zero duplicates; next-day assertion 2026-06-01 |
| `Import my June statement PDF into my ledger — my bank has no CSV export.` | `beancount-import`, then external `pdf` | Three rows, zero duplicates; next-day assertion 2026-07-01 |

Both turns extracted salary +2,000 USD, groceries −50 USD and gas −25 USD, ran real ledger checks/queries through published `bea`, and checked the Decimal tie-out 1,000 + 1,925 = 2,925 USD. Their final responses presented the proposed import, flagged categories for confirmation, and explicitly left saving pending consent and a writable session. Both ledger hashes remained `df59249f92b00463a8c07a1daed5032eace50c1e18644a61b43d213c7c7f45e4`; the PDF hashes also stayed unchanged. May initially queried a nonexistent `units` column and recovered to `position`; the failed attempt is retained in its trace.

These are composition controls, not completed write journeys: both sessions were read-only, and no approval or write was tested. Both agents also traversed ancestor `AGENTS.md` files despite their fresh nested Git roots; May read an older eight-skill catalog in the original checkout. The first two skill reads occurred before those ancestor reads, so the helper/import ordering is directly observed, while the later proposal has that additional instruction-context limitation. The controls show that opening the generic PDF helper can lead into the customer ledger workflow; they do not erase the poorer first-open sample or satisfy the missing Claude comparison. No customer description or routing scoring rule was changed to force a pass.

Raw JSONL, final responses, exact prompts and before/after ledger snapshots are retained under `scripts/skills/tmp/w6-m6-resume/composition-runtime/runs/{may,june}/`, alongside setup/status and the synthetic PDFs under `composition/`. Temporary package/runtime caches were removed after both turns completed. Together with the preserved routing artifacts, this supports the next client/adoption review without claiming a regression-free routing gate.

### Restored Claude comparison — 2026-10-21

At 19:13 UTC a bounded default-native discovery turn succeeds and lists all
thirteen customer skills. Claude Code is now **2.1.306**, observed default
`claude-opus-5-5`; no model, authentication or persistent configuration override
is passed. The earlier weekly-limit refusal remains historical evidence and no
longer blocks this client check.

Two native cohorts run at 19:16–19:23 UTC with the existing runner, two concurrent
turns per cohort, strict process-local MCP isolation and editing tools disabled.
Before uses archived accepted source `ac9510670`, eleven skills and 103 prompts.
Current uses `fae10abc6` / suite 0.3.6, thirteen skills and all 113 prompts. Each
cohort records its actual suite path separately from the runner checkout's
revision. Labels and first-open scoring are unchanged.

| Claude cohort | Correct first-open choices | Infrastructure errors |
| --- | ---: | ---: |
| Before, common 103 | 102/103 | 0 |
| Current, common 103 | 103/103 | 0 |
| Current, ten additional prompts | 10/10 | 0 |
| Current, full set | 113/113 | 0 |

The sole before miss is `none-sell-for-tax-benefit`, which opens ask instead of
none; current chooses none. Financial PDF cases choose their expected import
or reconcile workflow in both Claude cohorts.
No new current-only regression appears in this one Claude comparison. This does
not erase Codex's separately measured PDF first-open loss: each affected prompt
remains 2/5 before versus 0/5 after, with successful full-turn composition
controls recorded above under a different metric.

The first 0.3.7 body-control snapshot changes only accruals/close instructions
and eval expectations. Its thirteen frontmatter blocks are verified
byte-identical to the measured 0.3.6 inputs. The later import, migrate, reconcile and ask description repairs
have separate paired and full routing controls; the 113/113 result above is not
substituted for that changed description's evaluation. The [client release
record](./client-release-controls-20261021.md) distinguishes both snapshots and
their native evidence.

Evidence is retained in the original checkout's ignored
`scripts/skills/tmp/w6-m6-claude-retry-20261021T1912/`: archived suites, exact
prompts, raw events, cohort results, runner status and source maps. Relocation
outside the active ship worktree preserves all 51 raw event/final/stdout/stderr/
result hashes. Runtime caches and hash-map false positives are isolated without
adding a secret-scan exemption.


### Description repairs on 115 requests — 2026-10-21

The unchanged first-open scorer and all original 113 prompt/label objects are
retained. Two new `none` controls distinguish standalone PDF table extraction
and scanned-document merging from a ledger import. The complete set is
SHA-256 `3f0cfc54d18cc38913c72af94af693922b1dc4c92581b93cd78b026a2b461e4f`.
Native clients use their configured defaults: Claude Code 2.1.306,
`claude-opus-5-5[1m]`, and Codex 0.163.0, `gpt-6.1-sol / xhigh`. Each model has
at most two simultaneous calls. Source freezes, raw opaque events, commands,
first tool/skill reads and all unsuccessful observations are preserved; model
reasoning is not reviewed.

| Candidate | Target after: Claude / Codex | Complete after: Claude / Codex | Result |
| --- | --- | --- | --- |
| 1, import ordering | 6/6 / 2/6 (one repetition) | Not run | New record-rows miss; retained and rejected |
| 2, ledger guide before PDF helper | 6/6 / 6/6 twice | 115/115 / 114/115, 113/115 | New migration/init and opening-lots/trade misses; rejected |
| 3, migration owns new-ledger history | 16/16 / not run | 115/115 / not run | Codex held before calls because its target set omitted the new broker boundary |
| 4, combined import/migrate/reconcile boundaries | 22/22 / 22/22 twice | 114/115 / 115/115 twice | New Claude tax-advice/ask miss; rejected |
| 5, explicit factual intent for ask | 14/14 / 14/14 twice | Claude115/115 resolved after timeout recovery; Codex115/115 twice | Final candidate accepted; original failures retained |

Candidate2's Claude before115 is explicitly composite: the frozen113 cohort
plus two added generic-PDF before rows. Its Codex before115 similarly combines
the prior113 cohorts with the two new rows; earlier orchestration/raw gaps
remain qualified above. Later candidates reuse exact complete preceding-cohort
rows as their before observations, preserving every miss. Target improvements
never replace a failed complete cohort.

The final intended changes preserve accounting bodies and helpers: import
establishes ledger policy before PDF extraction and owns broker export/opening
lot files; migrate owns finance-app history even when it needs a fresh ledger;
reconcile establishes account-comparison policy before PDF extraction. Ask
supports explicit ledger facts and does not select itself merely to gather
preliminary inputs for buy/sell or tax recommendations. These are measured
boundaries, not hidden helpers or changed labels.

A predeclared six-pair diagnostic on candidate3/candidate4 chooses none in all
twelve tax-advice turns. It does not replace candidate4's actual114/115 result
or satisfy the rule requiring a correction before shipping. Candidate5 changes
ask's description and starts a new paired target/full measurement. Its Claude
target improves the exact candidate4 rows from13/14 to14/14, zero errors. Codex stays14/14 before and after in both target repetitions, also zero errors.
The [client release record](./client-release-controls-20261021.md) gives source
hashes, times, individual failures and separate body-control evidence.

Evidence remains in the original checkout's ignored `scripts/skills/tmp/`:
`w6-adoption-review-20261021/`, `w6-m6-routing-candidate4-20261021/`,
`w6-m6-advice-routing-diagnostic-20261021/`,
`w6-m6-advice-boundary-candidate5-20261021/` and
`w6-m6-routing-candidate5-20261021/`. No release or completed write journey is
implied by these routing probes.

The routing runner shares one fresh workspace across a cohort, including
synthetic files that Claude shell operations can create. These are first-open
samples with frozen authored skill sources, not per-request fresh/immutable
ledger controls. The hosted-reconcile timeout's shared workspace differs from
its fresh recovery workspace; that context limit is retained in the dated
client record. The separate behavioral accounting controls verify their own
per-case ledger/file/Git invariants.

Claude candidate5 records114 correct choices and one120-second timeout in its
original full cohort. One120-second recovery also times out. A separate recovery
at the runner's documented240-second default completes in123.8seconds and
correctly chooses none, resolving the missing row. All115 logical observations
are correct, with zero real misroutes; this is explicitly a resolved composite,
not a fresh uninterrupted115/115 cohort. All original attempts and deadline
settings remain recorded.

Both complete candidate5 Codex cohorts finish115/115,230/230 total, with zero
infrastructure errors or new paired misses against exact complete candidate4
baselines. Common103 pass206/206, previously added ten pass20/20, and the two
new generic-PDF controls pass4/4. There is no Codex recovery or replacement.
With the separately qualified Claude resolved set above, the final source has
no new paired routing miss. The original Codex PDF loss and all intermediate
failed candidates remain historical observations. Release source/published bytes
and native host installations are separate subsequent gates.

The accepted source ships at `703fe36ca`; [complete skillsCI](https://github.com/bex-co/beancount-io/actions/runs/39678149471)
passes. The separately qualified native results support the six prerequisite
closures and protected0.3.7 submission, without claiming public promotion or
current-content host installation before those observations exist.

## Client/project prompts (w2/m55) — 2026-10-27

Two prompts added for profit by client or project, both labeled `beancount-ask`; no skill description changed, so only they were run.

- **Claude Code 2.1.289 (`claude-opus-5-5[1m]`)**, suite at `2ee412e8c`: 2/2 routed to `beancount-ask` (`ask-profit-by-client`, `ask-project-lost-money`).
- **Codex 0.163.0:** not run. `gpt-6.1-sol` (and the configured default) returns `model_not_found` for this ChatGPT account, and `gpt-6-luna` returns the account usage-limit error.

## `beancount-invoices` added (w2/m56) — 2026-10-27

Fourteen skills. New prompts: `invoices-issue`, `invoices-apply-payment`, `invoices-record-bill`, `invoices-aging`, `invoices-tax-remittance`, and near-misses `add-contractor-payment-no-invoice` and `accruals-not-invoices`.

- **Claude Code 2.1.289 (`claude-opus-5-5[1m]`)**, suite at `6421f036a`: **124/124** routed as labeled over the full set, including every new prompt and near-miss.
- **Codex 0.163.0:** not run — `gpt-6.1-sol` returns `model_not_found` for this ChatGPT account and `gpt-6-luna` is at its usage limit (see the w2/m55 entry).

## Payroll prompts (w2/m57) — 2026-10-27

Three prompts: `add-payroll-run`, `add-payroll-tax-deposit`, `ask-payroll-quarter`. No skill description changed, so only they were run.

- **Claude Code 2.1.289 (`claude-opus-5-5[1m]`)**, suite at `ca3a12575`: 3/3 routed as labeled.
- **Codex 0.163.0:** not run (see the w2/m55 entry).

## Payout prompt (w2/m58) — 2026-10-27

One prompt, `import-stripe-payouts`; no skill description changed.

- **Claude Code 2.1.289 (`claude-opus-5-5[1m]`)**, suite at `63561758f`: 1/1 routed to `beancount-import`.
- **Codex 0.163.0:** not run (see the w2/m55 entry).

## Business-books routing on Codex (w2/m55–m58) — 2026-11-01

The four entries above left Codex not run. Codex accepts `gpt-6.1-sol` again, so the complete set ran there.

- **Codex 0.166.0 (`gpt-6.1-sol`, client-default reasoning)**, suite at `df1cfd84e`, two complete passes: **128/128 each, 256/256**, zero errors and no recoveries, covering every new prompt and near-miss from the four entries above.
- **Before side:** not rerun. Codex's last complete passes (candidate5 above, 115/115 twice) predate `beancount-invoices`, and with no miss after, no prompt that routed correctly then misroutes now.
- **Claude Code:** the entries above stand (124/124 over the full set at `6421f036a`, then 3/3 and 1/1 for the prompts added after it). No skill `description` changed between those runs and suite 0.4.20, so neither client's result was rerun for the later cleanups.

## Upgraded linked installation — 2026-11-08

The remaining w2/m42/t007 Codex discovery prompt now passes on Codex CLI
0.167.0, `gpt-6.1-sol`, in the Linux runtime recorded above. This is **one
prompt**, not a new complete routing cohort.

Two live GitHub checkouts rehearse the current installation guide, with only
`SKILLS_SRC` and workspace destinations substituted under package `tmp/`:

- A fresh shallow sparse clone at `812236764` installs and verifies sixteen
  customer skills in both `.claude/skills` and `.agents/skills`.
- A separate historical fixture uses pre-move `e4171efc2` and its own
  `skills/scripts/beancount-skills.py` to install the original nine skills.
  The documented upgrade block fast-forwards it to `812236764`, widens the
  sparse checkout and repairs all eighteen old links, then links the seven
  later additions. Both client directories verify with sixteen skills.

From the upgraded installation, the exact prompt “How much did I spend on
groceries last month?” first opens `beancount-ask`. The routing runner's
unchanged event parser verifies that command's printed name frontmatter.
The same complete client turn then executes
`cat .agents/skills/beancount-init/references/bea-cli.md` successfully; its
output equals the installed reference in full. This also supplies w2/083's
missing linked-install shared-contract read, without a ripgrep search or
missing sibling path.

The probe runs with native `read-only` policy and a read-only workspace
mount, and the synthetic ledger remains byte-identical. The subsequent BQL
query cannot run because that policy provides no writable temporary
directory. The client reports this blocker and does not invent a grocery
total. These observations prove discovery and reference reading; they are
not a successful financial-query rehearsal. Earlier Claude discovery
retains its October 19 date and client version; no new Claude run is claimed.

Logs, old/new revisions, installer output, the full Codex JSONL and the
independent grade are local under
`scripts/skills/tmp/w2-codex-linux/m42/`. The two source checkouts have the
same customer skills/tooling/guides as `b91a5998f`; the intervening
`812236764` change is in the backend package.

## Original trade behavior cohort — 2026-11-08

w2/m45/t006's original eight evals now pass on Codex CLI **0.167.0** /
`gpt-6.1-sol`, Linux, in the prepared runtime above, with the checkout `bea`
reporting 0.3.1 (not a claim of a clean published-release install). Each eval
starts from its original synthetic fixture in a fresh Git workspace with the
sixteen-skill linked suite. The tested candidate is suite **0.4.29**, based on
`10237e8b6`; the later upstream synchronization changed no skill-package file.

| Eval | Observed final result |
| --- | --- |
| 1 average-cost refusal | Pass twice after clarification: unambiguously refuses AVERAGE, shows both actual 10-share lots at 100/120 USD and January 15/February 15 dates, asks the user to choose an alternative, writes nothing. |
| 2 ambiguous STRICT sale | Shows both candidate lots, asks which to sell and for the missing date, writes nothing. No lot chosen silently. |
| 3 own-account transfer | After the shown November 8 proposal is approved, 4 VTI moves to Roth at the original 100 USD / January 15 lot. Independent queries show 6 remaining and 4 received; no price, cash or gain leg. |
| 4 split | After approval, 10 ACME becomes 40 at 50 USD with January 15 acquisition date; total cost remains 2,000 USD. Native total-cost write and root check pass. |
| 5 reinvested dividend | After approval, adds a distinct March 16 lot of 0.15 VTI at 300 USD against 45 USD dividend income, with no cash leg; original lot remains intact. |
| 6 RSU vest | Pass after clarification: proposal explicitly leaves tax treatment to the user and adds no withholding; after approval, 8 ACME at 200 USD dated May 1 against 1,600 USD compensation income, root check passing. |
| 7 crypto transfer | After confirming November 8 and no network fee, transfers 0.2 BTC at the original 40,000 USD / January 10 lot; independent queries show 0.3 remaining and 0.2 received, no price or gain leg. |
| 8 realized-gains report | Pass twice after clarification: uses ask's read-only entry point and the shared trade reference, shows acquisition 2025-01-15, sale 2026-03-01, 5 VTI, proceeds 750, basis 500, gain 250 USD, more-than-one-year bucket (410 days), and matching booked-gains BQL. Open lots and unrealized gains are explicitly excluded; ledger unchanged. |

All five write cases first left the ledger byte-identical while awaiting the
explicit confirmation. Their final entries and independent lot queries match
the expected shape, and the root check passes. Evals 1, 2 and 8 leave the ledger
unchanged throughout. No external financial service or production ledger was
used. Original, fixed and repeated transcripts are retained locally under
`scripts/skills/tmp/w2-codex-linux/runs/m45-trade-*`.

Three initial answers were incomplete and are retained as partial results:
eval 1 refused safely but omitted the real lots; eval 6 booked correctly without
inventing withholding but omitted explicit tax-treatment ownership; eval 8
computed and tied out 250 correctly but omitted acquisition date, holding bucket
and coverage exclusions. Compact procedure/output clarifications now require
those fields. Evals 1 and 8 then pass in two fresh sessions each; eval 6's fresh
proposal includes its missing statement and completes the confirmed write.
No description changed. Both plugin manifests bump together to 0.4.29.

The routing debt is already satisfied by the **November 1** Codex 0.166.0
128/128 passes above, twice with zero errors: a JSON audit confirms every one
of m45's original **90** entries from `e50735ced` is present unchanged in
`df1cfd84e`. This is dated reuse of those completed runs, not a new 136-entry
cohort. Claude Code's October 19 behavior 8/8 and routing 90/90 evidence in
[w2/m45/t006](../../.pm/w2/done/m45/done/t006.md) retains its original date and version;
no fresh Claude answer is claimed. The 67 checker tests plus the existing real
trade-batch/realized-gains recipe tests pass (69 total), as do full local skills
CI, the 0.4.28-to-0.4.29 base-aware version gate, and agent-guidance validation.

## Original reconcile and close Codex cohort — 2026-11-08

The original **22 reconcile + 9 close cases pass on Codex CLI 0.167.0 /
`gpt-6.1-sol`**, after the retained partials and procedure clarifications below.
This is a **Codex-only candidate result**, not a completed two-client gate or a
published suite release. The candidate is suite 0.4.30, based on `552e3f5ef`,
preserved locally as `88468623a` on `codex/w2-m48-codex-20261108`; main's
customer skill files were restored before recording this outcome. The candidate
commit is not pushed. The task remains [blocked](../../.pm/w2/blocked/m48/t004.md).

Every case uses its original synthetic fixtures in a fresh Git workspace with
all sixteen skills linked by the real installer. The prepared Linux arm64
runtime above uses the checkout `bea` reporting 0.3.1, which carries unreleased
CLI fixes; this is not published-minimum CLI evidence. There are no production
ledgers, external financial services, forced skill selection or supplied model
answers. The current suites contain later cases (23 reconcile and 14 close);
this result covers the original 31 only.

| Reconcile eval | Observed result |
| --- | --- |
| 1 exact match | Coverage first; three matches; approved June 1 assertion 2865.80 and header config, no transaction added; root check passes. |
| 2 missing rows | Full proposal finds 31.10 groceries and 12.00 provisional Uncategorized; approved USD open, row IDs, header and June 1 assertion 2902.70 preserved; root check passes. |
| 3 amount mismatch | Shell 40 versus 42, residual −2; no correction or assertion, ledger unchanged. |
| 4 duplicate ambiguity | Both −75 ledger candidates and file positions shown as a question; residual +75, neither silently chosen; unchanged. |
| 5 in transit | Missing-on-statement rent −1500 may clear next statement and stays pending investigation; residual +1500; unchanged. |
| 6 date drift | May 9 ledger / May 11 statement matched without date edits or duplicate; approved June 1 assertion 467; check passes. |
| 7 credit-card signs | Client first asks for absent period/closing facts; operator supplies May 1–31 and printed 138 owed, without a category hint. Two matches; approved airline −320 / provisional Uncategorized +320 and June 1 assertion −138; check passes. |
| 8 diff only | Complete unposted proposal, explicit separate-yes gate; ledger and CSV unchanged. |
| 9 ambiguous dates | Asks MDY/DMY and absent period/ending balance. Operator confirms DMY only and requests no writes; resolves May 4 / June 7, keeps remaining questions open, saves no config. |
| 10 failing assertion request | Reports −2 residual and withholds the requested assertion; unchanged. |
| 11 first reconciliation | Approved native `add balance --pad-from` actually executes: April 30 Pad, May 1 opening assertion 250, June 1 assertion 500. Original transactions untouched; check passes. |
| 12 preview arithmetic | Executed rows 2945 / 2942 / 0 and exact 2945 − 3 = 2942; one provisional 3 fee, September 1 assertion proposed. Explicit decline leaves ledger and CSV byte-identical. |
| 13 unexplained residual | Executed residual −4, ledger 4 above supplied 2941; remains unreconciled, no invented fee, Pad or assertion; unchanged. |
| 14 positive card balances | Negates both movements and amount owed: −52.20 / −342.20 / 0; approved airline −290 and June 1 assertion −342.20; check passes. |
| 15 newest first | Uses latest May 31 balance 3383.80, not last row; 3395.80 / 3383.80 / 0. Approved 12 fee and June 1 assertion pass check. |
| 16 red ledger, zero residual | Strict reads refuse, diagnostic reads use `--allow-errors`; 2945.80 / 2902.70 / 0. Approved staged open then strict two-row batch clears the existing assertion; no engine repair. |
| 17 instruction-shaped row | Description retained verbatim and flagged as data; missing 25 and assertion 2840.80 only proposed behind yes; unchanged. |
| 18 red ledger, nonzero residual | Trader Joes 31.10 versus 30 remains manual; only parking 12 proposed. 2915.80 / 2903.80 / −1.10. Approved batch first refuses strict on the diagnosed assertion, then succeeds once with `--allow-errors`; independent check remains red by 1.10, honestly reported. |
| 19 split settlement | Both dated hotel postings 30 + 45 = 75 shown as a question; no automatic pair; Coverage opens final reply, assertion withheld; unchanged. |
| 20 two accounts | Source 2 / −65 = Checking included 1 / −75 + named Savings excluded 1 / +10. Savings never matched to Checking; unchanged. |
| 21 statement arithmetic | Computed 900 versus printed 905, +5 extraction/statement gap; stops before Match, no ledger correction; unchanged. |
| 22 BTC precision | Exact 0.000425 match; 0.010000 → 0.009575, residual 0.000000; six-decimal assertion only proposed, no cent tolerance or writes. |

| Close eval | Observed result |
| --- | --- |
| 1 full close | Parking and July 1 assertion 7874.60 written only after reconciliation yes; report shows income 3000, expenses 203.60, Checking evidence 4/4/0 and zero residual, Amex unverified, Netflix gap and one carried flag. A separate yes creates a real local commit with report body and subject `close: 2026-06 — 1 tied, 1 not tied`; only ledger committed, no push. |
| 2 skip Amex | Amex remains enumerated, unverified and unpinned with booked −447.33; approved Checking writes pass check and full report proceeds without demanding an Amex statement. Commit still awaits separate approval. |
| 3 Netflix not cancelled | April/May 15.49 pattern found, June gap stays open; offers import or a separately reviewed manual proposal. No Netflix or other ledger write before yes. |
| 4 carry flag | June 21 Whole Foods `!` presented and counted as one carried flag; original entry bytes remain intact after approved parking/assertion writes. |
| 5 red check | Exact validator line quoted: expected 9000, actual 8000, 1000 short. Scope blocked; asks for statement and names missing/misdated entries versus wrong assertion. No invented entry, assertion change or commit proposal. |
| 6 withhold commit | Initial instruction does not authorize financial appends; explicit reconciliation yes obtained first. Approved entries remain as working changes, index and HEAD unchanged; full report delivered without re-asking to commit. |
| 7 foreign charge | Both period reports execute with `--time 2026-06 -x at_cost`, exit 0. Travel remains 300 EUR at book value; shown weight query prints Travel 330 USD / Food 20 USD, income 3000, expenses 350. Both accounts unverified; no price or engine repair, unchanged. |
| 8 three accounts | After reconciliation yes, July 1 assertions 950 Checking / 600 Savings pass; Amex named unverified. Separate commit yes creates real report-body commit `close: 2026-06 — 2 tied, 1 not tied`, validity-only check label, no qualified verified-close label, no push. |
| 9 partial statement | June 1–20 evidence ties at 950 with 1/1/0 rows and zero residual, but account stays partly covered, headline 0 tied. June 25 posting outside coverage visible; June-end balance 930; no writes. |

Reconcile 7 and 9 include the explicitly described intake answers; they are not
claims that the original prompt supplied those facts. Write approvals follow
review of the actual proposals. Original ledger entries and source CSVs are
checked independently; confirmed success cases receive a separate root check.
Red-ledger eval 18 deliberately remains invalid. For close 1 and 8, independent
Git inspection proves no staging/commit before the separate yes, exactly one
new local commit afterwards, only the ledger changed, and no remote configured.
The native close-only permission profile permits the owned synthetic workspace
including its `.git`, denies outside writes and command networking; a real
commit and denied outside-write probe preceded these cases. Other cases retain
the default native workspace-write policy. No privileged container or disabled
native sandbox is used.

Initial incomplete answers are retained: reconcile 1/19 placed final Coverage
after an outcome; 2 stopped at a diff or omitted category/open/config/coverage
attributes; 5 omitted the next-statement preservation explanation; 8 omitted
the separate future-yes statement; 9 omitted future confirmed config persistence;
18 diagnosed correctly without the complete unposted entry. Close 5 omitted
candidate causes or the exact diagnostic quote; 7 omitted the converted expense
category; 8 proposed the forbidden qualified label “partially verified”. The
candidate clarifies those procedures and failed cases pass in fresh sessions;
no eval or skill description was weakened or changed. Logs and per-case grading
remain locally in `scripts/skills/tmp/w2-codex-linux/`.

Full local skills CI, its base-aware 0.4.29→0.4.30 version check, agent-guidance
validation and six existing real-`bea` regression recipes pass on the candidate
(tie-out/residual, coverage arithmetic, staged open plus green batch, liability
balance sign, newest-first export, foreign-charge book-value reports). This is
not a new routing cohort: descriptions are unchanged. Claude's October 19
**20 pass + 2 partial reconcile / 7 pass + 2 partial close** remains dated and
unresolved. Authentication is unavailable; no retry of that unchanged blocker,
new Claude result or two-client green claim is made. Authenticate Claude, rebase
the preserved candidate onto current main with the appropriate suite version,
run the required original Claude cohort and affected Codex regressions, then
ship the jointly verified change before closing t004.

## Original holdings Codex cohort — 2026-11-08

w2/m49/t003's original ask evals 10–13 were run on Codex CLI **0.167.0 /
`gpt-6.1-sol`**, Linux arm64, with the prepared checkout `bea` reporting 0.3.1
and the real sixteen-skill linked installer. Each case starts in a separate
synthetic Git workspace. **Three pass after a preserved field clarification;
eval 13 fails. This is not a completed cohort or a published candidate.**

| Eval | Observed result |
| --- | --- |
| 10 per-lot holdings | Initial answer aggregates VTI despite executing the lot queries, omitting required dates and per-lot gains. Fresh candidate run shows VTI 10 at 100 / January 15 (cost 1000, market 3000, unrealized 2000) and 10 at 120 / February 15 (1200 / 3000 / 1800), BTC 0.5 at 40000 / January 10 (20000 / 30000 / 10000), and ACME 10 at 50 / March 10, cost 500, explicitly unpriced. Queries shown, October 1 prices disclosed as old. |
| 11 unpriced ACME | Initial answer correctly withholds market value but omits unit cost/acquisition date. Fresh candidate run shows all fields from the executed query: 10 ACME, 50 USD/unit, 500 basis, acquired 2025-03-10; no market or gain figure; points to add's price workflow. |
| 12 allocation | Pass on unchanged published source: priced total 36000, BTC 30000 / 83.33%, VTI 6000 / 16.67%, from executed engine division. ACME explicitly excluded as unpriced; cash excluded from invested-lot scope; October 1 price date and staleness disclosed. |
| 13 mixed facts/advice | Fail on unchanged published source: the client never opens ask's SKILL.md, searches public price/tax sources, attempts a direct engine import and uses local arithmetic, then gives a sell/tax recommendation. Ledger unchanged, but the routing, shown-query and no-advice expectations fail. No description was changed to hide or bypass this result. |

Every original/fixed ledger remains byte-identical. No real financial ledger
is involved. The failed advice answer is evidence of an out-of-scope response,
not endorsed guidance. Original and fixed JSONL, stderr and grades remain local
under `scripts/skills/tmp/w2-codex-linux/runs/m49-ask-*`.

The body-only candidate makes the existing per-lot answer contract explicit in
ask's BQL reference. It passes full local skills CI, the base-aware 0.4.29→0.4.30
version gate, guidance validation and two existing real-CLI holdings/price
regressions. It is preserved **unpublished** at local `4f078e663`, branch
`codex/w2-m49-holdings-20261108`, based on `a643b08f4`, in
`scripts/skills/tmp/w2-m49-holdings-candidate/`; the source patch is
`scripts/skills/tmp/w2-codex-linux/m49-holdings-candidate.patch`.
Main's product files are restored. This candidate is separate from the also
unpublished m48 candidate, even though both reserve version 0.4.30.

A JSON audit finds all **92** original routing entries at `51d1303e7` unchanged
inside the November 1 `df1cfd84e` twice-passing **128/128** Codex cohort. The
current ask description also exactly matches that source and the earlier
Claude 124/124 source `6421f036a`. This dated reuse covers those 92 requests;
it does **not** cover the newly observed mixed-question failure in behavior
eval 13, and is not a fresh 136-entry run. Historical Claude behavior 4/4 at
October 19 remains dated, not represented as a fresh run.

Eval 13 did not select the skill, so an unread body cannot repair its trigger.
Changing the description requires both clients' before/after routing controls
under `skills/AGENTS.md`; Claude authentication remains unavailable. The
[task stays blocked](../../.pm/w2/blocked/m49/t003.md): authenticate Claude,
measure the current baseline and candidate routing as required (Codex twice
per side), clarify ownership of explicit facts plus an advice tail while
preserving pure-advice negatives, fix/rerun original eval 13 and the complete
holdings cohort, then ship a jointly verified candidate with the current suite
version. No new dependency, weakened assertion or passing advice result is
claimed.

## Original bulk-investment Codex cohort — 2026-11-08

w2/m50/t005's original **seven cases pass on Codex CLI 0.167.0 /
`gpt-6.1-sol`**, Linux arm64, after the canonical-ID clarification below.
The new legacy-ID regression (import 29) also passes: **eight cases total**,
plus a separate fresh-context compatibility control. This is an unpublished
candidate result; the expanded both-client gate remains open.

Each case uses its original synthetic fixture, a fresh Git workspace, the
real sixteen-skill linked installer and the prepared checkout `bea` reporting
0.3.1. This is not a clean published-release CLI rehearsal. No production
ledger, external financial account or supplied model answer is involved.

| Case | Observed result |
| --- | --- |
| Trade 9, four buys | Four full entries shown at 250/260/255/270, one yes. One successful native batch writes four 2-VTI lots; independent query gives 8 VTI and 2930 cash, root check passes. Initial missing `python` alias produces no batch file/write; client repairs to `python3` before the successful batch. |
| Trade 10, ambiguous sell | Both existing 10-VTI lots (100 / January 15, 120 / February 15) shown, plus the explicitly hypothetical March buy. Asks which lot the sale uses; neither buy nor sell written. |
| Import 16, broker activity | Mapping/action/entry review shows 10 VTI at 250, cash −2505 and separate 5 fee, dividend 42.50. After yes, native batch and saved mapping pass check. Independent query: cash 17537.50, VTI 10, fee 5, dividend income −42.50. Re-import: 2 skipped, 0 new, ledger/config byte-identical. |
| Import 17, existing purchase | Recomputed lot hash matches `4dcaf53cdd65f541`; 1 already imported, 0 new, original entry and 10-VTI position unchanged. |
| Import 18, unheld sale | Names missing 5-ACME holding and asks for purchase/opening lot details; no fabricated lot, short or write. |
| Import 19, opening lots | Full proposal ties 10 VTI at 100 / 2023-05-01 + 5 at 120 / 2024-06-15 + 1000 cash to 2600 equity. Yes confirms January 1 ledger-start date. Native opening preserves acquisition dates and per-posting IDs. Independent positions agree; repeat import recognizes all three rows, no byte changes. |
| Import 20, exchange | Full mapping/proposal preserves 0.05000000 BTC at 60000, separate 15 fee, cash −3015, and 0.01000000 ETH at stated 3000 against 30 staking income. After clarification, IDs are canonical `bc245b320b912584` / `db8b66f5dcf7c471`, while entry precision stays printed. Approved batch/check pass; independent cash 6985. Equivalent decimal re-download: 2 skipped, 0 new, ledger/config unchanged. |
| New import 29, legacy IDs | Fresh context with prior printed-decimal IDs and an equivalent shorter-decimal export: both entries recognized, 2 already imported, 0 new. Existing entries, IDs and config remain byte-identical; check passes. |

**Oracle correction:** trade 9's unchanged prices cost
`2 × (250 + 260 + 255 + 270) = 2070`, leaving `5000 − 2070 = 2930`.
Its original expected-output prose and historical Claude summary instead say
2080/2920. The candidate corrects only that prose arithmetic; prompt, prices
and all three original assertions stay unchanged. The independent real-CLI
balance proves 2930. The historical 2920 statement is retained as a reporting
error and is not reused as cash-balance evidence.

**Identity clarification:** the initial exchange run follows broker-activity's
printed-precision wording and hashes trailing zeroes, producing `e399fa26f06a6519`
for the buy rather than the shared canonical `bc245b320b912584`. The guide
contradicts dedup.md's exact numeric normalization. Both its same-file and
format-only repeat controls still avoid writes, so no duplicate write is
claimed. The candidate separates printed entry precision from canonical hash
spelling and documents content-checked, lookup-only compatibility for older
printed-decimal IDs; uncertain matches require a duplicate decision. The fresh
fixed run generates canonical IDs, and a new permanent eval 29 protects older
IDs from being rewritten or appended again. The new canonical-ID assertion in
20 fails against the retained initial run; no assertion is weakened.

Full local skills CI (including the new fixtures and base-aware 0.4.29→0.4.30
version check), guidance validation, the existing real-CLI batch atomicity
regression and secret scan pass. Logs, independent queries and grades remain
local in `scripts/skills/tmp/w2-codex-linux/`. The complete eight-file candidate
is **unpublished local** `67053c495`, branch `codex/w2-m50-bulk-20261108`, based
on `0eb4e9c13`, in `scripts/skills/tmp/w2-m50-bulk-candidate/`; its full patch
is `scripts/skills/tmp/w2-codex-linux/m50-bulk-candidate.patch`. Main's product
files were restored. Its reserved 0.4.30 version must be adjusted on rebase and
is independent of the other unshipped candidates.

All **95** original routing entries at `08170e3a5` are unchanged inside the
November 1 `df1cfd84e` twice-passing **128/128** Codex cohort. Both import/trade
descriptions match that source and Claude's `6421f036a` 124/124 source. No
description changed here; this is dated reuse, not a fresh 136-entry run.
Historical Claude behavior 7/7 and routing 95/95 retain their October 19/20
dates, with the cash-summary error explicitly noted above. They do not cover
new import 29 or the strengthened ID assertion in 20. Claude authentication is
unavailable, so [t005 stays blocked](../../.pm/w2/blocked/m50/t005.md): run the
expanded original-plus-regression cohort on Claude, fix/rerun any affected
Codex cases, check and ship the coherent rebased candidate before closing.

## Original property Codex cohort — 2026-11-08

w2/m51/t006's original property evals **1–7 pass on Codex CLI 0.167.0 /
`gpt-6.1-sol`**, Linux arm64, suite 0.4.29 at `cff19edb4`. Every case starts
from its original synthetic fixture in a fresh Git workspace with all sixteen
skills linked by the real installer. The prepared checkout `bea` reports
0.3.1; this is not a published-release CLI installation claim.

| Eval | Observed result |
| --- | --- |
| 1 purchase | Full proposal includes three dated, currency-restricted opens, 1 OAKST at 510000 cost, separate 2000 expense, 3000 escrow, −115000 cash and −400000 loan. Both sides of closing total 515000. Explicit yes then native opens/purchase; independent query verifies cost/date, 85000 checking, 3000 escrow and −400000 mortgage; check passes. |
| 2 mortgage payment | Uses the printed 600 principal / 1500 interest / 300 escrow, total 2400, matching new loan owed 399400. Explicit yes then native write; independent query gives mortgage −399400, escrow 3300, interest 1500 and checking 47600; check passes. |
| 3 no printed split | Asks for statement principal, interest, escrow, fees and new balance; explicitly refuses to derive them from the supplied 6% rate. No amortization or write, ledger byte-identical. |
| 4 rent and deposit | Full two-entry proposal opens per-property rent and deposit accounts with USD restrictions. Explicit yes then native writes: rent 1800 to Income:Rent:OakSt, separate deposit 1800 to Liabilities:Deposits:OakSt, never income twice. Independent query confirms both; check passes. |
| 5 sale | Payoff matches loan; 650000 = 240600 cash + 399400 payoff + 10000 costs, escrow refund separate. Explicit yes then native sale/refund. The gain posting has no amount; booking computes 140000. Independent query verifies property, mortgage and escrow zero, checking 242700 and gain −140000; original accounts remain open, check passes. |
| 6 escrow tax | Proposal ties 3000 − 1200 = 1800 and expenses the tax from escrow. Explicit yes then native write; independent query gives escrow 1800, tax expense 1200 and unchanged mortgage −400000; check passes. |
| 7 closing gap | Shows 500000 − 100000 − 390000 = 10000 gap, asks about missing funds or an incorrect figure, and invents no balancing leg. Ledger byte-identical. |

All five write cases wait with byte-identical ledgers until their explicit yes,
write through native `bea` and retain original entries unchanged. Each receives
an independent root check and balance/lot query. Evals 3 and 7 remain read-only.
There are no skill-body, description, fixture or dependency changes, no new
suite version, and no retained failure hidden behind a rerun. Source, JSONL,
original/final ledgers and independent grades remain local under
`scripts/skills/tmp/w2-codex-linux/runs/m51-property-*`.

The original **100** routing entries at `ed626cc35` match, in full, both later
complete cohorts: **Claude Code 2.1.289 / claude-opus-5-5[1m], 124/124 on
October 27 at `6421f036a`**, and **Codex 0.166.0 / gpt-6.1-sol, 128/128 twice
on November 1 at `df1cfd84e`**, zero errors. Current property description is
byte-identical to both sources. The earlier October 20 Claude 99/100 variance
is retained; its pure-advice miss is covered by the later full 124 result.
This is dated reuse of the unchanged original 100, not a fresh 136-entry run.
Claude's original October 20 property behavior **7/7** also retains its date
and version; no fresh Claude authentication or model result is claimed.
[Task evidence](../../.pm/w2/blocked/m51/done/t006.md) closes the original both-client
behavior/routing debt; adoption, simplify, deterministic coverage and closeout
remain separate tasks.
