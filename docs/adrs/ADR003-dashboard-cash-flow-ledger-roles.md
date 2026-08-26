# ADR 003: Cash-Flow Classification Declared in the Ledger (`cash-flow-role`)

- Status: Accepted
- Date: 2026-08-25
- Decision owners: Dashboard (resolver + consumers), Backend (expose `open` metadata via GraphQL)
- Scope: a single metadata key on `open` directives that overrides the cash-flow report's heuristic classification — its values, precedence, validation, and consumers. Working-backwards source: [PRFAQ — Declare Your Cash-Flow Classification in the Ledger](./PRFAQ-cash-flow-ledger-classification.md) (its appendix is the normative spec). Implementing milestone: `.pm/w4/m3/`. Extends [ADR002](./ADR002-cash-flow-report.md), which shipped the report with heuristic-only classification.

## Context

w4/m2 shipped the cash-flow report (ADR002) with classification inferred entirely client-side: root-account mapping plus name-matched cash equivalents from `dashboard/src/features/reports/cash-flow/config.ts` (`CASH_FLOW_ACTIVITY_BY_ROOT` + `CASH_EQUIVALENT_PATTERNS`). That heuristic is right for the common case and silently wrong for the rest — a brokerage sweep looks investing, a credit-card payment looks financing, a money-market fund or stablecoin wallet misses the cash-name patterns. ADR002's own negative consequences predicted this: the first "your cash flow is miscategorized" report was a matter of when, not if. Today a user whose ledger the heuristic gets wrong has no fix short of a feature request against our `config.ts`; the only honesty mechanism is the "classification is inferred" disclosure carried by every export and the account-status panel.

ADR002 explicitly deferred user-tagged classification ("User-tagged classification via account metadata — deferred, not rejected"). This ADR is that follow-up, designed via the working-backwards PRFAQ.

## Decision Drivers

- **The ledger is the source of truth.** A classification that lives anywhere else can disagree with the books it describes. Plain text is diffable, greppable, reviewable in a PR, and writable by agents and scripts.
- **Zero-config onboarding is preserved.** Unannotated ledgers must render exactly as before; the heuristic stays as the fallback, not as the only mechanism.
- **One obvious place to look.** The rule for an account should sit next to the account, not in a settings page or a global defaults mechanism.
- **All consumers must agree.** The statement, exports, status panel, and overview Sankey must resolve roles through one shared code path so views can never disagree.
- **Honesty scales with inference.** The inferred-classification disclosure should appear exactly where inference happened — and disappear where the user declared the answer.

## Decision

Accept account classifications declared directly in the ledger as **`cash-flow-role` metadata on `open` directives**, per the PRFAQ appendix (parser-verified):

```beancount
2000-01-01 open Assets:US:Brokerage
  cash-flow-role: "investing"

2000-01-01 open Assets:US:Marcus:Savings
  cash-flow-role: "cash"
```

- **One key, four values.** `"cash" | "operating" | "investing" | "financing"`, case-sensitive exact match. Other metadata keys are ignored by the report; this key is ignored by every other tool (`bean-check`, Fava, all beancount v2/v3 tooling parse `open` metadata and skip unknown keys — the ledger stays portable).
- **A declared role decides both axes at once.** `"cash"` means membership in the cash-and-equivalents (CCE) set: no statement row, balances form the opening/closing bottom line, transfers between CCE accounts cancel. An activity role means the account is not CCE and its period change is a line under that section — so `cash-flow-role: "investing"` on `Assets:US:Bank:CD` both excludes it from cash and files it under investing. Declarations are trusted over accounting conventions (an Equity account declared `operating` is honored verbatim).
- **Precedence: declared beats heuristic.** Resolution order is (1) `cash-flow-role` metadata, then (2) the published `config.ts` heuristics, which remain the single definition of the defaults.
- **Invalid values fall back, visibly.** An unrecognized value (typo, wrong case, non-string) is treated as absent: resolution falls through to the heuristic and the account is flagged in the status panel ("unknown value, using default"). Nothing fails to render; nothing is silently accepted.
- **Not date-effective.** A statement for any period uses the declarations as they stand today; changing a classification means editing the `open` directive, and the ledger's version control is the audit trail.
- **One shared resolver.** `dashboard/src/features/reports/cash-flow/lib/role-resolver.ts` (`resolveCashFlowRole`) produces the final role and its source (`declared` | `heuristic`, plus the raw invalid value for flagging). Every consumer reads from it: the cash-flow report (sections, CCE set, bottom line), CSV/Markdown/print exports (the inferred-classification disclosure is gated per-row on heuristic-resolved rows), and the overview Sankey (`"cash"` excludes the account from flow nodes; activity roles honored for non-`Income` accounts; `Income` stays the source side and `Equity` stays excluded — declarations never remap those two).
- **Backend surface.** The existing `getLedgerAccountDirectives` GraphQL query gains a `meta` field carrying each account's `open`-directive metadata; the cash-flow page already fetches those directives for its cash-account status panel, so declared roles arrive in the same request and are merged ahead of the heuristics. This is a deliberate, scoped exception to ADR002's "no backend changes" driver: the ledger service's open entries already carry `meta`, so the backend work is one mapped field, not new computation or a new endpoint.

