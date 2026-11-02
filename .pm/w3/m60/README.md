# w3 · m60 — Ledger creation: the two-step flow with modules and the ADR026 currency suggestion

**Worker:** worker3 **Goal:** the dashboard and native creation flows match the 2026-10-27 design — purpose, then details — offer the personal modules, drop the history-start question, and suggest a currency from the saved preference, region, and time zone with its source shown. **Status:** in progress (t001 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Add the `defaultCurrency` account field on REST, GraphQL, and MCP — **DONE** | 90m | w3/m59/t008 |
| t002 | Resolve the dashboard currency suggestion with its source | 90m | t001 |
| t003 | Rework the dashboard flow to two steps with modules | 180m | t002 |
| t004 | Resolve the native currency suggestion with its source | 60m | t001 |
| t005 | Rework the native flow to two steps with modules | 180m | t004 |
| t006 | Adoption surface | 30m | t003, t005 |
| t007 | Simplify | 20m | t006 |
| t008 | Test coverage | 45m | t006 |
| t009 | Closeout | 10m | t007, t008 |

## Definition of done

- Dashboard and native creation each have two steps: **purpose** (the seven purposes and Start blank, personal preselected; under personal an **Also track in this ledger** list of the three modules, each off by default with a live account preview; a note sending a company, club, or shared money to its own ledger) and **details** (title, currency, first accounts) with a summary beside **Create ledger** — visibility · currency · account count, expandable to the account preview — and an inline warning when the ledger is public. There is no review page and no "Books begin" question.
- A known balance's **as of** date is the setup's `historyStart`: the form asks one shared "balances as of" date (the builder has a single `historyStart`), and without a known balance `historyStart` is today in the device's local day.
- Selected modules reach `setup.modules`; a rental property name may be given and defaults to `Property1`.
- `defaultCurrency` is a nullable account field readable on REST, GraphQL, and MCP, validated against the supported currencies, written only through `updateProfile` (its REST/MCP exclusion unchanged). API creation never reads it.
- The currency suggestion follows ADR026: flow selection → saved `defaultCurrency` → native currency hint (mobile) → browser/device region → `USD`; a conflicting time-zone currency appears as a one-tap candidate and is never preselected; every suggestion from steps 2–4 is labelled with its source; a changed currency, or an accepted one when none is stored, is saved.
- Carried regression checks from w3/m54's W4 repairs ([W4/314](../../w4/done/314.md), [315](../../w4/done/315.md), [317](../../w4/done/317.md), [320](../../w4/done/320.md), [321](../../w4/done/321.md)): nothing is created before the final action, dates default to the local day, and a failed create keeps its draft and `requestId`.

## Source + Goal linkage

- **Source:** promoted from [649](../649.md) after [m59](../done/m59/README.md) landed; [PRFAQ001](../../../docs/prfaqs/PRFAQ001-ledger-creation.md) §3, [ADR021](../../../docs/adrs/ADR021-backend-v2-ledger-creation-experience.md) (revised 2026-10-27), and [ADR026](../../../docs/adrs/ADR026-backend-v2-locale-and-currency-defaults.md) phase 3; wireframes `docs/images/ADR021-wireframe-purpose.svg`, `ADR026-wireframe-web.svg`, `ADR026-wireframe-mobile.svg`.
- **Goal linkage:** A2 — Frictionless onboarding: one fewer step and no history question between a newcomer and a working ledger, the household shape (everyday money plus investments, a rental, or side income) on day one, and a currency that is right for people outside the United States without a required answer.
- **Expected outcome:** shorter time from "Create ledger" to a created ledger on web and native; personal ledgers created with modules; a lower currency-correction rate per suggestion source. Signals: creation completion rate, share of personal ledgers with modules, correction rate by source.
- **Why now:** m59 shipped `setup.modules` on every surface, so no client renders a module list against a missing contract; ADR026 requires its phase 3 to land with or before this flow so the flow does not hard-code ADR021's older currency order. Decision recorded here: one shared "balances as of" date, because the builder has one `historyStart` (649's open point). Adoption surface is included (t006) because both clients' creation UX and a profile API field change.
