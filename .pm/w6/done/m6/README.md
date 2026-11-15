# w6 · m6 — Publish the ledger skills to ClawHub for OpenClaw and Hermes Agent

**Worker:** worker1 **Goal:** An OpenClaw or Hermes Agent user installs any `beancount-*` skill by name from ClawHub, and it works on its own without a Git checkout or this repository's link installer. **Status:** done

**Research date:** 2026-10-16. Sources: ClawHub's quickstart, how-it-works, and skill-format pages at `docs.openclaw.ai/clawhub/`; Hermes Agent's skills page at `hermes-agent.nousresearch.com/docs/user-guide/features/skills`. Re-check the CLI flags against `clawhub --help` and `hermes skills --help` before relying on them.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](done/t001.md) | Owner decision: ClawHub's MIT-0 terms and the publishing handle — **DONE** | 15m | — |
| [t002](done/t002.md) | Bundle each skill with the shared references it reads — **DONE** | 45m | — |
| [t003](done/t003.md) | Name the sibling skills each one hands off to, and how to get them — **DONE** | 30m | — |
| [t004](done/t004.md) | Declare `bea` and registry metadata in the frontmatter — **DONE** | 45m | — |
| [t005](done/t005.md) | Dry-run publish every bundle — **DONE** | 30m | t002, t003, t004 |
| [t006](done/t006.md) | Add the `Publish (clawhub)` workflow — **DONE** | 45m | t005 |
| [t007](done/t007.md) | Operator: ClawHub handle, token, and first publish — **DONE** | 30m | t001, t006 |
| [t008](done/t008.md) | Rehearse installs in OpenClaw and Hermes Agent — **DONE** | 45m | t007 |
| [t009](done/t009.md) | Document the registry installs — **DONE** | 30m | t001, t006, t008 |
| [t010](done/t010.md) | Adoption surface — **DONE** | 30m | t009 |
| [t011](done/t011.md) | Simplify — **DONE** | 30m | t010 |
| [t012](done/t012.md) | Test coverage — **DONE** | 45m | t010, t011 |
| [t013](done/t013.md) | Closeout after the listings are live — **DONE** | 15m | t008, t012, w3/m55/t002, w3/m55/t003, w3/m56/t002, w3/m56/t003, w3/m57/t003, w3/m57/t004 |

## Closeout — 2026-10-22 UTC

All thirteen current ClawHub listings are public as puncsky/1.0.4. The final
119-file public/archive/native comparison matches suite 0.3.8, unchanged from
protected release 95851b631. The three previously pending targets now install
normally in both hosts: accruals7files, property6files and reconcile9files.
All thirteen OpenClaw2026.10.5 installs coexist and match119/119files; twelve
supported Hermes v0.22.4 installs match112/112files across its suite and the
documented import-recovery profile. Init retains its separately accepted039
policy exception. Fresh default Hermes search displays all thirteen suite
identifiers among sixteen results; the explicit-source follow-up040 stays open.

The original exact1.0.4 standalone model-backed first queries remain valid and
preserved with their failure/recovery limits. No duplicate model call, upload,
scan job, credential copy, force install or policy bypass is performed here.
All named dependencies are done. Current structural/fixture validation,
37checker tests,142installer/recipe/journey tests and guidance checks pass.
The original DoD is satisfied with t008's documented compatibility exceptions;
t013 and this milestone are archived through /pm done.

