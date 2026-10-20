# w6 · m6 — Publish the ledger skills to ClawHub for OpenClaw and Hermes Agent

**Worker:** worker1 **Goal:** An OpenClaw or Hermes Agent user installs any `beancount-*` skill by name from ClawHub, and it works on its own without a Git checkout or this repository's link installer. **Status:** blocked (t001–t006 done; publication needs a token and the licensing change on main; Hermes init awaits host-policy compatibility)

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
| t007 | Operator: ClawHub handle, token, and first publish — **BLOCKED** | 30m | t001, t006 |
| t008 | Rehearse installs in OpenClaw and Hermes Agent — **BLOCKED** (partial preflight recorded) | 45m | t007 |
| t009 | Document the registry installs | 30m | t001, t006, t008 |
| t010 | Adoption surface | 30m | t009 |
| t011 | Simplify | 30m | t010 |
| t012 | Test coverage | 45m | t010, t011 |
| t013 | Closeout after the listings are live | 15m | t008, t012 |

## Decisions — 2026-10-19

- **License:** the owner approved the explained `skills/LICENSE` MIT-0 scope and instructed implementation and continued work. The root `LICENSE` remains MIT. Customer instructions, references, and fixtures under `skills/` are MIT-0; each standalone registry bundle includes the canonical license. Tooling and guides outside that directory retain MIT.
- **Publisher:** use `puncsky`, verified from the existing authenticated ClawHub account's Organizations settings. This is the first-release selection under the owner's delegated continuation instruction; no organization or account was created.
- **Names:** retain current skill names for this release. w2/m39's measured routing evidence found no benefit from the proposed renames; a future explicitly requested readability rename can carry its own migration.
- **Hermes init:** preserve the existing consent-gated ledger-instruction scaffolding. Do not remove or obscure this feature to pass the host scanner; defer Hermes init support until the host has a compatible policy or the user later requests a workflow change. The remaining ten bundles are rechecked against the current inventory in this change.

## Blocked

- **Milestone / t007 (2026-10-19)** — t001–t006 are complete. PR #181 shipped the workflow at `387cca812`; the reviewed `clawhub-publish` environment permits only `main`. The owner has approved MIT-0 and the existing ClawHub publisher is `puncsky`. **Unblock:** merge the licensing/package changes, supply the `CLAWHUB_TOKEN` environment secret, rebuild and dry-run the release commit, and dispatch the first publication. `CLAWHUB_OWNER=puncsky` and `CLAWHUB_MIT0_APPROVED=true` are the corresponding environment variables. **Who can clear it:** the repository maintainer and publishing operator. No token or live listing has been created by this work.

- **t008 (2026-10-19)** — Hermes v0.22.2 rejects init's intentional ledger `AGENTS.md` creation. The product behavior is retained by the release decision above. **Unblock:** compatible host-policy support for the existing init workflow, plus t007's live registry bundles, permits the complete host install and first-query rehearsal. **Who can clear it:** the Hermes maintainer for host policy and the publishing operator for t007. Local scanner preflights remain distinct from live moderation and installation acceptance.

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
- An OpenClaw plugin package, and the hosted MCP endpoint on either host ([w6/m7](../../done/m7/README.md)).
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

The independent portion of t008 now has real host evidence: direct GitHub ask installs under Hermes v0.22.2 but is incomplete on its own, and the full generated bundle trees have been scanned with Hermes's actual community-source policy. Three accidental inline-shell findings are corrected without changing the pending-transaction behavior. Nine bundles pass locally without force. Init's remaining critical finding is its intended ledger-instruction scaffolding; that feature is preserved pending the owner's compatibility decision. See [t008](t008.md) for versions, commands, limits, and the exact unblock condition.

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
