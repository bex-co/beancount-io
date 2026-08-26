# PRFAQ — Declare Your Cash-Flow Classification in the Ledger

Status: Draft (working-backwards document, pre-implementation)
Date: 2026-08-25
Related: [ADR002 — Cash-Flow Report](../../docs/adrs/ADR002-dashboard-cash-flow-report.md)

---

## Press Release

**Beancount.io cash-flow report now reads your account classifications straight from your ledger — no more guessed categories**

*Your books already know which accounts are investments and which are daily spending. Now the cash-flow statement knows too.*

SAN FRANCISCO — 2026-08-25 — Beancount.io today announced that the cash-flow report accepts account classifications declared directly in your beancount ledger. Until now, the report sorted every account into operating, investing, or financing activities using built-in heuristics — the root account type plus a name-based guess at which assets count as cash. For most ledgers that guess was right most of the time, and silently wrong the rest of the time. Starting today, one line of standard beancount metadata makes the classification explicit, auditable, and version-controlled alongside the books themselves:

```beancount
2000-01-01 open Assets:US:Brokerage
  cash-flow-role: "investing"

2000-01-01 open Assets:US:Marcus:Savings
  cash-flow-role: "cash"
```

One key, four values — `cash`, `operating`, `investing`, `financing` — and that is the entire configuration. There is no settings page, no JSON file, no per-report options dialog. The next time the cash-flow report loads, the brokerage account's flows appear under Investing Activities, the savings account is treated as part of the cash pile whose change the statement explains, and every other account keeps working exactly as before.

"I keep my ledger in git because I want every number to have a reason I can read later," said an early user. "The cash-flow report used to be the one place where a rule I never wrote decided how my money moved. Now the rule is in the ledger, in plain text, next to the account it describes — where I can grep it, diff it, and blame it."

Classifications are per-account, declared on the account's `open` directive, and nothing else. An account with no metadata falls back to the same published heuristics the report has always used, so existing ledgers render identically before and after. When the report does rely on a heuristic, it says so; when it uses your declared metadata, the disclosure line in exports disappears, because the classification is no longer an inference — it is part of your books.

The feature works everywhere the cash-flow report does: the web dashboard, CSV and Markdown exports, and printed statements. Declared roles also feed the account-status panel, so an account you marked as cash stops showing up as an "unclassified asset" in review views — and the overview Sankey diagram reads the same declarations, so every view of your cash agrees with every other.

Availability: rolling out to all ledgers. Declaring a role requires only a text editor; the report picks it up on the next load.

---

## FAQ

### Using it

**Q: How do I mark an account?**

Add one metadata line to the account's `open` directive:

```beancount
2000-01-01 open Assets:US:Brokerage
  cash-flow-role: "investing"
```

Accepted values are `"cash"`, `"operating"`, `"investing"`, and `"financing"`. Anything else is ignored (with a note in the report — see validation below), and the account falls back to the default heuristic.

**Q: What does each value mean?**

- `"cash"` — the account belongs to the cash-and-equivalents pile. Cash accounts never appear as line items; the statement explains the *change* in their combined balance, and transfers between two cash accounts cancel out.
- `"operating"` / `"investing"` / `"financing"` — the account is not cash, and its period change appears as a line under that activity section.

By default the report treats asset accounts whose names contain `Cash`, `Checking`, `Savings`, or `Bank` as cash. Declaring a role overrides that in both directions: `cash-flow-role: "cash"` pulls in an account the name rule misses (a money-market fund, a stablecoin wallet), and `cash-flow-role: "investing"` on `Assets:US:Bank:CD` both excludes the CD from cash and files it under investing — one line does both.

**Q: Do I have to annotate every account?**

No. Unannotated accounts use the default heuristics, unchanged from today. Most users will annotate a handful of accounts — the ones where the default is wrong — and never think about the rest.

**Q: What happens to my existing ledger if I do nothing?**

Nothing. The report renders exactly as it does today, including the disclosure note that classification is inferred.

**Q: How do I know the report picked up my metadata?**