Public results: [final verification](../../../../docs/skills/evidence/clawhub-rehearsal.md#final-current-version-verification--2026-10-22-utc).
Private metadata/native/default-search/byte/check evidence is retained under
ignored scripts/skills/tmp/w6-m6-closeout-20261022/ in the shipping worktree
and the original scope-contract scratch directory.

**Owner decision:** subsequent ClawHub distribution should publish one suite
package instead of continuing individual-skill releases. This closes the
already-submitted standalone release; it does not claim that a suite plugin
has been published or tested. Existing listings and historical evidence remain.

## Decisions — 2026-10-19

- **License:** the owner approved the explained `skills/LICENSE` MIT-0 scope and instructed implementation and continued work. The root `LICENSE` remains MIT. Customer instructions, references, and fixtures under `skills/` are MIT-0; each standalone registry bundle includes the canonical license. Tooling and guides outside that directory retain MIT.
- **Publisher:** use `puncsky`, verified from the existing authenticated ClawHub account's Organizations settings. This is the first-release selection under the owner's delegated continuation instruction; no organization or account was created.
- **Names:** retain current skill names for this release. w2/m39's measured routing evidence found no benefit from the proposed renames; a future explicitly requested readability rename can carry its own migration.
- **Hermes init:** preserve the existing consent-gated ledger-instruction scaffolding. Do not remove or obscure this feature to pass the host scanner; defer Hermes init support until the host has a compatible policy or the user later requests a workflow change. The remaining ten bundles are rechecked against the current inventory in this change.

## Block history

- **t013 synchronization (2026-10-20)** — Suite 0.3.3 is on main at `ac9510670`; protected run 39495559079 accepts all eleven updated bundles and cleans publisher credentials. All receipts are pending-publication and the post-run public API still returns the prior versions. Skills CI (39495528150), guidance and secret scanning pass. **Unblock:** ClawHub promotes the existing eleven submissions; the repository worker verifies latest versions, authored-file bytes and actual supported-host installs, then closes t013 after checking all DoD. No user input remains. Preserve init's approved workflow and do not republish pending content.

- **t013 (2026-10-20)** — The five bundles affected by the subsequent 0.3.2 wording audit were submitted as 1.0.1 in successful run 39393132904 from main `db23c44f1`; unchanged bundles were skipped and credentials cleaned. Reconcile 1.0.1 is now public, its nine authored files match current source and its OpenClaw install passes. Add/import/init/migrate still expose 1.0.0 at the final check. **Unblock:** ClawHub promotes these four remaining submissions, then the repository worker verifies versions, installed authored-file bytes and supported-host installs for all five changes and performs closeout. Who can clear it: ClawHub's publication service, then the repository worker. All local/hosted checks pass; no token, merge or model-authentication approval remains. Do not republish pending versions.

- **Publication / t007 cleared (2026-10-19)** — All eleven 1.0.0 listings are public and the full suite installs together in OpenClaw. [Run 39372550698](https://github.com/bex-co/beancount-io/actions/runs/39372550698), the supplied protected token, required environment review, and credential cleanup are verified. t007 is archived under `done/`; no publication, token, or merge prerequisite remains.

- **t008 cleared (2026-10-20)** — Authorized temporary authentication enabled real first-query turns in both hosts; both executed published bea 0.3.1 and returned the expected amounts without changing the synthetic ledgers. Default Hermes search now finds all eleven listings. The original login was unchanged and the temporary credential copies were removed. The task's acceptance expressly permits compatibility gaps with filed follow-ups: w6/039 retains the init policy gap and w6/040 retains source-filtered search. Default search plus a scanner-approved install satisfy the written milestone requirement; complete Hermes suite support is not claimed. The milestone is live again for t009 and its standing closing tasks.

## What the hosts need (checked 2026-10-16)

- **ClawHub** is OpenClaw's public registry for skills and plugins. A skill is one folder holding a `SKILL.md`, published with `clawhub skill publish <folder> --slug <slug> --name <name> --changelog <text>` (`--dry-run` previews it). The publisher signs in with GitHub, or with `clawhub login --token` in CI. Each publish is an immutable version: the first is `1.0.0`, later changes get the next patch version, and unchanged content is skipped. Users run `openclaw skills install @<handle>/<slug>`. A package scope must match the publisher's ClawHub handle exactly.
- **License.** ClawHub publishes every skill under `MIT-0` and has no per-skill override. The repository defaults to MIT; the owner has approved MIT-0 for `skills/` in [t001](done/t001.md).
- **Scanning.** ClawHub's security analysis compares declared metadata with what a skill actually does, and flags any environment variable used but not declared. A release held by moderation is hidden from search and install until resolved. Hermes runs its own scanner on every hub install: a `dangerous` verdict always blocks, and `--force` overrides only caution or warn findings.
- **Frontmatter.** OpenClaw reads `metadata.openclaw`: `requires.bins` and `requires.anyBins`, `requires.env`, `install` specs (`brew`, `node`, `go`, `uv`), `os`, `homepage`, and `emoji`. Hermes reads `platforms` and `metadata.hermes` (`tags`, `category`, `requires_tools`/`requires_toolsets`). `name` should match the folder: 1–64 lowercase letters, digits, or hyphens.
- **Hermes reaches ClawHub too.** `hermes skills search` and `install` read a `clawhub` source next to `skills-sh`, `lobehub`, GitHub taps, and `well-known` indexes, so one ClawHub listing serves both hosts. Hermes can also install one skill from a public repository path (`hermes skills install owner/repo/path/to/skill`). Its taps skip directories whose names start with `.`; since w2/m42 the suite sits at `skills/<name>/`, so that rule no longer applies to it (t008 checks the direct path).
- **One folder per install.** Each `beancount-*` skill names a sibling: every one points at `beancount-init/references/bea-cli.md`, and several hand off to `beancount-import` or `beancount-reconcile`. A ClawHub install brings in only the folder that was asked for, so today a single installed skill reads a contract that is not there (t002) and hands off to a skill the user may not have (t003).

## Definition of done

- Every `beancount-*` skill in the suite is live on ClawHub under the handle chosen in t001. Each listing's latest version matches the bundle built from `main`, and its scan state allows install.
- In a clean OpenClaw installation, `openclaw skills install @<handle>/beancount-ask` (alone) and the full suite both install. A first-query journey on a synthetic ledger answers from `bea --json query`, and the result is recorded with dates and versions.
- In a clean Hermes Agent installation, `hermes skills search beancount` finds the ClawHub listings, and an install passes Hermes's scanner without `--force`. Hermes's direct GitHub-path install either works or is documented as unsupported, with the reason.
- A skill installed alone states which sibling it hands off to and how to install it. It never reads a file that its bundle does not contain.
- The `Publish (clawhub)` workflow validates bundles on every pull request touching `skills/**`, and publishes only on an explicit dispatch from `main`, with a token from a protected environment. It never commits a token or prints it.
- Claude Code and Codex still list every suite skill from the existing link installer (`docs/skills/installation.md` step 3), and `python3 scripts/skills/ci-check.py` passes.
- `docs/skills/installation.md`, `skills/README.md`, `skills/AGENTS.md`, and the root `AGENTS.md` tooling list describe the ClawHub install, the workflow, and its secret.

## Source + Goal linkage

- **Source:** user request 2026-10-16 to list Beancount.io on OpenClaw and Hermes Agent, after a search found no such work on the board. Research the same day into ClawHub's publishing, skill-format, and moderation docs, and into Hermes Agent's skills-hub docs.
- **Goal linkage:** **A3 — Community & distribution.** ClawHub is the public registry both hosts search, as PyPI and the Homebrew tap are for `bea` and the official MCP Registry is for the hosted endpoint ([w2/m36](../../../w2/done/m36/README.md)). Secondary **A1 — Agent-native accounting**: two agent hosts beyond Claude Code and Codex can run the ledger workflows.
- **Expected outcome:** an OpenClaw or Hermes user types one install command and gets a working skill without cloning this repository. Signals: ClawHub install counts per skill, and `bea` installs that follow.
- **Why now:** the suite is rehearsed and stable on Claude Code and Codex ([w5/m3](../../../w5/done/m3/README.md), [w5/m9](../../../w5/done/m9/README.md), [w5/m10](../../../w5/done/m10/README.md)), and the only install path today is a sparse Git checkout plus a Python link script. Both hosts read ClawHub, so one listing reaches both. The single-folder gap (t002, t003) has to close before any registry publish, or the first installs read missing files. Adoption surface is included because the milestone changes the customer install guide, the skills catalog, and the skill frontmatter that agents read.

## Out of scope

- Hermes Agent's curated MCP catalog (`optional-mcps/` in its repository). Nous approves entries there, and the docs describe no community submission, so this milestone does not open a pull request against it ([DO_NOT_DO](../../../DO_NOT_DO.md): no unsolicited PRs to other repos).
- skills.sh, LobeHub, and other directories. A `/.well-known` skills index on `beancount.io`: Hermes documents `/.well-known/skills/index.json`, while the draft discovery RFC uses `/.well-known/agent-skills/index.json`. Revisit once the convention settles.
- An OpenClaw plugin package, and the hosted MCP endpoint on either host ([w6/m7](../m7/README.md)).
- Development skills under `.agents/skills/`. Only the customer `beancount-*` suite is published.

## Unblocked 2026-10-18; refreshed 2026-10-19

The milestone was parked on 2026-10-16 because dry-run task t005 depended on the owner's publication decision. ClawHub 0.23.3 supports token-free dry runs, so that preparatory dependency is removed; t006 can proceed while t001 waits. Eight bundles passed on the original layout on 2026-10-18. The branch is now based on current main, where the suite lives under `skills/` and tooling under `scripts/skills/`; t005 has now been re-run successfully against that current inventory.

## Publication sequencing

- t007 now depends explicitly on t001. The owner records MIT-0 approval and the publisher handle; the operator supplies the protected environment and token.
- Use the current skill names selected above for the first release; [w2/m39](../../../w2/blocked/m39/README.md)'s readability proposal is not a prerequisite for publication.
- Rebuild the suite and repeat the dry runs on the release commit. The inventory includes newly shipped skills automatically. t009 waits for t008 so printed install commands have actual host rehearsal evidence.
- Dry runs do not establish server moderation or clean OpenClaw/Hermes scanner acceptance; t007/t008 retain those checks.

## Workflow implementation 2026-10-19

`.github/workflows/publish-clawhub.yml` validates current bundles without credentials on relevant PRs/main pushes and on dispatch. Publication requires a manual dispatch from main, recorded owner approval, an explicit handle, and an environment token. Releases carry commit provenance. The branch adapts the earlier implementation to the current skills/tooling layout; the hosted ClawHub validation run now passes for all ten bundles ([run 39336904170](https://github.com/bex-co/beancount-io/actions/runs/39336904170)); its publish job is skipped. t006 is complete in [PR #181](https://github.com/bex-co/beancount-io/pull/181), implementation commit `20acffd19`.

## Main merge and environment preparation 2026-10-19

PR #181 merged at `387cca8122f9c3ddb17099db8b0540058920d812`. Its [main push run](https://github.com/bex-co/beancount-io/actions/runs/39341900916) and the [subsequent run at `51d1303e7`](https://github.com/bex-co/beancount-io/actions/runs/39344911064) both validate all ten current bundles; the publish jobs are skipped.

Created the `clawhub-publish` GitHub environment with the same required reviewer (`puncsky`) and review policy as `mcp-registry-publish`, and a custom deployment branch policy containing only `main` (branch, not tag). Read-back verifies both protections. No configuration variables or secrets exist in the new environment: its approval flag stays unset pending the owner's answer. The remaining operator setup is the chosen handle variable, the approval variable after its decision is recorded, and the account token. Environment creation does not satisfy t001 or the live-listing acceptance criterion in t007.

## Initial ten-skill Hermes preflight 2026-10-19

The independent portion of t008 now has real host evidence: direct GitHub ask installs under Hermes v0.22.2 but is incomplete on its own, and the full generated bundle trees have been scanned with Hermes's actual community-source policy. Three accidental inline-shell findings are corrected without changing the pending-transaction behavior. Nine bundles pass locally without force. Init's remaining critical finding is its intended ledger-instruction scaffolding; that feature is preserved pending the owner's compatibility decision. See [t008](done/t008.md) for versions, commands, limits, and the exact unblock condition.

## Current-suite dry-run evidence 2026-10-19

Based on main `7fc077c76`. From `scripts/skills/`, build with `python3 beancount-skills.py bundle tmp/clawhub-bundles`; then run each bundle through `clawhub --no-input skill publish <bundle> --slug <name> --dry-run --json` using pinned CLI 0.23.3 and a new unauthenticated config outside the bundles. The workflow's exact shell loop passes: all ten plans return `ok: true`, `would-publish`, and initial version `1.0.0`.

| Skill | Files | Result |
| --- | --- | --- |
| beancount-add | 5 | would-publish |
| beancount-ask | 7 | would-publish |
| beancount-close | 7 | would-publish |
| beancount-import | 9 | would-publish |
| beancount-importer-author | 6 | would-publish |
| beancount-init | 6 | would-publish |
| beancount-migrate | 11 | would-publish |
| beancount-options | 19 | would-publish |
| beancount-reconcile | 8 | would-publish |
| beancount-trade | 6 | would-publish |

These plans neither publish nor establish moderation/installation acceptance. The 2026-10-18 run covered the former eight-skill layout; this fresh run covers the current suite without freezing its count in the workflow.

## License packaging refresh — 2026-10-19

Refreshed on main `318cc0a7f`, which now contains eleven skills including `beancount-property`, and suite version 0.3.0. This change advances both manifests to 0.3.1 with MIT-0 metadata, declares the license in every customer skill, permits the canonical `skills/LICENSE` in the layout check, and copies that file into each standalone bundle. The earlier eight- and ten-skill dry runs remain historical evidence; first publication must use the current complete inventory.

## Eleven-skill licensed preflight — 2026-10-19

On main baseline `318cc0a7f` with this change, all eleven rebuilt bundles contain a byte-identical copy of `skills/LICENSE`, and all eleven pass pinned ClawHub 0.23.3 token-free publish dry runs. Hermes's actual `skills-guard-v10` at `d923a5eb` allows ten without force; only init retains its documented agent-instruction policy conflict. No skill descriptions changed.

| Skill | Bundle files | ClawHub dry run | Hermes community policy |
| --- | --- | --- | --- |
| beancount-add | 8 | would-publish | safe |
| beancount-ask | 8 | would-publish | safe |
| beancount-close | 9 | would-publish | safe |
| beancount-import | 11 | would-publish | safe |
| beancount-importer-author | 7 | would-publish | safe |
| beancount-init | 7 | would-publish | dangerous |
| beancount-migrate | 12 | would-publish | safe |
| beancount-options | 20 | would-publish | safe |
| beancount-property | 6 | would-publish | safe |
| beancount-reconcile | 9 | would-publish | safe |
| beancount-trade | 8 | would-publish | safe |

GitHub environment read-back confirms `CLAWHUB_OWNER=puncsky` and `CLAWHUB_MIT0_APPROVED=true`. The existing signed-in ClawHub account's API tokens settings explicitly show **No API tokens**, and GitHub lists no `CLAWHUB_TOKEN` secret. A labeled token form is prepared; no credential has been created. Creating persistent CLI access is the remaining operator action, followed by first publication from the reviewed main revision.

## Licensing merged and main validated — 2026-10-19

PR #182 merged at `6d10a07482bf271d596ab8dcf60783cff8f80cc9`. The [main ClawHub run](https://github.com/bex-co/beancount-io/actions/runs/39371492602) builds and dry-runs all eleven licensed bundles successfully; its publish job is skipped. [Agent guidance](https://github.com/bex-co/beancount-io/actions/runs/39371492583) and [secret scanning](https://github.com/bex-co/beancount-io/actions/runs/39371492628) also pass. The merge prerequisite is cleared.

Fresh environment and account read-backs still show no GitHub publishing secret and no ClawHub API tokens. The existing confirmation request covers creating `beancount-io-github-actions` for `puncsky` and storing it only as the protected environment's `CLAWHUB_TOKEN`; it remains unanswered. That confirmation is for new persistent account access, separately from ordinary code shipping. Further repository changes ship directly to main under the owner's instruction.

## First registry submission and live installs — 2026-10-19

The owner supplied an existing token through local ignored configuration. It was passed directly to GitHub's environment secret setter without printing or committing its value; no token was created by the assistant. Read-back verifies the secret metadata. The main-only environment approval was completed for the owner-authorized release, and [run 39372550698](https://github.com/bex-co/beancount-io/actions/runs/39372550698) succeeds, including credential cleanup.

All eleven submissions return 1.0.0, initially `pending-publication`. Real clean-host installs subsequently pass for nine skills in OpenClaw 2026.10.5 and eight in Hermes v0.22.2. Options and property remain pending; Hermes additionally rejects init. The [public rehearsal](../../../../docs/skills/evidence/clawhub-rehearsal.md) records per-skill outcomes, exact commands, standalone references/licenses, strict verification limits, and the successful published `bea` 0.3.1 control. New install guidance names only exercised commands and states the current incomplete-suite limits. No model credential was imported and no agent first-query turn has run yet.

**Subsequent promotion:** by 05:35 UTC on Oct 20, options is public at 1.0.0 and both host installs pass without force (OpenClaw audit Review, Hermes SAFE). Verified totals are now ten/nine; property alone remains pending. [Complete skills CI](https://github.com/bex-co/beancount-io/actions/runs/39374976210) passes on the shipped documentation baseline `dec916039`. The task and milestone stay blocked on the remaining explicit conditions above.

**Publication complete:** property subsequently becomes public at 1.0.0 and installs in both hosts (OpenClaw Review, Hermes SAFE). The original OpenClaw suite workspace now contains all eleven listings with canonical licenses and local CLI contracts; Hermes accepts ten, rejecting only init. t007's all-listings acceptance criterion is met and its file is archived under `done/`. t008 remains blocked on the retained init workflow and the operator's model-authentication choice; the milestone is not closed by the successful publication alone.

## Submission review cleared — 2026-10-20

All five 1.0.1 updates are public by 18:23 UTC, and all eleven latest downloads match the submitted release (105 authored files). The publication block above is historical. t013 is actionable again: synchronize later customer edits on main, retain published-CLI compatibility, verify the actual current bundles in supported hosts and then close. Hermes policy/search gaps remain separate in w6/039 and w6/040.

## Concurrent twelfth skill — 2026-10-20

Main adds `beancount-roll-forward` through active w3/m55 after the eleven-skill 0.3.3 dispatch. Its two-client evals/routing and adoption checks (t002/t003) are prerequisites for first registry publication; t013 records those dependencies. The catalog inventory/version repair advances the source plugin to 0.3.4 and passes structural, bundle and recipe checks. **Unblock:** the owning w3 worker completes those checks, the repository worker publishes and verifies roll-forward, and ClawHub promotes the eleven existing pending updates. No user input is needed.

## Resume evidence — 2026-10-20

The source inventory is now thirteen, including accruals and the later ask/close variance recipe. Suite 0.3.5 fixes catalog/version drift and the release checks' discovered valuation/recognition/identity gaps. Sixteen focused native Codex cases pass on `gpt-6.1-sol` with published bea 0.3.1; the former model's usage-limit failure is no longer a general Codex blocker. Claude Code now reports a weekly limit, so the changed instructions' Claude reruns and current routing/discovery remain pending. All thirteen final bundles dry-run successfully; Hermes allows twelve and retains init's documented policy conflict. Current owner reports show clean static analysis but absent remaining scanners for the two inspected pending versions, consistent with queued upstream prepublication work. See [t013](done/t013.md) and the [rehearsal](../../../../docs/skills/evidence/clawhub-rehearsal.md#thirteen-skill-release-preparation--2026-10-20) for exact evidence, limits and unblock conditions. No duplicate publication or new login was attempted.


## Synchronization review cleared — 2026-10-21 UTC

The 04:23 UTC anonymous API/download check verifies all eleven accepted suite 0.3.3 versions and all 105 authored files, including the newly promoted close/options 1.0.1. The earlier registry wait is cleared. Current source remains at thirteen skills/suite 0.3.5; no skill, script or client-gate source changed since the last validation ship.

A minimal native Claude Code 2.1.304 Sonnet request still returns first-party HTTP 429 `usage_limit_reached`, zero input/output tokens and the same weekly-limit message before inference. Thus t013 remains blocked on the current-source Claude and w3/m55–m57 adoption checks, followed by protected publication and current-content host verification. This is not an outstanding login or owner decision. The existing Codex evidence and recorded PDF first-open limitation remain unchanged. See [t013](done/t013.md) for current results and the exact unblock condition.


Close/options 1.0.1 subsequently pass fresh native installs in both supported hosts with all 29 authored files matching per host. This completes individual install verification of the accepted eleven-skill release alongside the prior results; Hermes init retains its recorded exception. See the [registry rehearsal](../../../../docs/skills/evidence/clawhub-rehearsal.md#eleven-synchronization-updates-public--2026-10-21-utc) for audit labels and retained scanner findings. No current thirteen-skill release or new authenticated agent-query journey is claimed.


## Independent task-level progress — 2026-10-21 UTC

The [current release preflight](../../../../docs/skills/evidence/clawhub-release-preflight-20261021.md) completes the fresh bundle equivalence, anonymous publication previews, thirteen-skill install/discovery, standalone Codex controls and protected-environment readiness portions of t013. Continue remaining substeps against their actual prerequisites; t013 remains open for the documented Claude/adoption, publication and current-host conditions.

The [variance follow-up](../../../../docs/skills/evidence/variance-release-controls-20261021.md)
adds the missing negative/bridge evals and corrects close's Report provenance
and executed-arithmetic gap. Four current Codex controls and all local owning
checks pass; suite 0.3.6 changes only close's body among the thirteen bundles.
Claude's one fresh 07:23 UTC probe still returns 429/zero tokens. Current Claude
validation and the subsequent release/host gates remain open.


## Unblocked — 2026-10-21

Verified source0.3.7 and final native routing are on main at703fe36ca. All six explicit w3 prerequisites are done; no owning whole-w3 milestone is closed by those records. Continue protected publication of nine changed/new bundles, skip four unchanged trees, verify each independently public candidate and supported-host install, then recheck DoD before closing t013. Prior quota/routing conditions above are retained as history.


## Blocked on actual 0.3.7 promotion — 2026-10-21 UTC

Source0.3.7 shipped directly at703fe36ca; complete skillsCI39678149471, guidance, secret scan and hosted thirteen-plan validation pass. All six named w3 prerequisites are done in separate main commits (d0b33bbdc,813ad9ae4,bd4d92747,1493b0023,c154bd7c5,2d7c6ae4c).

Protected run39679035375 from main5e1b38a2c succeeds after the owner-authorized environment review. It accepts nine exact-candidate fingerprints as pending-publication: accruals/roll-forward1.0.0, add/import/migrate/reconcile1.0.3, ask/close/trade1.0.2. Four unchanged versions are skipped; publisher-credential cleanup succeeds. No duplicate pending content is submitted.

The anonymous21:41UTC snapshot confirms unchanged importer-author/init/options/property public bytes40/40. Seven changed listings still expose prior public versions; the two first-release listings are not publicly available. None of the nine new/changed targets is eligible for an exact-current install yet. The unchanged four OpenClaw installs40/40 and three supported Hermes installs33/33 are retained; Hermes init remains the separate039 policy exception. Receipts do not establish publication or a native install.

**Unblock:** as soon as any accepted version becomes publicly available, the repository worker verifies that version's owner and authored bytes against the119-file candidate map and performs its supported native installs independently, without force. Do not wait for all nine to promote before working an eligible one. Close t013 only when all current-main bundles and every milestone DoD are verified; preserve the prior authenticated first-query provenance. **Who can clear it:** ClawHub's publication/moderation service, then the repository worker. No model-login, MIT-0, publisher/token, merge, native-routing or named-adoption answer remains. Do not resubmit byte-identical pending content.

## Publisher scan follow-through — 2026-10-22 UTC

Owner-authorized reports for all nine pending exact versions show clean static
analysis and null primary/supporting scanner reports. No current rejection
explanation appears in the inspected publisher UI. The worker requests one
documented normal scan/writeback per already-uploaded version; all nine return
202. At01:07UTC they remain queued, positions2–10, observed running0,
writtenBack false and no lastError. This is actual follow-through inside a
blocked milestone, not new versions or a verdict override. Saved scan IDs,
reports and limits are recorded in [t013](done/t013.md#publisher-scan-follow-through--2026-10-22-utc)
and the [rehearsal](../../../../docs/skills/evidence/clawhub-rehearsal.md#publisher-side-scan-diagnosis--2026-10-22-utc).
Continue existing jobs and every independently promoted version; do not submit
duplicate jobs. Public-byte/native-host verification and closeout remain open.


## Validated source remediation — 2026-10-22 UTC

All nine saved manual scan jobs complete/write back by01:42UTC; primary verdicts
are clean for ask/close/import/reconcile and suspicious for the other five.
This changes what can proceed: concrete local/hosted and unchecked-write
contradictions are repaired in suite0.3.8, with broker/category/dedup references,
reconcile statement-net/staged-open rules, and the generated13-workflow init
inventory aligned. Descriptions and115 routing requests remain unchanged.

The repair passes142 checkout tests,38 published-minimum recipes,37 checker
tests, structural/guidance validation, and actual native controls: six boundary
cases, four fresh16/18 reconciliation cases with real confirmations, and two
final init cases. Both reconciliation16 outcomes end green; both18 outcomes
retain the diagnosed red assertion/residual-1.10. Original defects, CLI/cache
failures and recovery limits are retained in the [dated evidence](../../../../docs/skills/evidence/scope-contract-controls-20261022.md).

All13 fingerprints differ from accepted0.3.7 content and pass explicit1.0.4 dry
runs (119 authored files, map SHA256
`3c1e0c9c84e4d265f4f2014828f6aa6bbd83a448e604c8333a3455396451f5da`).
The protected workflow can select this higher version without re-uploading
identical pending content; unchanged previews still skip. Repository work and
publication continue inside the blocked closeout. This is not a new user-input
gate, a scan override or evidence of public promotion.

**Unblock:** the repository worker performs the already-authorized protected
changed-content release, verifies actual receipts/fingerprints/cleanup, then
checks each independently eligible current version's public owner/bytes and
supported native host install. ClawHub owns staged publication finalization;
normal manual scan writeback alone does not finalize it. Close t013 only after
all current-main bundles and every milestone DoD hold. Preserve Hermes039/040
and original authenticated host-query limits. **Who can clear it:** repository
worker for the release and eligible checks; ClawHub for promotion; host policy
owners for their separately tracked compatibility gaps.


## Unblocked for current-version verification — 2026-10-22 UTC

The public-version condition changes: protected [run39708894097](https://github.com/bex-co/beancount-io/actions/runs/39708894097)
accepts all 13 changed 1.0.4 submissions from 95851b631 (source repair 1de39be41),
with all 119 authored-file fingerprints matching and credential cleanup green.
The complete source CI39708859243 also passes37 checker/142 suite/38 minimum-CLI
checks; guidance39708859025 and secret39708859059 pass.

By 02:25 UTC, nine exact current versions are public and90 authored files match:
add, ask, close, import, init, migrate, options, roll-forward, trade. All nine native
OpenClaw installs match90/90files; eight are Safe and options Review is allowed
under normal policy without force or acknowledgement. Each supported native
Hermes check proceeds independently; seven targets match72files, init retains
its18-finding Dangerous refusal, and import's first host download fails despite
an exact-version public ZIP HTTP 200. That transport discrepancy is being diagnosed;
no cause or successful retry is inferred. Standalone ask installs are verified
separately; current model-backed first queries are in progress.

Four 1.0.4 versions still need actual public promotion: accruals,
importer-author, property, reconcile. Their02:26 UTC owner-authorized stored
archives return HTTP 200 with clean static scans and null primary verdicts. The
synthesized report manifest is not publication proof. Normal automatic
publication is making observable progress; no identical re-upload, extra scan
job, verdict override or host bypass is performed.

The milestone returns to the live tree because public promotion makes local
verification actionable. The remaining four platform conditions stay recorded;
they do not stop native tests for eligible targets. Close t013 only after every
current-main listing and all written DoD hold. See the [release evidence](../../../../docs/skills/evidence/clawhub-rehearsal.md#protected-038-release--2026-10-22-utc).


## Current-version native verification — 2026-10-22, 02:49 UTC

Ten current1.0.4 versions are publicly exact (97/119 authored files), including
newly promoted importer-author. OpenClaw2026.10.5 installs all ten in one anonymous
workspace with97/97matching files: nine Safe, optionsReview allowed under normal
policy. Hermesv0.22.4 allows nine versions/90files across eight suite installs and
one separate import-recovery profile. Init remains Dangerous/18findings with no
installed directory. The original import fetch failure is retained; fresh exact
owner/version routes return200 and one documented native recovery succeeds.
Its original transport cause remains unproven.

Both separately installed ask1.0.4 bundles complete actual model-backed first
queries on published bea0.3.1: untruncated June Expenses rows141.60/50.00/17.99USD,
unchanged synthetic ledgers and all eight authored files. OpenClaw explicitly
uses its embedded runtime with no fallback. Hermes retains one pre-inference
unsupported-option failure and one source-backed launch recovery on the same
provider/model/runtime. Temporary imported auth copies are removed; the original
Codex login and the retained native Cursor QA grant are unchanged and unrevoked.
No new login consent is needed for these completed controls.

A genuinely changed public catalog permits one fresh Hermes discovery cohort:
default/all find the original eleven suite names among14results, explicit
ClawHub returns0, and public registry search includes the newly public
roll-forward absent from Hermes results. Keep039/040 independently open.

The three remaining existing1.0.4 submissions each receive one normal scan at
02:39UTC. By02:45 all succeed/write back, primaryclean/benign and AIGclean0:
accruals `w170jgfc3vem0t06hxsqffy7j18gsyds`, property
`w179576n1vmyrg7t0te7fzwnvh8grd5q`, reconcile
`w1700b49z91d0m81196zq83n5n8grck3`. At02:48 accruals metadata is404,
property publiclatest1.0.1 and reconcile1.0.2. Completed writeback is not staged
publication finalization. Do not duplicate jobs, uploads or override verdicts.

**Remaining condition:** ClawHub promotes these three existing versions; the
repository worker verifies exact public owner/version/bytes and supported native
installs, checks subsequent source changes and every DoD before closingt013.
All eligible current-version/model checks above are complete; continue the full
w6 queue audit before deciding whether any independent work remains. See the
[dated follow-through](../../../../docs/skills/evidence/clawhub-rehearsal.md#current-version-follow-through--2026-10-22-0249-utc).

## Blocked — remaining staged publication finalization, 2026-10-22 UTC

All currently eligible repository work is shipped and verified. Source repair
1de39be41 passes complete hosted CI39708859243; protected release39708894097
accepts all13changed1.0.4bundles/119authored fingerprints and cleans credentials.
Current host/query evidence ships1e611d415:10public/OpenClaw versions97files,
9supported Hermes versions90files, both standalone ask1.0.4 actual queries pass,
synthetic ledgers/source unchanged, original login and Cursor QA grant retained.
Hermes init/search gaps remain independently recorded in039/040; their latest
current-bundle/catalog controls are shipped without force or hidden retries.

Only these existing1.0.4versions lack current public/native proof: accruals,
property and reconcile. Their02:39UTC normal scan jobs all succeed/write back by
02:45, primaryclean/benign and AIGclean0. Keep the existing IDs:
`w170jgfc3vem0t06hxsqffy7j18gsyds`, `w179576n1vmyrg7t0te7fzwnvh8grd5q`,
`w1700b49z91d0m81196zq83n5n8grck3`, respectively. At02:48UTC accruals
metadata is404; property latest1.0.1 and reconcile1.0.2. Completed normal scan
writeback updates evidence but does not finalize staged publication. No
supported publisher skill-finalize route is established. No duplicate scan,
byte-identical upload or verdict override is needed.

**Unblock:** ClawHub promotes each of these existing current versions. The
repository worker then resumes each independently eligible target immediately:
verify public ownerpuncsky/latest1.0.4 and exact authored bytes against the
119-file release map, complete supported native installs without force, recheck
subsequent main changes and all milestone DoD, and close t013 only when those
criteria hold. **Who can clear it:** ClawHub publication service for promotion;
repository worker for verification and closeout. No token, source merge, model
login approval or failed local test is pending. Do not treat this one milestone
block as a reason to skip independent later w6 work.

All source and public-safe evidence is on main. Ignored scope-contract scratch
retains receipts, full scans, public/installed bundles, completed tool results
and byte maps; anonymous host workspaces remain ready for the three new targets.
Temporary imported auth copies are removed without revoking the original login
or the retained Cursor grant. There is no unshipped partial implementation.
