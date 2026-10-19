# w6 · m6 — Publish the ledger skills to ClawHub for OpenClaw and Hermes Agent

**Worker:** worker1 **Goal:** An OpenClaw or Hermes Agent user installs any `beancount-*` skill by name from ClawHub, and it works on its own without a Git checkout or this repository's link installer. **Status:** blocked (t002–t006 done; publication waits on owner decisions and operator setup)

**Research date:** 2026-10-16. Sources: ClawHub's quickstart, how-it-works, and skill-format pages at `docs.openclaw.ai/clawhub/`; Hermes Agent's skills page at `hermes-agent.nousresearch.com/docs/user-guide/features/skills`. Re-check the CLI flags against `clawhub --help` and `hermes skills --help` before relying on them.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Owner decision: ClawHub's MIT-0 terms and the publishing handle — **BLOCKED** | 15m | — |
| [t002](done/t002.md) | Bundle each skill with the shared references it reads — **DONE** | 45m | — |
| [t003](done/t003.md) | Name the sibling skills each one hands off to, and how to get them — **DONE** | 30m | — |
| [t004](done/t004.md) | Declare `bea` and registry metadata in the frontmatter — **DONE** | 45m | — |
| [t005](done/t005.md) | Dry-run publish every bundle — **DONE** | 30m | t002, t003, t004 |
| [t006](done/t006.md) | Add the `Publish (clawhub)` workflow — **DONE** | 45m | t005 |
| t007 | Operator: ClawHub handle, token, and first publish — **BLOCKED** | 30m | t001, t006 |
| t008 | Rehearse installs in OpenClaw and Hermes Agent | 45m | t007 |
| t009 | Document the registry installs | 30m | t001, t006, t008 |
| t010 | Adoption surface | 30m | t009 |
| t011 | Simplify | 30m | t010 |
| t012 | Test coverage | 45m | t010, t011 |
| t013 | Closeout after the listings are live | 15m | t008, t012 |

Two tasks need someone with authority this repository does not have: t001 is the owner's decision, and t007 needs the operator's ClawHub account and token. If either waits, park it with `/pm block` and keep the code tasks moving. t013 waits for both.

## Blocked

- **Milestone / t007 (2026-10-19)** — all remaining tasks wait on t001 or the first publish. Preparation t005/t006 is complete in [PR #181](https://github.com/bex-co/beancount-io/pull/181), with ten hosted dry runs passing at `20acffd19`. Shipped baseline t002–t004 remains `6a3e99a4`, `313fe145`, `155e3135`. **Unblock:** the owner records MIT-0 approval and the publisher handle, resolves the naming decision in w2/m39, and the operator configures the reviewed main-only publishing environment after the workflow reaches main. Then resume at t007. **Who can clear it:** the repository owner and publishing operator. No license, owner, token, environment, or live listing was created by this preparation.

- **t001 (2026-10-16)** — needs the repository owner's decision, which this repository cannot make. ClawHub publishes every skill under `MIT-0` with no per-skill override, and `LICENSE` here is MIT. MIT-0 drops the requirement to keep the copyright and permission notice. The owner must also choose which ClawHub handle (and so which install scope, `@<handle>/beancount-*`) publishes the suite. No decision on either is recorded on the board, in an ADR, or in a commit. Preparation t005/t006 can proceed without it; publication t007 onward waits. **Unblock:** the owner states (1) whether the suite's skills may be published under MIT-0 and (2) the publishing handle, and t001 records both under `## Decisions`. If the owner declines MIT-0, block the milestone with that reason. **Who can clear it:** the repository owner.

## What the hosts need (checked 2026-10-16)

- **ClawHub** is OpenClaw's public registry for skills and plugins. A skill is one folder holding a `SKILL.md`, published with `clawhub skill publish <folder> --slug <slug> --name <name> --changelog <text>` (`--dry-run` previews it). The publisher signs in with GitHub, or with `clawhub login --token` in CI. Each publish is an immutable version: the first is `1.0.0`, later changes get the next patch version, and unchanged content is skipped. Users run `openclaw skills install @<handle>/<slug>`. A package scope must match the publisher's ClawHub handle exactly.
- **License.** ClawHub publishes every skill under `MIT-0` and has no per-skill override. This repository is MIT. MIT-0 drops MIT's attribution requirement, so publishing is a licensing decision for the owner (t001).
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
- Resolve [w2/m39](../../../w2/blocked/m39/README.md)'s naming decision before issuing permanent registry slugs. Its routing evidence currently found no benefit from renaming; keeping current names and completing an approved rename are both possible owner decisions. This milestone does not make that decision.
- Rebuild the suite and repeat the dry runs on the release commit. The inventory includes newly shipped skills automatically. t009 waits for t008 so printed install commands have actual host rehearsal evidence.
- Dry runs do not establish server moderation or clean OpenClaw/Hermes scanner acceptance; t007/t008 retain those checks.

## Workflow implementation 2026-10-19

`.github/workflows/publish-clawhub.yml` validates current bundles without credentials on relevant PRs/main pushes and on dispatch. Publication requires a manual dispatch from main, recorded owner approval, an explicit handle, and an environment token. Releases carry commit provenance. The branch adapts the earlier implementation to the current skills/tooling layout; the hosted ClawHub validation run now passes for all ten bundles ([run 39336904170](https://github.com/bex-co/beancount-io/actions/runs/39336904170)); its publish job is skipped. t006 is complete in [PR #181](https://github.com/bex-co/beancount-io/pull/181), implementation commit `20acffd19`.

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
