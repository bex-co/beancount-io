# w1 · m9 — Edit & delete transactions from transaction detail

**Worker:** worker1 **Goal:** Fixing a mistake no longer requires a desktop — from transaction detail the user can delete an entry (with confirmation) or edit its raw beancount source slice losslessly. **Status:** todo

## Tasks (in order)

| id   | title                                                                    | est | depends_on |
| ---- | ------------------------------------------------------------------------ | --- | ---------- |
| t001 | GraphQL ops + codegen: update/delete `LedgerEntrySourceSlice`            | 20m | —          |
| t002 | Delete flow: confirm dialog → mutation with `sha256sum` → refresh + back | 40m | t001       |
| t003 | Raw slice editor screen (monospace, prefilled), save + honest errors     | 50m | t001       |
| t004 | Refresh parity: journal, Home recents, account detail reflect the change | 30m | t002, t003 |
| t005 | UX pass — light/dark, i18n, loading bg, safe area, analytics             | 30m | t004       |
| t006 | Simplify pass over edit/delete code                                      | 20m | t005       |
| t007 | Unit tests for edit/delete behavior                                      | 30m | t005       |

## Definition of done

From transaction detail, the user deletes an entry after an explicit confirmation, or opens an editor prefilled with the entry's exact source text, edits, and saves; a stale `sha256sum` or invalid beancount is rejected with an honest, localized error; the change is visible in Journal, Home recents, and account detail without an app restart. Light **and** dark correct, strings via `useTranslations()` from the English base. `yarn test:unit` green.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-07-09 platform-aware pass — schema gap analysis plus web feature parity (`beancount-dashboard` `src/features/ledger-editor`; mobile is append-only today).
- **Goal linkage:** Pillar 4 **Plain-text fidelity** — v1 edits the raw slice deliberately so nothing (metadata, tags, costs) is lost in a structured transform; plus the quality bar's "no silent mutations, errors surfaced honestly" (destructive delete gated on confirmation, sha-checked writes).
- **Expected outcome:** the most common daily frustration — "I fat-fingered 42.00 as 420.00" — is fixable on the phone in seconds instead of waiting for a desktop.
- **Why now:** zero backend work — `updateLedgerEntrySourceSlice` / `deleteLedgerEntrySourceSlice` exist and the transaction-detail screen already fetches `slice` + `sha256sum` via `getLedgerEntryContext`; independent of m8, so it can ship in parallel. No new dependencies.

## Out of scope (v1)

Structured editing of postings (inbox note w1/006-adjacent idea — reuse m8's legs editor later); editing non-transaction directives; multi-entry bulk operations.
