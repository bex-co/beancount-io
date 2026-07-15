# w1 · m11 — Smart account suggestions in the add flow

**Worker:** worker1 **Goal:** Picking a payee makes the app do the accounting thinking: the "to" account pre-fills from that payee's history (`getLedgerPayeeAccounts`), with an LLM suggestion fallback (`suggestTransactionCategoriesWithLLM`) for unseen payees — always visible and overridable before save. **Status:** done

## Tasks (in order)

| id   | title                                                                                  | est | depends_on |            |
| ---- | -------------------------------------------------------------------------------------- | --- | ---------- | ---------- |
| t001 | GraphQL ops + codegen: `getLedgerPayeeAccounts`, `suggestTransactionCategoriesWithLLM` | 20m | —          | — **DONE** |
| t002 | Payee-selected hook: fetch history, auto-apply top match in the add flow               | 40m | t001       | — **DONE** |
| t003 | Suggestion chips UI on account rows + LLM fallback for unseen payees                   | 45m | t002       | — **DONE** |
| t004 | UX pass — light/dark, i18n, loading bg, safe area, analytics                           | 30m | t003       | — **DONE** |
| t005 | Simplify pass over suggestion code                                                     | 20m | t004       | — **DONE** |
| t006 | Unit tests for suggestion selection + fallback behavior                                | 30m | t004       | — **DONE** |

## Definition of done

On the add-transaction review screen, choosing a payee the ledger has seen before pre-fills the expense account from that payee's history — visibly, on the account row the user is about to confirm — and offers the runner-up accounts as tappable chips; an unseen payee gets AI-suggested account chips instead. The user can always override via the normal account picker, and nothing is saved without the standard review. Suggestions never block the flow: if the queries are slow or fail, the add flow behaves exactly as today. Light **and** dark correct, strings localized, `yarn test:unit` green.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-07-09 platform-aware pass — both ops sit unused in the mobile schema; subsumes the earlier "payee → account auto-fill" inbox idea by upgrading it with the LLM fallback.
- **Goal linkage:** Pillar 1 **Effortless capture** — "smart defaults (recent accounts, payees…)" is the pillar's own wording; Pillar 2 **AI-powered ease** — "smart account/category suggestions", with the user always confirming.
- **Expected outcome:** for repeat payees (the overwhelming majority of entries) the user stops hand-picking the expense account entirely — capture drops by one picker round-trip per transaction.
- **Why now:** pure client work over existing ops, no new dependencies; lands the "smart defaults" promise while m8/m10 are adding more capture surfaces that inherit it for free.

## Out of scope (v1)

Learning from local usage (client-side ranking); suggestions in the multi-leg editor beyond its default seeding; narration-based suggestions.