## Alternatives Considered

### Two-key split — `cash-flow-class` plus a `cash-equivalent` flag (rejected)

The two questions were never independent: "is this account cash?" and "which activity section is it in?" are one question with four mutually exclusive answers — an account is either in the cash pile or in exactly one activity section. Two keys allow nonsense states (a cash account with an activity role) that the spec then has to define away; one four-value key makes illegal states unrepresentable and keeps the whole spec at one key, four values, one precedence rule.

### `custom`-directive subtree defaults (cut, natural future extension)

A dated `custom` directive could set a default role for a whole account subtree. Cut from this release: per-account `open` metadata keeps exactly one obvious place to look for the rule, travels with the account when renamed or moved, and covers the real need — typical ledgers annotate a handful of accounts, not hundreds. If subtree defaults matter in practice, the dated `custom` directive remains the natural extension.

### Date-effective classification (rejected)

A classification reflects the account's nature, which rarely changes; when it does, editing the `open` directive plus git history is the audit trail. Date-effective config would let a 2023 statement be classified by 2023's understanding, at a complexity cost nobody has asked for.

### Settings UI that writes the metadata (rejected as the storage mechanism)

The ledger is the source of truth; plain text is diffable, greppable, and scriptable, and it works offline and in every client that reads the ledger with zero per-client settings to sync. A UI that edits the metadata later is a possible follow-up — the storage format is designed to allow it — but the mechanism of record is the ledger, not a settings store.

## Consequences

### Positive

- **Unannotated ledgers are byte-identical.** No metadata means the same heuristics, the same numbers, the same disclosure — zero migration, zero behavior change for existing users.
- **Misclassification becomes user-fixable.** The fix for a wrong default is one line of ledger text, not a feature request — and agents can apply it, since the configuration is plain, version-controlled text next to the account it describes.
- **Honest exports, per-row.** The "classification is inferred" disclaimer is gated on rows still resolved by heuristics; a statement built entirely from declared roles drops it, because the classification is no longer an inference — it is part of the books.
- **Cross-view consistency.** One shared resolver feeds the statement, exports, status panel, and overview Sankey, so every view of the user's cash agrees with every other.
- **Visible validation.** Typos surface in the status panel where the user looks, instead of silently falling back.

### Negative

- **Breaks ADR002's zero-backend-change boundary.** Exposing `open` metadata needs a new GraphQL query in the private backend repo — scoped (exposure of already-returned data), but real cross-repo coordination that v1 deliberately avoided.
- **Key collision risk.** A user already using `cash-flow-role` for something else would see it interpreted by this report; mitigated by the key being namespaced by report, documented, and read only by this feature.
- **Declared-vs-inferred confusion risk.** Mitigated by per-row declared/inferred indicators and the per-row export disclosure gating.
- **Support load from typos.** Mitigated by status-panel flagging rather than silent fallback.

## Open Questions

- Adoption and trust metrics per the PRFAQ: share of active ledgers with ≥1 `cash-flow-role` annotation after 90 days; reduction in misclassification reports; share of exports no longer carrying the inferred-classification disclaimer.
- Whether a settings/editor UI that writes the metadata (autocomplete on `open` directives) is worth building on top of this storage format.
- Whether subtree defaults via dated `custom` directives ever earn their complexity.

## References

Internal:

- `dashboard/docs/PRFAQ-cash-flow-ledger-classification.md` — working-backwards source; appendix is the normative, parser-verified spec
- `docs/adrs/ADR002-dashboard-cash-flow-report.md` — the heuristic-only report this ADR extends (see its "User-tagged classification via account metadata" deferred alternative)
- `dashboard/src/features/reports/cash-flow/lib/role-resolver.ts` — the shared resolver (`resolveCashFlowRole`)
- `dashboard/src/features/reports/cash-flow/config.ts` — the published fallback heuristics (`CASH_FLOW_ACTIVITY_BY_ROOT` + `CASH_EQUIVALENT_PATTERNS`)
- `.pm/w4/m3/` — implementing milestone
