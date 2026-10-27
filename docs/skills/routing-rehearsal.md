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
  that ends without one chose no skill.
- A skill outside the suite counts as `none`. Each client's own user-level
  skills still load, as they would for a customer. On this machine that
  includes `dont-code-but-answer`, which Codex chose for the `bea ask` question.
- Each prompt runs once per run. Codex results vary between runs, so the
  baseline is two runs.

Reproduce with `python3 scripts/skills/run-routing.py --codex-model <model>`.
Results land in `scripts/skills/tmp/routing/<UTC stamp>/` (gitignored).

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
