# ClawHub publication and host rehearsal

**Historical standalone distribution:** all thirteen `@puncsky/beancount-*`
skill listings were retired through owner soft-delete on 2026-10-22, after the
unified suite became public. Results below record the earlier releases and
remain evidence, not current install instructions. Use the
[suite installation guide](installation.md#one-suite-release) and
[retirement record](suite-distribution.md#standalone-listing-retirement--2026-10-22-utc)
for the current route and Hermes limitations.

Checked on macOS on 2026-10-19 PDT and updated on 2026-10-20 PDT. This records registry submission, public installation, real agent queries, and the remaining host limits separately.

## Release

[Publish run 39372550698](https://github.com/bex-co/beancount-io/actions/runs/39372550698) validates and submits all eleven customer bundles from main `b5f849059644d5a6171606850ea857d374abf059`, using ClawHub CLI 0.23.3 and publisher `puncsky`. Each submission returns version **1.0.0** with a version ID and publication-attempt ID. The workflow and its credential-removal step both succeed.

Every submission initially returns `pending-publication`. Workflow success means the upload was accepted; public availability is checked independently below. No duplicate submission, force install, scanner override, or source rewrite was used to make a release appear ready.

## Install results

Fresh OpenClaw state/workspace directories and fresh `HERMES_HOME` directories were created under gitignored package scratch space. A standalone ask install was checked before attempting the rest of the suite. Versions: **OpenClaw 2026.10.5** (`1b58cb9`), **Hermes v0.22.2** (`d923a5eb487a17c0a68801bba9ef0f56c81040a8`), **Python 3.14.3** for Hermes.

| Skill | Submitted version | OpenClaw | Hermes |
| --- | --- | --- | --- |
| beancount-add | 1.0.0 | Installed; audit Review | Installed; SAFE |
| beancount-ask | 1.0.0 | Installed; audit Safe | Installed; SAFE |
| beancount-close | 1.0.0 | Installed; audit Safe | Installed; SAFE |
| beancount-import | 1.0.0 | Installed; audit Safe | Installed; SAFE |
| beancount-importer-author | 1.0.0 | Installed; audit Review | Installed; SAFE |
| beancount-init | 1.0.0 | Installed; audit Review | Blocked; DANGEROUS |
| beancount-migrate | 1.0.0 | Installed; audit Review | Installed; SAFE |
| beancount-options | 1.0.0 | Installed after promotion; audit Review | Installed after promotion; SAFE |
| beancount-property | 1.0.0 | Installed after promotion; audit Review | Installed after promotion; SAFE |
| beancount-reconcile | 1.0.0 | Installed after promotion; audit Safe | Installed; SAFE |
| beancount-trade | 1.0.0 | Installed; audit Review | Installed; SAFE |

OpenClaw prints the registry's audit and allows both Safe and Review outcomes under its default policy. Review is not reported here as a clean audit. Every successful installed folder contains the byte-identical canonical `skills/LICENSE` and its own `references/bea-cli.md`; the single ask install therefore has no dependency on an installed init folder. Hermes adds its registry metadata file to the eight authored bundle files for ask.

The commands exercised are:

```sh
openclaw skills install @puncsky/beancount-ask
hermes skills install clawhub/@puncsky/beancount-ask --yes
openclaw skills update --all
hermes skills update
```

The same install commands were attempted once per suite skill, with isolated host state and the respective skill name. OpenClaw's update reports ask already at 1.0.0; Hermes reports no updates. A failed early ask/reconcile install was repeated only after public availability changed, and then succeeded.

Hermes's full registry init bundle is quarantined and rejected by `skills-guard-v10`: 18 findings, including the critical `agent_config_mod` rules for creating the ledger's `AGENTS.md` in `SKILL.md:188` and `references/agents-template.md:9`. This is the intended consent-gated workflow, retained by the release decision. The actual CLI exits 1 and does not install init. No override was attempted.

## Registry verification and promotion

At the 05:18 UTC check, options and property remain unavailable on the public API. Authenticated owner moderation diagnostics for each report `verdict: clean`, `isSuspicious: false`, `isMalwareBlocked: false`, and `legacyReason: pending.publication`. These are pending first submissions, not missing uploads; do not publish them again to clear the wait. The registry must finish publication before their public installs can be repeated.

**Update by 05:35 UTC:** options has become publicly available at 1.0.0. Its native OpenClaw install succeeds with an audit Review outcome; Hermes installs the same public bundle with a SAFE verdict and no force. Both installed folders carry the canonical license and local CLI contract. This brings the verified totals to **ten OpenClaw / nine Hermes**. Property remains unavailable on the subsequent public API check; only its existing first submission is still pending. No new release was uploaded to obtain this promotion.

**Final publication result:** property subsequently becomes public at 1.0.0. Its audit reports Review because the scanner sees a difference between the local-ledger scope and the conditional hosted/MCP handoff. Native OpenClaw installs it under the default policy, and Hermes installs it with a SAFE verdict at 05:41 UTC. The complete eleven-skill suite then installs together in the original OpenClaw suite workspace. Final totals are **eleven OpenClaw / ten Hermes**, with only Hermes init rejected. All eleven listings are public; no publication submission remains pending. Licenses and local CLI contracts are verified in every successful install, and no force or duplicate publish was used.

[Complete skills CI on `dec916039`](https://github.com/bex-co/beancount-io/actions/runs/39374976210) passes, including installer/first-query tests, the published-minimum CLI recipes, and QA-helper tests. That CI coverage is separate from the real OpenClaw/Hermes model-backed turns still pending below.

The strict `/verify` API is also distinct from native installation policy. Its initial snapshot reports `card.missing` for the first seven visible skills, with `security.status_not_clean` on Review outcomes; it does not establish a passing strict verification envelope. The native install successes above are actual client results, not inferred from that envelope. No clean cryptographic/card verification is claimed.

## Hermes search discovery

In the 2026-10-19 rehearsal, after every listing is public, `hermes skills search beancount --source clawhub --json --limit 30` returns no results in the fresh profile. Searching with `--source all` returns three older ClawHub entries, none from this suite. A direct control request to [ClawHub's search API](https://clawhub.ai/api/v1/search?q=beancount&limit=30) returns fourteen results, including all eleven `puncsky` skills. The explicit owner-qualified installs above succeed.

Source inspection distinguishes this from an unpublished skill: Hermes's [source-filtered adapter](https://github.com/NousResearch/hermes-agent/blob/d923a5eb487a17c0a68801bba9ef0f56c81040a8/tools/skills_hub_clawhub.py) walks the catalog before its lightweight fallback, while the [unfiltered router](https://github.com/NousResearch/hermes-agent/blob/d923a5eb487a17c0a68801bba9ef0f56c81040a8/tools/skills_hub_search.py) can answer from the centralized index without querying the live sources when that index has matches. This suggests a host catalog/index gap; it does not prove which cache or timeout is responsible. No local host-source patch, fabricated cache, or upstream issue was used to change the result. Recheck search after the host/index is updated; use explicit publisher-qualified installs meanwhile.

**Update 2026-10-20:** in a new isolated profile, the exact default command `hermes skills search beancount` now returns fourteen entries including all eleven suite skills. `hermes skills search beancount --source all --json --limit 30` confirms the complete set. The source-filtered command above still returns `[]`, while the registry control still includes all eleven. Default discovery has recovered; the narrower source-filtered gap remains tracked in [w6/040](https://github.com/bex-co/beancount-io/blob/a8fc3a8ee42b9166957cd7bff7d60f57bdf8bf77/.pm/w6/blocked/040.md). No host or cache patch was applied.

## First-query control and host acceptance

Installed the published **beancount-io 0.3.1** in a separate venv. The machine's existing `bea` reports 0.1.0, so it was not used for the control. Against the public synthetic `beancount-ask/evals/files/eval1_ledger.beancount` fixture, the [first-query guide](first-query.md)'s exact BQL returns:

| Account | June 2026 |
| --- | --- |
| Expenses:Food:Groceries | 141.60 USD |
| Expenses:Transport:Gas | 50.00 USD |
| Expenses:Entertainment:Streaming | 17.99 USD |

The fixture checksum remains unchanged. This is a direct CLI control, not an agent answer. During the initial installation rehearsal no model credential was configured in the fresh host profiles, and no credential was imported.

### Real host turns — 2026-10-20

The operator authorized temporary reuse of the existing Codex login. OpenClaw's official `@openclaw/codex@2026.10.5` plugin and selective `migrate apply codex --include-secrets --item auth:openai --yes` path imported only the credential item into isolated host state (one migrated item, 58 skipped). Hermes's `model` flow offered the existing CLI login, and its import prompt was accepted. No new OAuth grant or provider key was created. The original login file was byte-identical at cleanup; both temporary host profiles and their credential copies were deleted after testing.

Both hosts freshly installed `@puncsky/beancount-ask@1.0.0` from ClawHub on its own. OpenClaw reported Safe; Hermes reported SAFE and allowed installation without force. Each host received the first-query question, a request to use the installed skill and show its executed command, and explicit read-only/synthetic-data constraints.

| Host | Tested model and runtime | Observed result |
| --- | --- | --- |
| OpenClaw 2026.10.5 | `openai/gpt-6.1-sol`, explicitly selected OpenClaw embedded runtime, low reasoning | Loaded the installed skill and its bundled CLI contract, executed `bea` 0.3.1 through its tool bridge, and returned all three expected amounts. Exit 0; twelve tool calls, zero tool failures. |
| Hermes v0.22.2 | `gpt-6.1-sol`, `openai-codex` provider, low reasoning; `--skills beancount-ask`, `--toolsets terminal,file,skills` | Loaded the installed skill references, checked the actual CLI version, executed the query through `terminal`, and returned all three expected amounts. Exit 0. |

The executed query in each host was:

```sh
bea --file "$ledger" --json --no-input query "SELECT account, sum(weight) as total WHERE account ~ '^Expenses:' AND date >= 2026-06-01 AND date < 2026-07-01 GROUP BY account ORDER BY total DESC"
```

`$ledger` represents the absolute synthetic fixture path in that host's workspace. Both actual tool results contain the three rows above with `truncated: false`; the final answers show the executed command. Transfers and credit-card payments are excluded. Both ledger files retain SHA-256 `0676a52a1aaa8e80134a5a9aaf3b5fb659880732144a477d376c8b1e735322b6`.

OpenClaw's initial default Codex-harness attempt stopped before inference with `Codex native skill discovery returned errors`. A read-only native discovery probe identified an unrelated installed skill outside this worktree that lacks a description. That attempt is not counted as successful. The successful run explicitly used the [documented embedded runtime](https://docs.openclaw.ai/providers/openai/runtimes), with `agents.defaults.models["openai/gpt-6.1-sol"].agentRuntime.id` set to `openclaw`. It made a real authenticated model turn; neither the host nor skill source was patched. The skill optionally checked the absent sibling contract, then loaded its own bundled copy successfully.

The installation and first-query rehearsal is complete under t008's provision for recording compatibility gaps with follow-ups. Hermes init remains unsupported under the retained workflow ([w6/039](../../.pm/w6/blocked/039.md)); source-filtered search remains incomplete ([w6/040](https://github.com/bex-co/beancount-io/blob/a8fc3a8ee42b9166957cd7bff7d60f57bdf8bf77/.pm/w6/blocked/040.md)). Default Hermes search, standalone installs and real queries are verified. These results do not claim complete Hermes suite support or successful default Codex-harness execution.

## Suite 0.3.2 synchronization — 2026-10-20

While the closing checks ran, the independent wording audit `214ca2403` updated customer instructions and advanced the plugin suite to 0.3.2. Comparing current bundles with the actual installed 1.0.0 files identified five affected bundles: add, import, init, migrate and reconcile. The latter two inherit changed shared references. Ask and its first-query inputs are unchanged.

[Run 39393132904](https://github.com/bex-co/beancount-io/actions/runs/39393132904) from main `db23c44f171dd2cd25179d07c122b7500b8c51a3` dry-runs the suite and submits those five bundles as **1.0.1**. It skips the other six unchanged bundles at 1.0.0. Both jobs and publisher-credential cleanup succeed. [Complete skills CI on that commit](https://github.com/bex-co/beancount-io/actions/runs/39393084630) also passes.

All five new receipts report `pending-publication`; the initial post-run public API still exposes 1.0.0 as latest. This is accepted submission, not completed promotion. No duplicate release or force install was attempted. The first eleven 1.0.0 listings remain available.

**Subsequent promotion:** reconcile 1.0.1 becomes public. Its public download matches all nine current authored files, and its real OpenClaw install succeeds without force in the same fresh workspace as the six unchanged skills. Add, import, init and migrate still expose 1.0.0 as public latest at the final check. Their submitted updates remain the publication blocker.

The current 0.3.2 bundles were independently rechecked with the pinned Hermes `skills-guard-v10`: ten SAFE/allowed, init DANGEROUS/rejected with its same 18 findings. Fresh install-only profiles also install the six unchanged registry skills in both hosts without force; every installed authored file matches the current corresponding bundle. These are not installation results for the five unavailable 1.0.1 releases. Earlier complete 1.0.0 installation results and real ask queries remain valid.

The bundle/workflow/checker regressions pass: 130 full installer/recipe/journey tests, 43 focused checks, and six deliberate mutations caught (missing license/reference closure, metadata overwrite/indentation, omitted dry-run flag and skipped workflow build). No customer descriptions changed. Temporary install profiles and vendor runtimes were removed after evidence was retained.

**Review completed by 18:23 UTC:** all five 1.0.1 updates are public. Anonymous downloads of the eleven latest listings match all 105 authored files from the submitted release. The complete native OpenClaw workspace now contains those versions, with every authored file verified against the release bundles. No duplicate publication was needed. Hermes's independent init and source-filtered-search limits stay in w6/039 and w6/040.

## Suite 0.3.3 synchronization — 2026-10-20

Two later main commits updated init's setup-catalog instructions (`05658177b`) and migration source-name grammar (`a1d67f466`). Every standalone bundle contains the shared dedup reference, so all eleven need a registry update. The suite advances to 0.3.3; descriptions and routing are unchanged.

The released `bea` 0.3.1 help does not list `--preset` or `--title`. Init now checks the installed command's help before using either, keeps the standard-chart recipe on 0.3.1, and adds a title only with a selected preset on a supporting CLI. No CLI dependency or engine was upgraded for this change. The native Hermes v0.22.2 community scanner still allows ten current bundles and rejects init with its retained 18 findings.

Fresh native Hermes installs of the promoted 0.3.2 release verify all ten supported skills byte-for-byte; init is rejected with the same documented policy verdict. Default search again finds fourteen entries including the full suite, while explicit `--source clawhub` returns `[]`. No force or model credentials were used.

Before the 0.3.3 synchronization: all 130 installer/recipe/journey tests, 37 checker tests, structural/fixture checks, the skill validator and agent-guidance checks pass. Two focused tests also pass against the published minimum bea 0.3.1 (historical init and empty managed-price reads). The existing price-status test now checks the checkout's empty `refused` field while preserving the published release's older shape. Temporary host profiles and vendor source were removed after retaining the install/scan evidence.

[Hosted skills CI for `ac9510670`](https://github.com/bex-co/beancount-io/actions/runs/39495528150) passes, including the complete journey suite and published-minimum recipes. Hosted agent-guidance and secret-scan checks also pass. The protected [synchronization dispatch](https://github.com/bex-co/beancount-io/actions/runs/39495559079) uses that same commit; all eleven validation plans pass before its publisher job is approved.

The synchronization run completes successfully, including publisher-credential cleanup. All eleven receipts are accepted as `pending-publication`:

| Registry update | Skills |
| --- | --- |
| 1.0.2 | add, import, init, migrate, reconcile |
| 1.0.1 | ask, close, importer-author, options, property, trade |

The post-run public API/download check still returns the previous versions for all eleven listings. No updated version is exposed as public latest yet. This is a registry promotion wait; the accepted uploads must not be repeated. After promotion, verify latest versions and authored-file bytes against this release and complete native supported-host installs before w6/m6/t013 closeout. No model-login approval or owner input remains pending.

## Concurrent twelfth skill — 2026-10-20

After the 0.3.3 dispatch, main adds `beancount-roll-forward` through active w3/m55. The source suite now has twelve skills. The catalog follow-up adds its missing plugin entry, advances both manifests to 0.3.4 and updates current source-suite counts; this does not change the eleven accepted registry updates above. Structural/fixture checks, guidance, six bundle/inventory tests and the roll-forward executable recipe test pass.

Roll-forward has no registry listing in this rehearsal. Its first submission waits for w3/m55's client evals/routing and adoption checks (t002/t003), then needs its own standalone-bundle and real-host verification. The public registry results above cover the original eleven skills. m6 closeout now records both that prerequisite and promotion of the existing eleven pending updates. No owner or model-login approval is pending.

## Thirteen-skill release preparation — 2026-10-20

Main also gained `beancount-accruals` under w3/m57 and the ask/close variance recipe under w3/m56. Suite 0.3.5 repairs the plugin inventory to include all thirteen source skills and keeps both plugin manifests aligned. The link installer and verifier report thirteen complete skills in each fresh workspace directory; native Codex lists all thirteen. The native Claude listing is blocked by its current weekly usage limit, rather than counted as a successful discovery check.

Native Codex CLI 0.163.0 succeeds with `gpt-6.1-sol` and low reasoning. Earlier `gpt-6-luna` usage-limit failures are historical evidence, not proof that every available model is blocked. The behavior runs use fresh nested Git workspaces, the real linked customer suite, raw eval prompts, synthetic fixture copies and the published `bea` 0.3.1 executable. Its absolute path avoids an older global `bea` selected by login-shell PATH resets; those initial older-CLI runs are excluded. Expected answers are not supplied to the client. Actual tool traces and final answers were reviewed, and ledger hashes are unchanged in every accepted run.

| Cases | Codex result | Evidence checked |
| --- | --- | --- |
| Roll-forward 1–6 | 6/6 pass after the valuation correction | Prepaid 1,200 + 600 − 150 = 1,650; loan −4,600 with only 400 principal; cost 1,000 versus separately dated 1,100 valuation; EUR-only travel cash; explicit −30 movement; omitted 25 dividend found without a plug. |
| Ask 14–16 and close 12 | 4/4 pass | Zero-base Electronics rises to 500 with percentage not applicable and BEST BUY posting cited; missing budget stays missing; groceries fall 5.80 below both thresholds with quantities/prices unresolved; close agrees with ask on Electronics. |
| Accruals 1–6 | 6/6 pass after recognition/identity corrections | Daily partial period 55.89 with January identity; reversed recognition nets to a 300 draft; prepaid recognition needs 100 more; March rerun finds the existing identity; missing payment requests support; settled liability needs zero additional expense. |

The first roll-forward valuation run omitted the available later valuation because the instructions required a covering period-end price. The corrected instructions preserve the missing January 31 price and separately report the February 1 price of 110 and value of 1,100. A fresh Codex rerun passes this unchanged eval.

The accrual draft initially used a run-date identity. Monthly identities now use the accounting period (`2025-01` at the exclusive February 1 cutoff), independently of day-count. The recognition query now sums scoped expense postings, including reversals, rather than the balance-sheet balance. Prepaid funding and liability settlement are support, not recognized expense. Executed-query coverage checks both states on published bea 0.3.1; deliberately restoring balance-account aggregation makes the regression fail with 1,100 booked instead of 100. A sixth real-client eval protects the settled-liability case. Shared account pairs still require the schedule's entries to be resolved before calculation. All 134 installer/recipe/journey tests, 37 checker tests, structural/fixture validation, guidance checks and the three focused published-minimum recipe tests pass. All thirteen final bundles pass token-free ClawHub dry runs; the native Hermes scanner allows twelve and retains init's documented restriction.

Claude Code 2.1.304 returns `You've hit your weekly limit · resets 10am (America/Los_Angeles)` before the corrected valuation eval, catalog listing and routing probe can complete. No reset date is inferred from that message. Earlier w3 evidence covers the earlier skill text; it does not validate these corrections or the added sixth accrual eval. **Release remains gated on a real Claude rerun and the owning milestones' adoption checks.** No new login was requested or model credentials copied.

### Pending-review diagnosis

The eleven suite 0.3.3 uploads remain accepted submissions. Owner-authorized, read-only report downloads for `beancount-add@1.0.2` and `beancount-init@1.0.2` return static-analysis **clean**, engine v2.4.26, with no findings or reason codes. ClawScan, SkillSpector and VirusTotal reports are still absent. This is partial scan evidence, not a completed review or a rejection.

The official [prepublication workflow](https://github.com/openclaw/clawhub/actions/workflows/prepublication-publish-checks.yml) also has queued dispatch jobs ([example](https://github.com/openclaw/clawhub/actions/runs/39496089732)). That is consistent with a service backlog; it does not identify the exact queued job for either submission. Source inspection finds that the public attempt lookup is package-only and manual rescanning does not finalize skill publication, so neither a 404 there nor a standalone scan is a supported skill-publication retry. No manual rescan, duplicate submission, upstream message or protection change was made.

The current thirteen bundles have local preparation evidence only. At that check the original eleven awaited promotion of their accepted versions; the two additions and later changed content await the remaining client/adoption gates before a protected publication and real registry-install verification. Do not repeat the accepted uploads to clear their review wait.

Comparing all 119 authored files in the current thirteen bundles with the exact accepted 0.3.3 bundle trees gives this next-release scope:

| After the existing submissions are promoted and client gates clear | Skills |
| --- | --- |
| First release | accruals, roll-forward |
| Changed content | add, ask, close, trade |
| Byte-identical to the accepted submission; skip publication | import, importer-author, init, migrate, options, property, reconcile |

Add and trade inherit the variance recipe through their bundled shared references. Rebuild and compare again on the eventual release commit; this list is preparation evidence, not a new publication receipt.

An earlier read-only check of the signed-in owner UI confirmed add1.0.2 is present in Versions while 1.0.1 remains **Latest**. The public [security audit](https://clawhub.ai/puncsky/skills/beancount-add/security-audit) displays **Review** for version **1.0.1**, with scope/validation findings largely concerning shared reference content; it is not a report for the pending 1.0.2 update. Those findings are not treated as malicious behavior or instructions to remove the approved workflow. No owner publication-retry control was exposed in the inspected version/audit views. The temporary browser tab was closed; no account setting or publication state was changed.

A second native Claude probe with the documented `sonnet` model alias also returns first-party HTTP 429 `usage_limit_reached` before inference, with zero tokens and the same weekly-limit message. No account setting, credential or payment change was attempted.

Hosted validation of `1537bc6bd` also passes: [complete skills CI, including published-minimum recipes](https://github.com/bex-co/beancount-io/actions/runs/39503812580), [all thirteen ClawHub dry runs](https://github.com/bex-co/beancount-io/actions/runs/39503812711), [agent guidance](https://github.com/bex-co/beancount-io/actions/runs/39503812598) and [secret scanning](https://github.com/bex-co/beancount-io/actions/runs/39503812635). The push workflow correctly skips the protected publication job; no additional submission is implied by green validation.

During the real routing comparison, the runner treated Codex's nonterminal `Reconnecting... 2/5 (...)` JSON error notice as a final failure and killed the client before recovery. The runner now waits for recovery while retaining terminal-failure, unfinished-reconnect and watchdog errors. Fake-client stream regressions fail against the old implementation and pass after the correction; scoring and customer descriptions are unchanged. Failed original observations are preserved separately from the affected-case reruns.


The [thirteen-skill native routing comparison](routing-rehearsal.md#thirteen-skill-native-comparison--2026-10-20) is now recorded with the raw infrastructure failures, affected-case reruns and remaining misses. The ten new/boundary prompts pass 20/20 across two Codex cohorts. The same 103 original prompts score 198/206 before and 197/206 after; two PDF prompts have poorer first-open results. Two additional complete client turns demonstrate PDF-helper/import composition, correct 2,925 USD tie-outs and confirmation-pending proposals with unchanged ledgers. Both are read-only and encountered ancestor guidance, so they do not establish completed write journeys or clear the first-open/Claude adoption questions. The fixed runner passes 53 checker/routing unit tests; all 136 installer/recipe/journey tests also pass. The remaining external gates and publication sequencing above still apply.


## Nine synchronization updates promoted — 2026-10-20, 22:19 UTC

A fresh anonymous check finds nine accepted 0.3.3 updates publicly promoted, with every authored file matching the exact submitted bundles. The earlier owner-UI observation above predates this promotion.

| Public and byte-verified | Registry version |
| --- | --- |
| add, import, init, migrate, reconcile | 1.0.2 |
| ask, importer-author, property, trade | 1.0.1 |
| close, options | Still 1.0.0; submitted 1.0.1 remains pending |

Close/options each still contain the older dedup reference. Scratch evidence is `scripts/skills/tmp/w6-review-check/sync-public-state.json`. No resubmission, manual rescan or publication-state change was made. This is partial promotion of the accepted eleven-skill release, not publication of the thirteen-skill source suite.

Fresh anonymous OpenClaw 2026.10.5 (`1b58cb9`) installs of all nine promoted versions succeed with explicit version pins. All 76 installed authored files match the exact 0.3.3 submitted bundles; the host's generated `_meta.json` and `.clawhub/origin.json` are recorded separately. OpenClaw reports **Safe** for import and **Review** for the other eight versions, but permits every installation under its default policy, without force or warning-acknowledgment flags. This install result is distinct from the public API's moderation fields and does not claim a clean audit.

A final targeted public check at 22:26 UTC still finds close/options at 1.0.0. Their submitted 1.0.1 versions remain the publication prerequisite; evidence is `scripts/skills/tmp/w6-review-check/remaining-public-state.json`.

Fresh Hermes v0.22.2 (`d923a5eb487a`, `skills-guard-v10`) installs of the eight supported promoted skills also succeed without force: add, ask, import, importer-author, migrate, property, reconcile and trade. Their 69 authored files all match the exact submitted bundles, and each community-policy scan reports SAFE. Hermes has no version-selection flag; its owner-qualified ClawHub adapter resolves public latest, and byte comparison verifies the accepted versions. New anonymous homes/configs are used for both hosts. These are install/scanner checks, not new authenticated agent-query journeys.

The fresh Hermes init negative control exits 1 with DANGEROUS and the same 18 policy findings; no init folder is installed and no force is attempted. Raw host results, per-file hashes, pins and the summary are retained under `scripts/skills/tmp/w6-m6-resume/promotion-install/`. Restored vendor runtimes and anonymous profiles/caches are removed after collection; the actual installed bundle trees remain as evidence.


## Eleven synchronization updates public — 2026-10-21 UTC

At 04:23 UTC an anonymous API/download check verifies all eleven accepted 0.3.3 updates from `ac95106709fbcbdc9214048c75af258e2a9b71f2`, including close/options 1.0.1. All 105 authored files match their exact submitted bundles. Five listings (add/import/init/migrate/reconcile) are at 1.0.2; the other six are at 1.0.1. The previous registry-promotion wait is cleared. Scratch evidence is `scripts/skills/tmp/w6-m6-20261021/public-state.json`.

The thirteen-skill source inventory, instructions and validation scripts are unchanged since the last ship. A minimal native Claude Code 2.1.304 probe using the documented Sonnet alias still returns first-party HTTP 429 `usage_limit_reached`, zero input/output tokens and the same weekly-limit message before inference. The probe disables tools, skills/customizations and session persistence; it neither creates a login nor changes account/payment settings. Current-source Claude validation and the w3/m55–m57 adoption gates remain prerequisites for later new/changed content. Preserve the recorded PDF first-open loss and full-workflow composition evidence; the earlier Codex passes do not stand in for the missing Claude run.

Hosted checks for `ec6457e75` also pass: [complete skills CI](https://github.com/bex-co/beancount-io/actions/runs/39509100265), [ClawHub validation](https://github.com/bex-co/beancount-io/actions/runs/39509100319) and [secret scanning](https://github.com/bex-co/beancount-io/actions/runs/39509100197). The validation workflow did not publish another version.


Fresh anonymous native installs verify the two newly promoted versions on the same pinned host releases used above:

| Skill/version | OpenClaw 2026.10.5 | Hermes v0.22.2 (`d923a5eb487a`) | Authored files matching the exact accepted release, per host |
| --- | --- | --- | --- |
| close 1.0.1 | Installed; Safe audit | Installed; SAFE/ALLOWED | 9/9 |
| options 1.0.1 | Installed; Review audit | Installed; SAFE/ALLOWED | 20/20 |

Both hosts' metadata confirms version 1.0.1. Each fresh Hermes `skills-guard-v10` scan retains one MEDIUM `unpinned_pip_install` finding in `compatibility.md` while allowing installation. Neither host uses force or warning-acknowledgment flags. These two-version checks complete the individual supported-host verification of all accepted 0.3.3 content, alongside the earlier nine OpenClaw/eight Hermes results. Init retains the previously recorded Hermes restriction. This is installation/scanner evidence, not a new authenticated query journey or publication of the thirteen-skill source release.

Raw native results, exact pins, all installed file hashes and the installed bundles are retained under `scripts/skills/tmp/w6-m6-20261021/host-install/`. The task-only restored Hermes source/runtime and anonymous profiles/caches are removed after collection.


## Standalone current-release controls — 2026-10-21 UTC

The [current release preflight](clawhub-release-preflight-20261021.md) records a fresh 119-file equivalence check, six publication previews/seven unchanged skips, thirteen-skill install/discovery and two standalone native Codex controls. Both controls pass with unchanged ledgers; an initial capacity failure and ancestor-guidance limits remain explicit. Current Claude/adoption checks and subsequent protected publication/current-content host checks remain open.

## Hermes v0.22.4 init control — 2026-10-21 UTC

The official stable [v0.22.4](https://github.com/NousResearch/hermes-agent/releases/tag/v0.22.4), published at 18:49 UTC, resolves to `4d04303818b61bf3aa09278af48356315515965b`. Its [community scanner](https://github.com/NousResearch/hermes-agent/blob/4d04303818b61bf3aa09278af48356315515965b/tools/skills_guard.py) remains byte-identical to v0.22.2. The hub's atomic-write and install-state locking changes do not permit init's retained consent-gated creation of ledger instruction files.

A fresh native `hermes skills install clawhub/@puncsky/beancount-init --yes` against the unmodified official archive and isolated profile exits 1: DANGEROUS/community, `skills-guard-v10`, 18 findings (2 critical, 2 medium, 14 low). Public init is 1.0.2; its changelog names the suite 0.3.3 synchronization. No force is used and nothing is installed. This remains w6/039's host-policy blocker, independently of other skills' supported installations and first queries.

The archive lacks `.git`, so the CLI prints `vunknown`. Provenance comes from the exact tag, archive SHA-256 `147a567a05402c2832ca12d7e0a33f48fc0e7f627018687cbae1f333dafff0c2`, verified lockfile and Python 3.14.3 runtime; no native version string is fabricated. The fresh public-bundle scan digest is `sha256:d2b170d1b013be7cacdbde1160d82be73f9d5745593e0b45cca92178d3069f15`, without a claim that it equals a later local candidate. Raw logs and rejection attestation remain in ignored `skills/tmp/w6-evening-hermes-20261021/`; restored runtime/source, task profiles and caches are removed. No model login, upstream contact or scanner bypass occurs.

## Hermes v0.22.4 search control — 2026-10-21 UTC

Fresh native search against the same pinned stable archive and anonymous profile at 19:24 UTC retains w6/040's source-filter gap:

| Control | Exit | Results | Published suite skills |
| --- | --- | --- | --- |
| `hermes skills search beancount` | 0 | 14 | 11/11 |
| `hermes skills search beancount --source all --json --limit 30` | 0 | 14 | 11/11 |
| `hermes skills search beancount --source clawhub --json --limit 30` | 0 | 0 | 0/11 |
| Direct anonymous ClawHub search | HTTP 200 | 14 | 11/11 |

The filtered call takes 30.410 seconds and emits no stderr. The [router](https://github.com/NousResearch/hermes-agent/blob/4d04303818b61bf3aa09278af48356315515965b/tools/skills_hub_search.py) and [catalog-first adapter](https://github.com/NousResearch/hermes-agent/blob/4d04303818b61bf3aa09278af48356315515965b/tools/skills_hub_clawhub.py) are unchanged from v0.22.2; the exact catalog/transport cause remains unproven. The newer release does not establish a fix. No identical retry, filtered-result installation, cache patch or unchanged-content publication follows. Default search and explicit publisher-qualified installs remain the supported paths. Source/version/cleanup limits match the init control above; raw search logs and hashes are retained in the same ignored evidence directory.


## Suite0.3.7 submitted — 2026-10-21 UTC

Source `703fe36ca` clears final two-client routing and the six named evaluation/
adoption prerequisites. Codex passes115/115 twice; Claude resolves115/115 from
114 original valid choices and one documented-default240-second recovery.
Original timeouts, failed candidates, source distinctions and shared-routing-
workspace limits remain in the [dated release record](./client-release-controls-20261021.md).
Complete [skillsCI39678149471](https://github.com/bex-co/beancount-io/actions/runs/39678149471)
and the local owning checks pass. A post-ship rebuild matches119/119 candidate
files across13 bundles.

Protected [run39679035375](https://github.com/bex-co/beancount-io/actions/runs/39679035375)
succeeds from main `5e1b38a2c`. It accepts first accruals/roll-forward1.0.0;
add/import/migrate/reconcile1.0.3; ask/close/trade1.0.2, all with status
pending-publication and exact expected fingerprints. Four unchanged versions
are skipped. Required environment review and publisher-credential cleanup
succeed; there is no repository PR or repeated pending upload.

The21:41UTC anonymous public check still exposes the older versions for seven
updates and no public listing for the two additions. Only the four unchanged
current targets are publicly exact (40/40 authored files); they already have
fresh OpenClaw4/4 and supported Hermes3/3 install evidence. The new nine have
no eligible current-content install yet. Verify and install each as it becomes
public without waiting for the others. This record does not claim promotion,
new authenticated host queries or m6 closeout. Hermes init/source-filtered
search remain separately tracked compatibility gaps.

## Publisher-side scan diagnosis — 2026-10-22 UTC

The00:40UTC anonymous snapshot still has the same four exact current targets
(40/40 authored files), seven prior public versions and two unavailable first
releases. A signed-in publisher inspection then shows13 listings. The dashboard
marks accruals/roll-forward hidden; accruals has current version None and an
empty Versions table. Settings expose no pending-release retry control or
current rejection explanation. Review labels on older published versions are
not evidence that the nine newer submissions failed.

At01:04–01:05UTC, owner-authorized
[`GET /api/v1/skills/-/scan/download/{name}?version=<version>&kind=skill`](https://github.com/openclaw/clawhub/blob/main/docs/http-api.md)
returns200 archives for all nine exact submitted versions listed above.
Every archive has static analysis v2.4.26, status clean and empty findings/reason
codes. ClawScan, SkillSpector, Endor and VirusTotal reports are all null. The
archive manifest's succeeded/writtenBack fields describe its stored-report
envelope; they do not establish a completed primary verdict or public release.
The accruals publish-attempt GET returns404, so that route supplies no usable
attempt diagnosis here. No rejection or specific scanner failure is observed.

The documented normal scan endpoint offers an independent publisher action.
One `POST /api/v1/skills/-/scan` per pending version requests its already-stored
artifact with source kind published, ownerHandle puncsky, exact version and
`update:true`. All nine requests return202 between01:05:54 and01:06:40UTC.
This creates scan jobs, without uploading files, creating versions or overriding
a verdict. At01:07:27–01:07:45UTC, all nine status GETs return200/queued,
writtenBack false, no lastError, queue positions2–10 and observed running0.
Queue acceptance is not scan success or promotion; the worker's availability
and cause of the wait remain unproven. Do not create duplicate manual jobs.

Receipts, exact-version report ZIPs, expanded JSON and publisher UI snapshots
are retained in ignored `scripts/skills/tmp/w6-publisher-review-20261022/`.
The existing publisher token is used only in HTTPS authorization headers and
is never persisted in that evidence. Continue from the saved scan IDs: inspect
returned results, act on concrete author guidance if present, then verify any
independently promoted target's public owner/version/bytes and supported host
install. All nine pending versions and m6 closeout remain open.


## Scan results and source repair — 2026-10-22 UTC

By01:42UTC all nine normal scan IDs above succeed with writtenBack true and no
lastError. A.I.G and static analysis are clean throughout; ClawScan is
clean/benign for ask/close/import/reconcile and suspicious for
accruals/add/migrate/roll-forward/trade. SkillSpector retains5–17 findings per
version, including claims about shared command examples. Close's earlier judge
failure and retry remain retained. These are results for the exact old
submissions, not verdicts on later source.

Following the concrete author guidance exposes two real contradictions:
local-only discovery routes to hosted tools, and an existing-ledger fallback
allows writes without validation. Suite0.3.8 corrects these plus stale broker,
migration-category and existing-entry metadata rules. Native before/after
controls and real CLI regression checks are recorded in the
[dated repair evidence](scope-contract-controls-20261022.md). Descriptions and
the115-request routing set are unchanged; the approved init scaffold remains.

The upstream API boundary is now established from pinned source: its attempt
GET serves packages only, so the skill404 does not diagnose a missing attempt.
Normal scan writeback updates evidence and does not finalize the staged
publication. The separate upstream pre-publication worker owns finalization;
no supported publisher skill-resume endpoint was found. A suspicious finding
alone is not proof of the observed hold. No maintainer operation or unsolicited
contact is performed.

All thirteen0.3.8 bundles have changed fingerprints and pass anonymous explicit
1.0.4 dry runs (119 authored files). Automatic versioning would collide with
nine existing pending slots. The protected workflow therefore supports an
explicit higher version for verified changed content while preserving the
ordinary unchanged skip. This preflight creates no submission or public release;
check actual protected receipts, promotion, authored bytes and supported native
installs independently before closeout. Do not re-upload byte-identical pending
content or request duplicate scan jobs.


## Protected 0.3.8 release — 2026-10-22 UTC

Source repair [1de39be41](https://github.com/bex-co/beancount-io/commit/1de39be4134da3b7a6e1098ca057b74f6635ff3f)
passes [complete skills CI39708859243](https://github.com/bex-co/beancount-io/actions/runs/39708859243):
37 checker tests,142 installer/recipe tests and38 published-minimum tests. Guidance
39708859025 and secret scan39708859059 also pass. The actual native boundary,
reconcile and init controls remain in the [dated repair record](scope-contract-controls-20261022.md).

Protected [run39708894097](https://github.com/bex-co/beancount-io/actions/runs/39708894097)
uses main 95851b631, whose skills/tooling/workflow bytes match the repair commit.
The existing authorized reviewer approves the unchanged main-only environment
with MIT-0 true and publisher puncsky verified. Every changed bundle submits
as 1.0.4; all 13 receipts are pending-publication, all 119 authored-file fingerprints
match the final local plans, and publisher-credential cleanup succeeds. No
byte-identical pending content or verdict override is submitted.

By 02:25 UTC, nine versions are independently public-exact: add, ask, close, import,
init, migrate, options, roll-forward, trade. Downloads match90 authored files and license
against the final119-file map. OpenClaw 2026.10.5 installs all nine with exact 90/90
files; eight audits are Safe and options is Review, permitted under normal policy
without force or acknowledgement. Hermes v0.22.4 installs seven with 72/72 files;
init 1.0.4 is refused Dangerous/18 findings, and import's first native fetch fails
before scanner output despite public exact-version ZIP HTTP 200. Its cause remains
under diagnosis. Separate standalone ask-only installs match 8/8 files per host;
current model-backed first-query follow-through is in progress. These outcomes
are not full-suite Hermes support or m6 closeout.

Accruals, importer-author, property, reconcile remain pending at that observation.
Their exact 1.0.4 owner report archives return HTTP 200 at 02:26 UTC, with clean static
v2.4.26/empty findings and null primary/supporting verdicts. The stored report's
synthesized succeeded manifest is not a completed primary scan or promotion.
The automatic publication service is making observable progress; continue each
newly eligible version without resubmission, duplicate scan jobs or force.

The PM milestone is live again for those actionable current-version checks.
Retained receipts, complete run logs, public ZIPs/file maps and actual host
outputs are in ignored `scripts/skills/tmp/w6-scope-contract-20261022/`.

### Current-version follow-through — 2026-10-22, 02:49 UTC

Importer-author 1.0.4 subsequently becomes public. The ten public current
versions now match 97/119 authored files: add, ask, close, import,
importer-author, init, migrate, options, roll-forward and trade. Native
OpenClaw 2026.10.5 (`1b58cb9`) installs all ten in one anonymous workspace with
97/97 files matching; nine audits are Safe, options is Review and permitted by
the default policy. No force or warning acknowledgement is used.

Hermes v0.22.4 (`4d04303818b6`) allows nine current versions with 90/90 files
matching. Eight are in the original suite profile; import is in a separate fresh
profile. Its original fetch failure remains recorded: generic stale-index
wording did not expose an HTTP status or establish a removed listing. Fresh
owner-qualified detail, exact-version ZIP and version metadata requests all
return 200, with 11/11 matching files. One documented native recovery then
installs import SAFE/ALLOWED with 11/11 matching files. The original failure's
transport cause remains unproven. Init 1.0.4 is still refused DANGEROUS with
18 findings, no installed directory and no force.

Both hosts separately install only the customer ask 1.0.4 bundle, with its eight
authored files and license exact, and complete a real first-query conversation.
Each executes published bea 0.3.1 and the June 2026 Expenses `sum(weight)` query,
returning untruncated rows: Groceries 141.60 USD, Gas 50.00 USD and Streaming
17.99 USD. Expected figures are scored after execution, not put in the prompts.
Both synthetic ledgers and installed skill bytes remain unchanged.

OpenClaw uses the explicitly selected embedded `openclaw` runtime,
`gpt-6.1-sol`, low thinking: exit 0 in 83.221 seconds, no runtime fallback.
Its native summary reports nine tool calls with zero failures; retained bridge
evidence has four outer envelopes and five inner calls. Hermes uses its native
gateway, existing-login `openai-codex` provider, `gpt-6.1-sol`, low reasoning:
exit 0 in 32.052 seconds, five completed tools and zero errors. Its first launch
exits 2 before inference because the gateway rejects `--run-budget`, despite
chat help advertising it. One source-backed launch recovery removes only that
optional flag, with the same provider/model/runtime and an outer timeout.
Initial TTY setup attempts and that pre-inference failure remain retained.

Official selective import mechanisms reuse the already-authorized existing
Codex login. Task credential stores and the exact task-created OpenClaw backup
are removed after verification; the original login is unchanged and no grant
is revoked. The separately retained native Cursor QA connection is untouched.
These are two synthetic query journeys, not general workflow or routing proof.

A fresh anonymous Hermes discovery cohort completes without retries. Default
search and `--source all --json --limit 30` expose the original eleven suite
names among fourteen results. The JSON result does not include the newly
public roll-forward listing, while public ClawHub search returns fifteen
results including roll-forward and those eleven. Explicit `--source clawhub`
still returns `[]` (exit 0, 30.478 seconds). Search results do not establish
installed versions; use owner-qualified installs and byte checks. The separate
[source-filter follow-up](https://github.com/bex-co/beancount-io/blob/a8fc3a8ee42b9166957cd7bff7d60f57bdf8bf77/.pm/w6/blocked/040.md) remains open.

For the three remaining exact 1.0.4 submissions, one supported normal
scan/writeback request per version is accepted at 02:39 UTC. By 02:45 UTC all
three succeed, `writtenBack: true`, with primary ClawScan clean/benign and
A.I.G clean/zero findings. Advisory findings remain in the complete reports;
the primary reviews explicitly recognize the preserved workflow scope and
approval/check rules. No duplicate request or verdict override is used.

| Remaining listing | Existing scan ID | Public observation at 02:48 UTC |
| --- | --- | --- |
| accruals 1.0.4 | `w170jgfc3vem0t06hxsqffy7j18gsyds` | Listing metadata returns 404. |
| property 1.0.4 | `w179576n1vmyrg7t0te7fzwnvh8grd5q` | Public latest remains 1.0.1. |
| reconcile 1.0.4 | `w1700b49z91d0m81196zq83n5n8grck3` | Public latest remains 1.0.2. |

Completed normal scan writeback does not finalize staged publication. ClawHub
must promote these existing submissions before their current-version public
byte checks and native installs can run. Do not resubmit identical content or
repeat completed scan jobs. m6 closeout still requires all thirteen current
versions and every written DoD, with Hermes compatibility gaps recorded.

Private evidence remains under the ignored scope-contract scratch directory:
`release-39708894097/`, `openclaw-current-1.0.4/`,
`openclaw-standalone-ask-1.0.4/`, and
`scopeFix/hermes-current-1.0.4/`. Root independently compares both completed
query tool JSON results and verifies the unchanged-ledger/source invariants.

## Final current-version verification — 2026-10-22 UTC

At 19:58 UTC, the three previously pending 1.0.4 listings are publicly available.
The final anonymous latest-metadata snapshot confirms publisher `puncsky` and
version 1.0.4 for all thirteen skills. Their immutable release archives and
installed authored files match the complete 119-file release map
`3c1e0c9c84e4d265f4f2014828f6aa6bbd83a448e604c8333a3455396451f5da`.
The customer skills, suite manifests and bundle builder remain unchanged from
the protected release at `95851b631` (suite 0.3.8).

The newly eligible installations use the same isolated, anonymous host profiles
and supported commands as the earlier controls:

| Skill / version | Authored files | OpenClaw 2026.10.5 | Hermes v0.22.4 source pin |
| --- | --- | --- | --- |
| beancount-accruals / 1.0.4 | 7 | Installed exactly; Safe | Installed exactly; SAFE / ALLOWED |
| beancount-property / 1.0.4 | 6 | Installed exactly; Safe | Installed exactly; SAFE / ALLOWED |
| beancount-reconcile / 1.0.4 | 9 | Installed exactly; Safe | Installed exactly; SAFE / ALLOWED |

All thirteen OpenClaw skills now coexist in one task workspace and match
119/119 authored files. Twelve supported Hermes skills match 112/112 files:
eleven in its suite profile and import in the previously documented recovery
profile. Init remains absent after its retained policy refusal; [039](../../.pm/w6/blocked/039.md)
continues to own that compatibility gap. The Hermes archive's native version
display limitation remains unchanged; the official v0.22.4 tag, commit
`4d04303818b6`, archive and lock hashes establish the tested source provenance.

One default Hermes search against the newly complete public catalog exits 0
and displays all thirteen suite identifiers among sixteen results. The rendered
Identifier column is reconstructed across wrapped lines; installed versions are
verified separately. This clears the earlier default-search omission. The
explicit-source behavior is not retried here and remains tracked in
[040](https://github.com/bex-co/beancount-io/blob/a8fc3a8ee42b9166957cd7bff7d60f57bdf8bf77/.pm/w6/blocked/040.md).

The earlier exact-1.0.4 standalone first-query results above remain the model-
backed evidence. This closeout makes no new model call, credential copy, grant,
upload, scan request, force install or policy override. Original failures and
the import recovery remain preserved. Private final metadata, native logs,
byte proofs, default-search output and local check results are retained under
ignored `scripts/skills/tmp/w6-m6-closeout-20261022/` in the shipping worktree
and the original scope-contract scratch directory.

The owner selects a single suite package as the future ClawHub publication
unit. These checks finish the already-submitted individual-skill milestone;
they do not establish a published or verified OpenClaw suite plugin. Existing
listings and evidence are retained for the subsequent distribution transition.

Closeout validation passes the current structural/fixture check, 37 checker
tests, all 142 installer/recipe/journey tests, and the agent-guidance check.
The suite tests retain expected rejection diagnostics; their final unittest
result is OK. No customer source, release version, dependency or lockfile changes
are needed for this documentation and board closeout.
