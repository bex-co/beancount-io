# w5 · m11 — Publish the CLI fixes required by the migration journey

**Worker:** worker1 **Goal:** users installing from PyPI or Homebrew receive the migrated-history deduplication and empty-lot-cost response fixes **Status:** in progress (t001–t002 done)

**Estimate:** 3h15m implementation; 5h including standing closing tasks (8 tasks). Priority 1 in the approved proposal.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Prepare the release version and user-facing change record — **DONE** | 45m | — |
| t002 | Cover migration identities and empty lot costs in installed smoke checks — **DONE** | 60m | w5/m11/t001 |
| t003 | Validate the exact release artifacts through existing installation gates | 45m | w5/m11/t002 |
| t004 | Publish and verify the CLI on PyPI and Homebrew | 45m | w5/m11/t003 |
| t005 | Adoption surface | 25m | w5/m11/t004 |
| t006 | Simplify | 20m | w5/m11/t005 |
| t007 | Test coverage | 45m | w5/m11/t005, w5/m11/t006 |
| t008 | Closeout | 15m | w5/m11/t006, w5/m11/t007 |

## Definition of done

- A new CLI release containing `7302b907` (migration identity matching) and `06b2aa51` (empty lot cost JSON serialization) is available from both PyPI and the public Homebrew tap.
- Frontend and engine version declarations agree, generated locks are produced through package tooling, and the release tag identifies the intended main-branch commit.
- The exact wheel/sdist pass existing required package and clean installation gates. Public-channel installations identify the intended version/artifacts and pass the customer smoke checks.
- Overlap-only imports from both sides of a migrated transfer add no transactions and preserve ledger bytes; genuinely new activity writes once and reimport is a no-op. A valid empty-lot-cost write returns parseable JSON after exactly one correct ledger write.
- Release notes state the practical fixes; installation and upgrade instructions remain accurate. Workflow, artifact identity, and public-install verification evidence is recorded without credentials or personal ledger data.
- The published version is recorded as the release prerequisite for m10. This milestone does not claim m10's agent acceptance is complete: its existing published-install rehearsals, guide caveat update, and closeout remain there.

## Source + Goal linkage

- **Source:** `/pm-brainstorm more for w5`, all three proposals approved with `$pm all for w5` on 2026-09-28; [w5/020](../done/020.md), [w5/018](../done/018.md), [m10's release blocker](../blocked/m10/README.md), and [the existing CLI release procedure](../../../cli/docs/RELEASING.md).
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