The cash-flow page marks declared accounts with a small "declared" indicator (vs. "inferred" for heuristic-classified rows). The export disclosure changes accordingly: a statement built entirely from declared roles no longer carries the "classification is inferred" disclaimer.

**Q: Can I set a default for a whole subtree at once?**

No — deliberately. We considered a `custom`-directive mechanism for subtree defaults and cut it. Per-account `open` metadata keeps exactly one obvious place to look for the rule, travels with the account when you rename or move it, and covers the real need: the typical ledger annotates a handful of accounts, not hundreds. If subtree defaults turn out to matter in practice, a dated `custom` directive remains the natural extension — but it is not part of this feature.

**Q: What if I typo the value?**

`cash-flow-role: "invsting"` is not silently accepted. The report flags the account in the status panel ("unknown cash-flow-role value, using default") so the mistake is visible where you look, not buried in a log.

**Q: Does this break `bean-check` or other tools?**

No. Metadata on `open` directives is core beancount syntax, parsed by every beancount v2/v3 tool and ignored by anything that doesn't look for this specific key. Your ledger stays fully portable.

**Q: Does the classification affect other reports?**

No. Income statement and balance sheet render by account root, as always. The declared roles are shared with the overview Sankey through one resolver, so marking an account `"cash"` makes the overview and the cash-flow report agree with each other. The Sankey's own vocabulary is unchanged: `Income` stays the source side and `Equity` stays excluded from the flow diagram; declarations never remap those two.

**Q: Can I change a classification over time?**

The metadata reflects the account's nature, which rarely changes; if it does, edit the `open` directive — your git history records the change. We deliberately did not make classification date-effective: a cash-flow statement for 2023 should be classifiable the way you understand the account today, and date-effective config adds complexity no one has asked for.

### Why it works this way

**Q: Why metadata on `open` instead of a settings UI?**

Three reasons. (1) The ledger is the source of truth — a classification that lives anywhere else can disagree with the books it describes. (2) Plain text is diffable, greppable, and reviewable in a pull request; a settings UI is none of those. (3) It works offline and in every client that reads the ledger, present and future, with zero per-client settings to sync.

**Q: Why keep the heuristics at all?**

Zero-config onboarding matters more than purity. A new user importing a Chase CSV should get a sensible cash-flow statement immediately, and the defaults (Income/Expenses → operating, non-cash Assets → investing, Liabilities/Equity → financing, name-matched cash equivalents) are right for the common case. Metadata exists for the accounts where the common case is wrong. The disclosure note in exports makes the inference honest until the user chooses to make it explicit.

**Q: Why one key instead of separate `cash-flow-role` and `cash-equivalent` keys?**

Because the two questions were never really independent. "Is this account cash?" and "which activity section is it in?" are one question with four mutually exclusive answers — an account is either part of the cash pile or it belongs to exactly one activity section. Two keys allowed nonsense states (a cash account with an activity role) that the spec then had to define away; one key makes illegal states unrepresentable. The spec is one key, four values, one precedence rule — and it fits in a tweet.

**Q: Doesn't this just move the hardcoded `config.ts` into user ledgers?**

It moves the *policy* to the user and keeps the *defaults* in code. `config.ts` remains the single published definition of the fallback rules, which is what a user checks when they ask "why is this account in investing?" The difference after this feature: when the default is wrong for your books, the fix is a line in your ledger, not a feature request against our heuristics.

### Scope and follow-ups

**Q: What is explicitly out of scope?**

- Subtree or global defaults (`custom` directives) — cut from this release; see the FAQ above.
- Date-effective classification changes.
- A settings UI that writes the metadata for you (possible follow-up; the storage format is designed so a UI could edit it later).
- Reclassifying individual *transactions* (e.g., "this one expense is really an investment"). Beancount models that as account structure; per-transaction overrides would fight the double-entry identity the report is built on.
- Mobile editing of the metadata (viewing works automatically once the API exposes it).

**Q: What does the backend need to do?**

