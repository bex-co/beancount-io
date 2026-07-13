# w1 · m10 — AI receipt capture from the Quick Add menu

**Worker:** worker1 **Goal:** Photograph a receipt, get a proposed transaction, review, confirm, done — the first pillar-2 (AI) feature in the app. AI proposes; the user confirms; nothing is written without review. **Status:** done

## Tasks (in order)

| id   | title                                                                          | est | depends_on | —        |
| ---- | ------------------------------------------------------------------------------ | --- | ---------- | -------- |
| t001 | GraphQL ops + codegen: upload URL, parse, insert, `aiCfoUsage`                 | 25m | —          | **DONE** |
| t002 | "Scan receipt" menu item + camera/library image acquisition (⚠ new dependency) | 35m | w1/m8/t001 | **DONE** |
| t003 | Upload to presigned URL + `parseReceiptWithLLM`, progress UI, quota/errors     | 45m | t001, t002 | **DONE** |
| t004 | Review & confirm screen: editable proposal → `insertReceiptTransaction`        | 60m | t003       | **DONE** |
| t005 | UX pass — light/dark, i18n, loading bg, safe area, analytics                   | 40m | t004       | **DONE** |
| t006 | Simplify pass over receipt-capture code                                        | 30m | t005       | **DONE** |
| t007 | Unit tests for receipt-capture behavior                                        | 40m | t005       | **DONE** |

## Definition of done

From Home, the user picks "Scan receipt" in the Quick Add menu, snaps or selects a photo, watches a parse progress state, then reviews an editable proposed transaction (payee, date, description, postings with accounts/amounts) and confirms; only on confirm is anything written to the ledger via `insertReceiptTransaction`. Quota exhaustion (`aiCfoUsage`) and parse failures show honest, localized errors. Light **and** dark correct, strings via `useTranslations()`. `yarn test:unit` green.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-07-09 platform-aware pass — web feature parity (`beancount-dashboard` `src/features/receipt` consumes exactly `parseReceiptWithLLM` + `insertReceiptTransaction`, so the pipeline is production-proven).
- **Goal linkage:** Pillar 2 **AI-powered ease** — "receipt understanding … AI proposes; the user confirms" is verbatim from `.pm/GOAL.md`; Pillar 1 **Effortless capture**. Anti-goal compliant: the AI never mutates the ledger without user review.
- **Expected outcome:** a paper receipt becomes a correct ledger entry in under 30 seconds, no typing.
- **Why now:** pillar 2 has zero coverage on the board while the entire backend (presigned upload, LLM parse, typed insert, usage metering) already exists; m8's split-button menu was built to host exactly this entry point — sequencing it right after m8 is what made the split button worth building.

## Dependency flag

⚠ t002 needs **`expo-image-picker`** (nothing camera/picker-like is in `package.json`). Repo rule: get the user's explicit OK before adding it.

## Out of scope (v1)

Multi-receipt batch capture; PDF receipts (`parseFileWithLLM`); attaching the receipt image to the ledger as a document; editing past receipt captures.
