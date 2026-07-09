# w1 · m8 — Multi-leg transaction entry from Home

**Worker:** worker1 **Goal:** From Home, a split Quick Add button opens a multi-leg editor so any balanced N-posting beancount transaction (paychecks, split bills, reimbursements) can be captured on the phone, with the final leg auto-balancing. **Status:** todo

## Tasks (in order)

| id   | title                                                                 | est | depends_on |
| ---- | --------------------------------------------------------------------- | --- | ---------- |
| t001 | Split-button component + Home wiring (Quick Add ▾ with anchored menu) | 40m | —          |
| t002 | Multi-leg route + screen scaffold (date/payee/narration, Done header) | 40m | t001       |
| t003 | Legs list editor: account + signed amount rows, add/remove legs       | 60m | t002       |
| t004 | Auto-balance + validation: remainder footer, last-leg auto-fill       | 40m | t003       |
| t005 | Save N postings via `useAddEntriesToRemote` + refresh parity          | 30m | t004       |
| t006 | UX pass — light/dark, i18n, loading bg, safe area, analytics          | 40m | t005       |
| t007 | Simplify pass over multi-leg entry code                               | 30m | t006       |
| t008 | Unit tests for multi-leg balancing, postings builder, validation      | 40m | t006       |

## Definition of done

From Home, the user taps ▾ next to Quick Add and chooses multi-leg entry; builds a transaction with 3+ legs (add/remove), each an account plus signed amount in the operating currency; sees the running remainder with the final leg auto-balancing; Done stays disabled until the legs sum to zero; saving writes the transaction through `addEntriesToRemote` and it appears in Recent Transactions/Journal after refresh, round-tripping to valid beancount. Quick Add's one-tap path is unchanged. Light **and** dark correct, strings via `useTranslations()` from the English base, analytics on the new screen. `yarn test:unit` green.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-07-09 ("multi-legging transaction, entry from home screen as dropdown alongside Quick Add"); design confirmed interactively — split button, single-form editor, w1 placement.
- **Goal linkage:** Pillar 1 **Effortless capture** — paychecks, split bills, and reimbursements currently force users off the app entirely; Pillar 4 **Plain-text fidelity** — surfaces beancount's native multi-posting expressiveness, and everything written is a plain balanced transaction.
- **Expected outcome:** users can record any balanced transaction — not just two-account transfers — without leaving the phone; the capture front door becomes extensible (the same menu later hosts AI/receipt capture, pillar 2).
- **Why now:** zero backend work — `EntryInput.postings` already accepts N `PostingInput`s (quick add just hard-codes two in `add-transaction-next-screen.tsx`), so this is pure client work; the Home entry point was just reworked (m5), making this the right moment to make the single-purpose button extensible before m7 adds more Home tap-throughs. No new dependencies — the dropdown menu is built in-house with a RN `Modal`.

## Out of scope (v1)

Per-leg currencies and `@` price annotations (`PostingInput` has no price field — needs a schema change first), tags/links/metadata, `!` flag selection, editing existing multi-leg transactions.
