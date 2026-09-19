# w4 · m19 — Preserve URL fragments in login continuations

**Worker:** worker1 **Goal:** Return visitors to the correct public ledger or profile after login. **Status:** todo (t001–t005 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Serialize Star and Follow continuations correctly — **DONE** | 30m | — |
| [t002](./done/t002.md) | Align guarded login continuation producers — **DONE** | 25m | t001 |
| [t003](./done/t003.md) | Adoption surface — **DONE** | 15m | t002 |
| [t004](./done/t004.md) | Simplify — **DONE** | 15m | t003 |
| [t005](./done/t005.md) | Test coverage — **DONE** | 30m | t003, t004 |
| [t006](./t006.md) | Closeout | 10m | t005 |

## Definition of done

Star, Follow and both eligible guarded login continuations serialize available path, query and fragment correctly, including query-plus-fragment and fragment-only destinations. The observed time-filter and username corruption no longer occurs. Unsafe continuation rejection, plain-path behavior and server fragment limitations remain intact. Meaningful tests and dashboard checks pass; public browser replay confirms emitted targets. Authenticated completion must be verified with an authorized QA session before claiming that end-to-end coverage.

## Source + Goal linkage

- **Source:** Repeated dashboard QA on 2026-09-17; [reproductions and source trace](./FINDINGS.md).
- **Goal linkage:** A2 — Frictionless onboarding: visitors can enter login from shared anchored ledger/profile links without losing their intended destination.
- **Expected outcome:** Star and Follow entry points emit valid return URLs instead of invalid time filters or corrupted usernames.
- **Why now:** The existing continuation feature is shipped, but all three producers use the same incorrect router hash assumption. Coordinated repair and regression coverage exceed one hour (125 minutes).
- **Adoption surface:** Included because these are visible public-to-login entry points; no new skill or package is added.