Almost nothing new. The ledger service already returns per-account `open` metadata, and the API layer already maps it — the work is exposing it through GraphQL and merging it in the cash-flow loader ahead of the heuristics.

**Q: What are the risks?**

- **Collision**: a user already using `cash-flow-role` for something else. Mitigation: the key is namespaced by report, documented, and only read by this report.
- **Confusion between declared and inferred**: mitigated by per-row indicators and export disclosure that distinguishes the two.
- **Support load from typos**: mitigated by visible validation in the status panel rather than silent fallback.

**Q: How do we measure success?**

- Adoption: share of active ledgers with ≥1 `cash-flow-role` annotation after 90 days.
- Correction rate: reduction in "cash-flow misclassified" support/feedback volume.
- Trust signal: share of exported cash-flow statements that no longer carry the inferred-classification disclaimer.

---

## Appendix — Declaration syntax and specification, parser-verified

The syntax below was written into a real ledger and run through the actual
beancount parser — `bean-check` passes and the metadata arrives as ordinary
entry metadata (verified 2026-08-25):

```beancount
2000-01-01 open Assets:US:Brokerage
  cash-flow-role: "investing"

2000-01-01 open Assets:US:Marcus:Savings
  cash-flow-role: "cash"
```

```python
Open(account='Assets:US:Brokerage', meta={..., 'cash-flow-role': 'investing'})
Open(account='Assets:US:Marcus:Savings', meta={..., 'cash-flow-role': 'cash'})
```

### Specification

**Key**

| Key | Where | Value type | Accepted values |
| --- | --- | --- | --- |
| `cash-flow-role` | `open` directive metadata | string | `"cash"`, `"operating"`, `"investing"`, `"financing"` |

Matching is case-sensitive and exact. Other metadata keys are ignored by this
report; this key is ignored by every other tool.

**Precedence (highest wins).**

1. `cash-flow-role` metadata on the account's `open` directive.
2. Built-in heuristic from `config.ts` (`CASH_FLOW_ACTIVITY_BY_ROOT` +
   `CASH_EQUIVALENT_PATTERNS`).

**Semantics.** A declared role decides both axes at once:

- `"cash"` — membership in the cash-and-equivalents (CCE) set. CCE accounts
  never appear as activity lines; the statement's bottom line ("Net change in
  cash & equivalents") equals the sum of their period changes, and transfers
  between two CCE accounts cancel out. Use it for accounts the name heuristic
  misses (money-market fund, stablecoin wallet).
- `"operating"` / `"investing"` / `"financing"` — the account is not CCE, and
  its period change appears as a line under that activity section. Declaring
  any of these on an account the name heuristic would have captured as cash
  (e.g. `Assets:US:Bank:CD`) excludes it from the CCE set at the same time.

Declarations are trusted over accounting conventions — an Equity account
declared `operating` is honored verbatim.

**Invalid values.** Any unrecognized value (a typo like `"invsting"`, a
non-string, wrong case) is treated as absent: resolution falls through to the
heuristic, and the account is flagged in the status panel ("unknown value,
using default"). Nothing fails to render; nothing is silently accepted.

**Date behavior.** Classifications are intentionally not date-effective: a
statement for any period uses the declarations as they stand today. Changing a
classification means editing the `open` directive; the ledger's version
control is the audit trail.

**Consumers.** One shared resolver produces the final role; every consumer
reads from it:

- Cash-flow report (activity sections + CCE set + bottom line).
- CSV / Markdown / print exports (same numbers; the "classification is
  inferred" disclosure appears only for rows still resolved by the heuristic).
- Overview Sankey: `"cash"` excludes the account from flow nodes;
  `operating` / `investing` / `financing` are honored for non-`Income`
  accounts. The Sankey's own vocabulary is unchanged — `Income` stays the
  `source` side and `Equity` stays excluded; declarations never remap those
  two.

**Portability.** `open`-directive metadata is core beancount syntax.
`bean-check`, Fava, and every v2/v3 tool parse it and ignore the unknown key;
the ledger remains fully usable outside beancount.io.
