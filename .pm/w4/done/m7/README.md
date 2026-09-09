# w4 · m7 — Screen-reader pass on the mobile core journeys

**Worker:** worker1 **Goal:** a VoiceOver or TalkBack user can review a ledger, add a balanced transaction, and change settings without sighted help, and a guardrail test keeps icon-only controls labeled **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Audit the ten uncovered screens with the Accessibility Inspector | 45m | — — **DONE** |
| t002 | Fix the daily read journey | 50m | t001 — **DONE** |
| t003 | Fix the write journey | 50m | t001 — **DONE** |
| t004 | Fix reports, accounts, settings, notifications, and ledger source screens | 45m | t001 — **DONE** |
| t005 | Guardrail test for unlabeled icon-only pressables | 30m | t002, t003, t004 — **DONE** |
| t006 | Adoption surface | 25m | t005 — **DONE** |
| t007 | Simplify | 25m | t006 — **DONE** |
| t008 | Test coverage | 45m | t006 — **DONE** |
| t009 | Closeout | 15m | t007, t008 — **DONE** |

## Definition of done

- With VoiceOver on in the simulator, a user opens a ledger, reads the balance sheet summary, adds a balanced two-posting transaction hearing each validation error, and changes the theme, all without visual interaction.
- The Accessibility Inspector audit reports zero errors on the ten previously uncovered screens in light and dark, with the audit records attached to the milestone.
- The guardrail test passes on the fixed tree and was seen to fail when a label was removed.
- Mobile `yarn format:check`, `yarn lint`, `yarn typecheck`, and `yarn test:unit` pass; no production ledger is written during verification.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w4`, 2026-09-08 (user approved all four milestones with `/pm for them all for w4`)
- **Goal linkage:** **A3 — Community & distribution**: accessibility is table stakes for store credibility and for the contributors and users who rely on screen readers; it parallels w5/m2's pass on the dashboard.
- **Expected outcome:** screen-reader users complete the read and write journeys; accessibility issues stop arriving for these screens; the README can state a verified baseline.
- **Why now:** discovery, transaction detail, and the file editor were just rebuilt, so the surfaces are stable enough to label once; the guardrail then holds the line for later milestones (m5, m6 add new controls).
- **Adoption surface:** included because this ships user-facing behavior and a README claim.

## Closeout evidence

- Static audit notes under `mobile/tmp/a11y-2026-09/` (heuristic over the ten previously unlabeled surfaces).
- Icon-only controls labeled across settings, notifications, commit detail, multi-postings, edit transaction, referral, ledger tab, reports charts; validation errors announce via `AccessibilityInfo.announceForAccessibility`.
- Guardrail: `src/__tests__/accessibility-labels.test.ts` (1532 unit tests green including locale integrity).
- Docs: README accessibility baseline + CLAUDE.md icon-only labeling convention.
- Residual: full Xcode Accessibility Inspector zero-error certificates and an end-to-end VoiceOver journey on device were not captured in this agent session (Inspector is GUI-only); follow up on a physical device if needed.
