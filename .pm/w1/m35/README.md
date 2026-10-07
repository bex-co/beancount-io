# w1 · m35 — Verify and resolve the review findings on the ADR 019 work

**Worker:** worker1 **Goal:** every finding from the 2026-10-07 review of w1/m30–m33 is verified, then either fixed with a regression test or abandoned with its evidence on record **Status:** in progress (t001–t010 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Consent requester survives a non-JSON backend reply — **DONE** | 30m | — |
| [t002](./done/t002.md) | Prompt assertions match wording, not line wrapping — **DONE** | 30m | — |
| [t003](./done/t003.md) | One lifetime profile per client class decides whether a grant slides — **DONE** | 45m | — |
| [t004](./done/t004.md) | Is the mobile special case in shouldRotateRefreshToken still needed? — **DONE** | 20m | — |
| [t005](./done/t005.md) | List-tool executors match their siblings' idioms — **DONE** | 20m | — |
| [t006](./done/t006.md) | Derive read-only annotations from the op class — **DONE** | 45m | — |
| [t007](./done/t007.md) | securitySchemes: pin the SDK hook and compute once — **DONE** | 30m | — |
| [t008](./done/t008.md) | Conformance checks share one metadata discovery — **DONE** | 30m | — |
| [t009](./done/t009.md) | Split oidc-route.test.ts by flow and dedupe its helpers — **DONE** | 60m | — |
| [t010](./done/t010.md) | Simplify — **DONE** | 30m | t001–t009 |
| [t011](./t011.md) | Test coverage | 45m | t001–t009, t010 |
| [t012](./t012.md) | Closeout | 15m | t011 |

Each implementation task follows the same verdict rule: verify first, then fix and ship (confirmed), close with `## Closed by triage` evidence (refuted), or `/pm drop` with the reason (confirmed but not worth it).

## Definition of done

- Each of t001–t009 has a `## Verdict` with evidence, and is either done (fixed with a regression test, or refuted with evidence) or dropped with a tombstone below.
- A non-JSON upstream reply to `/oauth/consent/requester` cannot produce a 500 (t001), unless refuted.
- `yarn typecheck`, `yarn lint`, and `yarn test` pass in backend-v2 and dashboard, and the parity gate stays at zero gaps.

## Source + Goal linkage

- **Source:** code review of the last 24 hours on `main` (2026-10-07, `105fb9a0`..`4c396d34`): w1/m30–m33 and note 170, implementing ADR 019 D2–D8.
- **Goal linkage:** **A1 — Agent-native accounting**: the MCP sign-in, consent, and tool-listing paths that m30–m33 built are what every agent host goes through. This milestone hardens one failure path on them (t001) and keeps the code that decides session lifetimes, rotation, and tool annotations derivable from one source.
- **Expected outcome:** the consent page never 500s on a bad upstream reply; future ADR 019 follow-ups (m34 host runs, directory reviews) change one profile or one table rather than three scattered checks; prompt edits stop shipping red.
- **Why now:** the code is fresh and m30/m31/m34 are waiting on a deploy, so it can be cleaned up before real hosts exercise it. **Adoption surface is omitted:** nothing here changes a documented user- or agent-facing surface. t001 changes only an error status code, and every other task is an internal refactor or test.
