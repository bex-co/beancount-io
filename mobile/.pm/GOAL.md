# Goal — Beancount Mobile

Build a **user-friendly mobile app** for [beancount.io](https://beancount.io/) users that makes accounting **super easy** with the power of AI, analytics, and plain-text accounting with beancount.

Every milestone on this board must advance at least one pillar below (`/pm` and `/pm-brainstorm` enforce this via the `## Source + Goal linkage` gate).

## Pillars

1. **Effortless capture** — recording a transaction takes seconds, not minutes: minimal taps, smart defaults (recent accounts, payees, currencies), fast flows for the on-the-go moments where desktop beancount is impractical.
2. **AI-powered ease** — the app does the accounting thinking for the user: natural-language transaction entry ("coffee 4.50 at Blue Bottle"), smart account/category suggestions, receipt understanding, plain-English explanations of the user's finances. AI proposes; the user confirms.
3. **Analytics & insights** — the user understands their money at a glance: net worth, spending trends, income/expense breakdowns, budgets — turning the plain-text ledger into visual insight without spreadsheets.
4. **Plain-text fidelity** — the beancount ledger stays the source of truth. Everything the app writes round-trips to valid beancount; nothing is locked into a proprietary format; power users can always drop to the text.

## Cross-cutting quality bar

- Delightful in light **and** dark themes; localized (13 locales, English as base).
- Trustworthy: no silent mutations of the user's ledger; errors surfaced honestly.
- Fast and offline-tolerant where feasible — mobile moments are short.
