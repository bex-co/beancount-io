# w2 · m53 — Onboard an investor household, and prove it with a first-year journey

**Worker:** worker2 **Goal:** a new user with brokerage, crypto, and property accounts starts a ledger that already has the right accounts and booking methods, then follows one documented first-year journey — income, investments, a home, year-end gains — across the skills m49-m52 complete. **Status:** blocked (only t007; 102/103 need the remaining-client release gate)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| [t001](done/t001.md) | Add an investor account checklist and booking-method guidance to beancount-init — **DONE** | 60m | — |
| [t002](done/t002.md) | Write the first-year investor journey guide — **DONE** | 75m | t001, w2/m49/t001, w2/m50/t001, w2/m51/t003, w2/m52/t001 |
| [t003](done/t003.md) | Rehearse the first-year journey on both clients and write its verifier — **DONE with recorded failures/follow-ups** | 75m | t002 |
| [t004](done/t004.md) | Adoption surface — **DONE** | 30m | t003 |
| [t005](done/t005.md) | Simplify — **DONE** | 15m | t004 |
| [t006](done/t006.md) | Test coverage — **DONE** | 45m | t004, t005 |
| t007 | Closeout | 15m | t006 |

## Previous blocker

- **t003 onward (2026-10-20)** — t001, t002, and t003's verifier are shipped, and the first-year journey passes end to end on Claude Code (all eight verifier checkpoints; evidence in [t003](done/t003.md) and `docs/skills/first-year-rehearsal.md`). t003's acceptance requires the Codex rehearsal too, and Codex returns its account usage-limit error until 2026-11-17, so t004–t007 wait behind it. **Unblock:** Codex usage returns (2026-11-17); rerun the identical journey prompts on Codex, record the outcome in the rehearsal doc, close t003, then t004 (adoption) starts. **Who can clear it:** the operator (Codex usage).

## Definition of done

- A new investor household's init proposes the right investment/property accounts with booking methods explained and confirmed before any `open` is written; the rehearsed ledger passes `bea check` and takes a first trade with no extra opens.
- The first-year guide's every command runs verbatim; a deterministic verifier checks its exact ledger/git effects; both clients complete it in rehearsal with evidence recorded.

## Source + Goal linkage

- **Source:** user walkthrough as a personal investor (real estate, crypto, stocks, daily spending), 2026-10-19.
- **Goal linkage:** **A2 — Frictionless onboarding:** investors are the users most likely to bounce at setup (missing accounts, unexplained booking methods). **A3** for a publishable end-to-end proof that an agent can keep a real household's books.
- **Expected outcome:** an investor goes from zero to a correct, complete household ledger by following one document. Signals: guide completion in rehearsal on both clients, init-skill invocations choosing investment accounts.
- **Why now:** Sequenced last on purpose: it is the integration proof for m49-m52, and each of its stages names the milestone task that makes it possible.


## Codex outcome — 2026-11-08

The quota blocker is cleared. t003 completes its recorded-failure alternative:
published main's close artifact failure is retained in 102; an unpublished
stdin fix completes a fresh eight-checkpoint journey. Follow-up 103 records
the published-minimum report capability gap and a passing fresh BQL fallback
rehearsal. Candidate commits and precise runtime distinctions are preserved
in the rehearsal record. No fresh Claude validation or candidate publication
is claimed. Adoption is complete; simplify and coverage are complete; final closeout must
wait for the affected both-client release gates in 102/103.


## Closeout blocked — 2026-11-08

All independent Codex, adoption, simplify and coverage tasks are complete.
Published-main close/report failures remain explicit in 102/103; fixes pass
Codex on a preserved unshipped candidate, and the verifier regression ships
in `4f05ca363`. Both-client validation of the final instructions is still
required before release/archival. **Unblock:** normal Claude login, combined
candidate rebase/version bump, affected both-client checks and green release
CI, then close t007. **Owner:** client login by owner, verification/shipping by
worker. This replaces the obsolete Codex quota blocker.
