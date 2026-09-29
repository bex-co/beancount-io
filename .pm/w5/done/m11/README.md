# w5 · m11 — Publish the CLI fixes required by the migration journey

**Worker:** worker1 **Goal:** users installing from PyPI or Homebrew receive the migrated-history deduplication and empty-lot-cost response fixes **Status:** done

**Estimate:** 3h15m implementation; 5h including standing closing tasks (8 tasks). Priority 1 in the approved proposal.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Prepare the release version and user-facing change record — **DONE** | 45m | — |
| t002 | Cover migration identities and empty lot costs in installed smoke checks — **DONE** | 60m | w5/m11/t001 |
| t003 | Validate the exact release artifacts through existing installation gates — **DONE** | 45m | w5/m11/t002 |
| t004 | Publish and verify the CLI on PyPI and Homebrew — **DONE** | 45m | w5/m11/t003 |
| t005 | Adoption surface — **DONE** | 25m | w5/m11/t004 |
| t006 | Simplify — **DONE** | 20m | w5/m11/t005 |
| t007 | Test coverage — **DONE** | 45m | w5/m11/t005, w5/m11/t006 |
| t008 | Closeout — **DONE** | 15m | w5/m11/t006, w5/m11/t007 |

## Definition of done

- A new CLI release containing `7302b907` (migration identity matching) and `06b2aa51` (empty lot cost JSON serialization) is available from both PyPI and the public Homebrew tap.
- Frontend and engine version declarations agree, generated locks are produced through package tooling, and the release tag identifies the intended main-branch commit.
- The exact wheel/sdist pass existing required package and clean installation gates. Public-channel installations identify the intended version/artifacts and pass the customer smoke checks.
- Overlap-only imports from both sides of a migrated transfer add no transactions and preserve ledger bytes; genuinely new activity writes once and reimport is a no-op. A valid empty-lot-cost write returns parseable JSON after exactly one correct ledger write.
- Release notes state the practical fixes; installation and upgrade instructions remain accurate. Workflow, artifact identity, and public-install verification evidence is recorded without credentials or personal ledger data.
- The published version is recorded as the release prerequisite for m10. This milestone does not claim m10's agent acceptance is complete: its existing published-install rehearsals, guide caveat update, and closeout remain there.

## Source + Goal linkage

- **Source:** `/pm-brainstorm more for w5`, all three proposals approved with `$pm all for w5` on 2026-09-28; [w5/020](../../done/020.md), [w5/018](../../done/018.md), [m10's release blocker](../../blocked/m10/README.md), and [the existing CLI release procedure](../../../../cli/docs/RELEASING.md).
- **Goal linkage:** **A1 — Agent-native accounting**, **A2 — Frictionless onboarding**, and **A3 — Community & distribution**. Ordinary PyPI/Homebrew users gain the fixes already proven in source builds.
- **Expected outcome:** successful migration-overlap and empty-lot-cost workflows on publicly installed artifacts; publication enables m10's final newcomer-install acceptance. Source tests alone are insufficient.
- **Why now:** m10's implementation and source-built client rehearsals are complete, but the recorded 0.3.0 public install lacks the migration repair. w5 has capacity and this directly clears an adoption blocker.
- **Adoption surface:** included because the published CLI, release notes, and installation guidance are customer- and agent-facing.

## Boundaries and execution

- Reuse the existing tag-driven publication workflow, artifact installation matrix, and public-channel smoke checks; do not create another release system. Implementation belongs in `cli/`, with root discovery pointers only as needed. Use `cli/tmp/` for scratch work.
- Select the next available patch version at execution time after checking actual release state. Never hand-edit locks or add dependencies for this work.
- Production publication is part of the approved milestone scope. This board-materialization operation only records the work; it does not itself tag or publish a release.
- Existing publishing permissions are required. If an actual credential or registry blocker occurs, record the exact unblock condition and owner. Recover partial publication through the existing documented procedure without overwriting published artifacts.
- Required implementation and artifact tests run before t004 publishes. Standing review tasks retain the canonical board order; any subsequent runtime fix needs a new version, not a replacement artifact.
- m10 stays blocked until its recorded release prerequisite is actually satisfied. After publication, resume its four overlap/new-import checkpoints in both clients using a public install and complete its own closeout. Do not copy those tasks into m11 or remove its caveat prematurely.
- Inbox 021 and 022 are independent. m5 and 015 retain their existing external blockers.

## Release evidence

### Candidate validation (t003), 2026-09-28

- **Candidate:** `cli/` at `152ace62`, version `0.3.1`. It contains `7302b907` (w5/020) and `06b2aa51` (w5/018). Later commits before the tag change only `.pm/`.
- **Local gates on macOS 26.5.1 arm64:**
  - `make check-all` passed: 2068 passed, one existing conditional skip.
  - `make release-artifacts` built the wheel (sha256 `93a66aea2541e99de4a2ef60bfbb5079cf80fe4dea12649a82535e79cab81c76`) and the sdist (sha256 `9b1b68235b62db114dd0017e85c06af872282f50675790d55f376ddbddfdaa49`).
  - `scripts/test-install.py` passed on the wheel (uv tool) and the sdist (pip), each running the 94-command installed smoke. That smoke now includes the migrated-history and empty-lot-cost checks.
  - `scripts/test-homebrew.sh` passed on the sdist.
- **CI:** the `CI (cli)` run `36442659256` on `152ace62` passed. It covered the unit suite and the full installation matrix: wheel and sdist on ubuntu, macOS and Windows with Python 3.12 and 3.14, plus Homebrew on macOS and ubuntu.
- **Tag build:** the release workflow rebuilds artifacts from the tag and re-runs the same gates, so the published hashes are recorded after t004.

### Publication (t004), 2026-09-28

- **Tag:** `cli-v0.3.1` on `7d5d4acf` (`main`). Its `cli/` tree is identical to the validated `152ace62`.
- **Workflow:** `Release (cli)` run `36445445618` succeeded. It ran build and validate, the full installation matrix, and publish to both channels. The post-publication checks ("Verify published PyPI install" on ubuntu, macOS and Windows; "Verify published Homebrew install" on macOS and ubuntu) all passed.
- **PyPI:** `beancount-io` 0.3.1 serves the wheel (sha256 `93a66aea…c81c76`) and the sdist (sha256 `9b1b6823…fdaa49`). Both are byte-identical to the t003 candidates.
- **Homebrew:** `bex-co/homebrew-tap` `Formula/bea.rb` declares version `0.3.1` and pins that PyPI sdist by the same sha256.
- **Independent check:** a clean `uv tool install beancount-io==0.3.1` from public PyPI in an isolated tool directory reported `bea 0.3.1` and passed the 94-command installed smoke, including the migrated-history and empty-lot-cost checks. Homebrew public installs were verified by the workflow's published-install jobs; this machine's existing `bea` keg was not modified.
- **Release notes:** the GitHub Release at `cli-v0.3.1` carries the practical-fix notes from `cli/docs/RELEASING.md`.
- **m10:** `beancount-io` 0.3.1 is the published release that satisfies m10's recorded prerequisite. m10's own published-install rehearsals, guide caveat update, and closeout remain in m10.
