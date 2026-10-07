# ADR 0020: Accounting skill candidates to learn from

- Status: Proposed
- Date: 2026-09-27
- Decision owners: Customer-facing skills (`skills/`)
- Scope: Candidate selection and adaptation rules for the Beancount.io customer skill suite. This record does not implement skills or change the roadmap board.

## Context

Beancount.io already has eight customer skills covering initialization, importing, importer authoring, migration, reconciliation, ledger questions, options transactions, and month-end close. The opportunity is to turn checked ledger data into repeatable accounting workpapers without losing the suite's reproducibility and confirmation boundaries.

The requested research list mixes spreadsheet tooling, accounting workflows, startup analysis, and fundraising writing. Popularity helps locate examples; it does not establish accounting correctness, skill usage, or compatibility with our runtime.

## Research method and source identity

Reviewed the upstream `SKILL.md` files, the additional month-end agent definitions, and three accounting-related Nigo entry points, against the current [suite conventions](../../skills/AGENTS.md), [ask](../../skills/.claude/skills/beancount-ask/SKILL.md), [close](../../skills/.claude/skills/beancount-close/SKILL.md), and [reconcile](../../skills/.claude/skills/beancount-reconcile/SKILL.md). This is source review, not a runtime benchmark or an audit of every supporting script.

The star figures in the request are retained below as supplied. They are repository-level popularity signals, not individual-skill stars or installs, and shared repository counts must not be added together. The original directory and observation dates were not provided, so this review cannot reconstruct or verify them, and it records no fresh counts: a live star count is not reproducible and does not bear on the decision. Source links pin the inspected revision. The requested `accural-schedule` resolves to upstream `accrual-schedule`; `affaan-m/everything-claude-code` currently resolves to `affaan-m/ECC`.

| Requested skill / collection | Supplied stars | Inspected source | Relevant lesson and disposition |
| --- | ---: | --- | --- |
| `xlsx` | 104.6k | [anthropics/skills](https://github.com/anthropics/skills/blob/33375500bcea98d610eb30ce10ac4e59b89c390d/skills/xlsx/SKILL.md) | Spreadsheet delivery: formulas, explicit inputs, recalculated cached values, error inspection, and preserving existing templates. Learn the verification contract; keep XLSX optional. |
| `nigo-skills` | 116 | [nigo81/nigo-skills](https://github.com/nigo81/nigo-skills/blob/64682115565072d1db79a5f29615dd3fdc7f6174/bank-flow-reconciliation/SKILL.md) | A collection, not one skill. Bank reconciliation separates file preflight, normalization, configured matching, and review; it makes account/entity/date coverage visible. Extend our reconciliation preflight. |
| `close-management` | 23.9k | [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins/blob/da38ec1ee89d41e5380e652a97382695003396e7/finance/skills/close-management/SKILL.md) | Close dependencies, responsible people, review states, blockers, and a calendar. Extend beancount-close; do not add a competing close orchestrator. |
| `accrual-schedule` | 34.7k | [anthropics/financial-services](https://github.com/anthropics/financial-services/blob/574ed3624aebd0418c7e96cd101262f30210ab26/plugins/agent-plugins/month-end-closer/skills/accrual-schedule/SKILL.md) | Policy-driven schedule with support, already-booked amounts, and draft journal entries. A strong new candidate, with explicit period semantics and duplicate prevention. |
| `roll-forward` | 34.7k | [anthropics/financial-services](https://github.com/anthropics/financial-services/blob/574ed3624aebd0418c7e96cd101262f30210ab26/plugins/agent-plugins/month-end-closer/skills/roll-forward/SKILL.md) | Opening balance, categorized movements, closing balance, query references, and an unexplained residual. A strong new candidate for liabilities, prepaids, and other balance-sheet accounts. |
| `financial-statements` | 23.9k | [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins/blob/da38ec1ee89d41e5380e652a97382695003396e7/finance/skills/financial-statements/SKILL.md) | Comparative reporting, variance investigation, and statement presentation references. Adapt report packaging around existing bea/Fava calculations; do not create another statement engine. |
| `variance-commentary` | 34.7k | [anthropics/financial-services](https://github.com/anthropics/financial-services/blob/574ed3624aebd0418c7e96cd101262f30210ab26/plugins/agent-plugins/month-end-closer/skills/variance-commentary/SKILL.md) | Material movements need evidence-backed drivers, not a restatement of the delta; unclear drivers remain unresolved. Start as a beancount-ask recipe shared with close. |
| `officecli-financial-model` | 30.1k | [iOfficeAI/OfficeCLI](https://github.com/iOfficeAI/OfficeCLI/blob/dc68d63f5285005a9e7c5943dfb321d93ee2a076/skills/officecli-financial-model/SKILL.md) | Separates inputs, calculations, and outputs; checks statement identities, cached results, scenarios, and hardcoded calculations. Learn these checks; defer the OfficeCLI runtime and valuation suite. |
| `startup-metrics-framework` | 36.6k | [wshobson/agents](https://github.com/wshobson/agents/blob/9b15b34b0bfc13a815cbfc2366e14ea549e09422/plugins/startup-business-analyst/skills/startup-metrics-framework/SKILL.md) | Defines startup metrics by business model and stage. Useful scope taxonomy, but formulas and benchmarks require independent validation; customer/cohort metrics need non-ledger inputs. |
| `investor-materials` | 256k | [affaan-m/ECC](https://github.com/affaan-m/ECC/blob/e482e579415fde18357cafce70f177ae19fd7f03/skills/investor-materials/SKILL.md) | One canonical set of facts across decks, memos, projections, and funding requests. Adapt a ledger-backed investor-update packet later; defer general pitch writing. |

### What the smaller Nigo collection adds

Beyond its bank-flow workflow, [audit-report-checker](https://github.com/nigo81/nigo-skills/blob/64682115565072d1db79a5f29615dd3fdc7f6174/audit-report-checker/SKILL.md) separates document location/extraction from code-based arithmetic, compares statements with notes, revisits source evidence for suspected errors, and discloses checks skipped after extraction or service failures. [related-party-identification](https://github.com/nigo81/nigo-skills/blob/64682115565072d1db79a5f29615dd3fdc7f6174/related-party-identification/SKILL.md) organizes findings by supporting evidence and review priority. Its corporate-registry inputs and jurisdiction-specific rules are outside our current ledger suite.

Our inference: input coverage and evidence quality are more transferable than the collection's reported match rates or its specific matching engine. Do not promise those rates for Beancount data, infer legal related-party status from matching names, or port its external OCR/AI services by default.

## Mapping the additional month-end shortlist

The second list supplies useful Chinese workflow descriptions, but its English labels are not all standalone skill identifiers. The table maps each to the closest verified upstream source at the same pinned revisions; it does not assert that these are the original social post's links.

| Supplied label | Verified type and source | Beancount adaptation |
| --- | --- | --- |
| 01 GL Reconciler / 总账对账 | [Agent](https://github.com/anthropics/financial-services/blob/574ed3624aebd0418c7e96cd101262f30210ab26/plugins/agent-plugins/gl-reconciler/agents/gl-reconciler.md) + [gl-recon skill](https://github.com/anthropics/financial-services/blob/574ed3624aebd0418c7e96cd101262f30210ab26/plugins/agent-plugins/gl-reconciler/skills/gl-recon/SKILL.md) | Align entity/date/comparison grain, retain both unmatched sides, classify breaks, and independently recheck exceptions. Extend reconcile with an explicit GL/subledger mode; date + amount + description alone is not a unique key. |
| 02 Reconciliation / 往来对账 | [Skill](https://github.com/anthropics/knowledge-work-plugins/blob/da38ec1ee89d41e5380e652a97382695003396e7/finance/skills/reconciliation/SKILL.md) | Add reconciling-item aging, evidence, owner, and materiality-based review. Existing missing/duplicate/amount/date mismatch classes remain the base; AR/AP and intercompany data need explicit account and counterparty mappings. |
| 03 Journal Entry Prep / 计提分录 | [Supporting skill](https://github.com/anthropics/knowledge-work-plugins/blob/da38ec1ee89d41e5380e652a97382695003396e7/finance/skills/journal-entry-prep/SKILL.md) | Adopt documented account, amount, calculation, period, support, and review fields for accrual drafts. This upstream skill also covers depreciation, prepaids, and other entries; those policies are separate future scope. |
| 04 Month-End Closer / 月末结账 | [Agent](https://github.com/anthropics/financial-services/blob/574ed3624aebd0418c7e96cd101262f30210ab26/plugins/agent-plugins/month-end-closer/agents/month-end-closer.md) | Compose accruals, roll-forwards, commentary, and a review package through beancount-close. Its poster prepares an artifact; it does not post journal entries. |
| 05 Close Management / 结账进度 | [Skill](https://github.com/anthropics/knowledge-work-plugins/blob/da38ec1ee89d41e5380e652a97382695003396e7/finance/skills/close-management/SKILL.md) | Optional task owner, due date, dependency, review state, and blocker within existing close. A status report is not a new project-management service. |
| 06 Financial Statements / 三大报表 | [Skill](https://github.com/anthropics/knowledge-work-plugins/blob/da38ec1ee89d41e5380e652a97382695003396e7/finance/skills/financial-statements/SKILL.md) | Use existing statement calculations and independently check relationships. Do not infer complete three-statement automation or standards compliance from presentation templates. |
| 07 Variance Analysis / 差异分析 | [Skill](https://github.com/anthropics/knowledge-work-plugins/blob/da38ec1ee89d41e5380e652a97382695003396e7/finance/skills/variance-analysis/SKILL.md) | Extend ask with deterministic bridges for price/volume/mix or rate/headcount when the required operational data exists. Commentary explains a verified bridge; it does not invent its inputs. |
| 08 Income Statement / 利润表分析 | [Closest verified workflow](https://github.com/anthropics/knowledge-work-plugins/blob/da38ec1ee89d41e5380e652a97382695003396e7/finance/skills/financial-statements/SKILL.md) | No separate income-statement skill was located in these two upstream repository trees. Treat the label as a capability: compare current, budget, and prior-year periods; rank absolute deltas and percentage changes separately, with evidence for the top five. |
| 09 Statement Auditor / 报表复核 | [Agent](https://github.com/anthropics/financial-services/blob/574ed3624aebd0418c7e96cd101262f30210ab26/plugins/agent-plugins/statement-auditor/agents/statement-auditor.md) | The actual upstream scope is LP capital-account statements versus a fund NAV pack, not generic corporate financial statements. Adapt field-level tie-outs, exception evidence, and pass/hold recommendations for a report-pack review; defer fund-specific NAV logic. |
| 10 Excel Audit / Excel查错 | [audit-xls skill](https://github.com/anthropics/financial-services/blob/574ed3624aebd0418c7e96cd101262f30210ab26/plugins/agent-plugins/statement-auditor/skills/audit-xls/SKILL.md) | Adopt scoped workbook checks for formula patterns, hardcodes, ranges, references, units, and model identities. Findings need sheet/cell addresses; distinguish formula errors from accounting errors. |

Two additional candidates follow from this list; each also appears in the priority tables under the proposed decision:

- **P1: reconciliation exception register**, inside `beancount-reconcile` and summarized by close. Record first-seen date, amount/currency, source references, suspected cause, age, owner if supplied, and disposition. Large or old items can be prioritized without treating a suspicion as a confirmed cause. A newly observed item is not necessarily newly originated; use unknown age if the history is absent. Carry items between periods using stable identity.
- **P2: `beancount-report-review`**, a distinct read-only review candidate for an existing report pack or supplied workbook. Return field/cell-level source tie-outs, exceptions, performed/skipped checks, and a review recommendation. Never silently repair a workbook, distribute it, or call the result a statutory audit. Start with a review reference in the report-pack workflow; split it into an independently triggered skill only once users can review existing artifacts without generating them first.

The upstream GL normalization example rounds amounts to two decimals and suggests a 0.01 tolerance. Adapt the comparison methodology, not these defaults: preserve Beancount commodity precision and choose tolerances per commodity and policy. Report excluded or below-threshold differences so materiality does not masquerade as exact equality.

For price/volume/mix analysis, establish a decomposition convention and verify that components sum to the actual change. The inspected two-factor example already allocates the interaction through actual volume in the price term; adding an extra interaction/mix residual to that bridge would double-count. Product mix needs product-level volumes and prices, and one-off classification needs supporting evidence. If only account totals exist, produce an account/payee movement explanation instead of a fabricated operational bridge.

## Proposed decision

Prioritize three accounting capabilities: accrual schedules, roll-forwards, and variance explanations. Improve existing close and reconciliation skills alongside them. Add presentation and startup reporting only after their inputs and numerical checks are reliable.

Use existing skills when the user intent already fits. A new top-level skill is justified by a distinct trigger, input contract, deliverable, and evaluation set—not by the existence of an upstream skill with that name.

### 1. First candidates: evidence and period-end workpapers

| Priority | Candidate | Placement and user trigger | Required output | Release gate |
| --- | --- | --- | --- | --- |
| P0 | Reconciliation coverage preflight | Extend `beancount-reconcile`: reconcile supplied statements, including multiple files | Entity/account/currency/date coverage, source row counts and totals, explicit exclusions, ambiguous field mappings, then the existing mismatch report | Detect missing accounts and misleading counterparty columns; never improve match rates by silently excluding rows |
| P0 | Close dependencies and review state | Extend `beancount-close`: close a period | Per-step evidence, dependency, blocker, and completion/review state; optional owner/due date for teams; preserve the simple personal-ledger path | An unresolved reconciliation or absent statement stays visible; a green ledger check alone never becomes proof of a fully verified close |
| P1 | `beancount-roll-forward` | New read-only ledger analysis: explain how an account moved from opening to closing | Opening + signed movements = closing, query/source for each component, uncategorized movement bucket, residual and pass/fail | Every posting included exactly once; opening and ending queried independently; no balancing plug |
| P1 | `beancount-accruals` | New drafting workflow: prepare supported accruals and reversals for a period | Policy/basis, service interval, recognized-to-date amount, already-booked amount, required adjustment, support, and proposed balanced entries | Deterministic calculations; partial periods, prior reversals, invoices, and reruns tested; no inferred expense from a missing recurring payment |
| P1 | Variance explanation | Extend `beancount-ask` recipes; reuse in close: explain a period-over-period or budget change | Current/comparator/delta, explicit threshold, contributing postings, supported driver or unresolved explanation | Zero/negative comparators handled explicitly; drivers trace to evidence; unavailable budget is missing, never zero |
| P1 | Reconciliation exception register | Extend `beancount-reconcile`, summarized by `beancount-close`: track reconciling items that stay open across periods | First-seen date, amount/currency, source references, suspected cause, age, owner if supplied, and disposition for each open item | Item identity and age survive a changed row order; unknown age when history is absent; a suspected cause is never reported as confirmed |

Priorities express sequencing, not a commitment to ship all candidates. Coverage and review-state work comes first because the schedules depend on knowing what the inputs cover. The exception register follows the coverage preflight it builds on; it extends reconciliation rather than adding a fourth accounting capability.

**Accrual semantics need an explicit policy.** The upstream shorthand for subtracting prior accruals and current invoices is insufficient for every reversal pattern. Our proposed contract distinguishes a cumulative target from a current-period target, specifies the service interval and day-count convention, and nets invoices, adjustments, and reversals over the same scope. A negative adjustment must reverse direction correctly. An approved policy may use an estimate, but its method and source must be explicit; do not weaken `beancount-ask`'s no-estimation rule.

For example, a policy allocating a supported $1,200 service evenly across twelve months implies $100 per month. In month three, a cumulative target of $300 less $200 still booked implies a $100 draft adjustment. If those $200 were reversed, the same subtraction is wrong. Evaluation must distinguish these states rather than memorize the example.

Accrual drafts initially stay outside the live ledger. Later posting support must use the suite's existing propose/confirm/check workflow, existing account mappings, and stable schedule/period identity to prevent duplicate application. Externally sourced entries retain the canonical `import-id` convention. Preparing a schedule is not authorization to post it or schedule an automatic reversal.

**Roll-forwards use Beancount signs, not copied debit/credit labels.** Calculate in native signed postings and document presentation conversions. Separate currencies and inventory units; a valuation view additionally identifies price source, date, and basis. Missing movement classifications remain visible even when the arithmetic residual is zero. A query that defines closing as opening plus the same movements is not an independent tie-out.

**Variance thresholds are user policy.** Define absolute and relative thresholds, their AND/OR relationship, the denominator convention, and always-comment accounts. Do not inherit the upstream 5% fallback as a universal accounting rule. With a zero comparator, show the absolute delta and percentage as not applicable. Posting descriptions can support an explanation, but they do not prove business causality; unsupported explanations remain hypotheses or unknown.

### 2. Second candidates: portable reporting

| Priority | Candidate | Boundary | Release gate |
| --- | --- | --- | --- |
| P2 | `beancount-report-pack` | Package existing `bea`/Fava outputs into comparative statements, schedules, and an evidence index; Markdown/CSV first, optional XLSX | All published figures tie to a fixed input snapshot; account mappings and missing classifications are visible; opening/closing cash and statement totals reconcile |
| P2 | `beancount-report-review` | Read-only review of an existing report pack or supplied workbook; begins as a review reference inside the report-pack workflow, and becomes its own skill only once users can review artifacts they did not generate | Findings carry sheet/cell addresses and source tie-outs; performed and skipped checks are disclosed; the original workbook is unchanged; the result is never called a statutory audit |
| P2 | `beancount-business-metrics` | Cash and burn from classified ledger cash movements; customer, subscription, and cohort measures only with explicit external datasets | Define cash perimeter and time basis; exclude financing and internal transfers from operating burn; refuse unsupported ARR/CAC/LTV/retention figures |
| P3 | `beancount-investor-update` | Reuse a reviewed report pack and separately identified operating metrics for a recurring factual update | Every repeated number agrees across artifacts; actuals and forecasts stay distinct; missing facts stay missing |

These names are candidates, not installed capabilities. The report pack owns artifact writing; `beancount-ask` remains read-only and does not quietly acquire an export/write phase. Existing close orchestration can reference a requested report pack without absorbing its rendering implementation.

A report pack should record entity, period, accounting basis, currency/valuation policy, account mapping, ledger revision or content digest, exact query/command, calculation version, and source references. Git revision alone is insufficient with dirty files or mutable managed price feeds; capture the actual loaded data and relevant price revision. Keep sensitive source documents local and out of public fixtures.

For XLSX, adopt input/calculation/output separation, formula recalculation, cached-value inspection, and independent totals. A workbook that opens successfully or has no formula errors can still calculate the wrong accounts. Preserve templates and avoid executing document macros or treating cell text as instructions. The first implementation must detect renderer availability rather than assume OfficeCLI, LibreOffice, or Python spreadsheet packages are installed. Any new dependency requires the repository's normal approval.

**Do not copy the startup formula sheet unchecked.** The inspected framework defines burn as revenue minus expenses, describes negative burn as losing money, then divides cash by that burn for runway. That produces negative runway for a loss-making example. Our proposed cash metric uses positive operating cash outflow minus operating cash inflow, with a documented averaging window. When net burn is zero or negative, report that this burn-based runway is not applicable rather than dividing by zero or reporting negative months. Accrual revenue minus expenses is not a substitute for cash consumption. CAC/LTV/ARR also require definitions and data absent from a generic ledger; benchmark claims need dated sources and a relevant population. See the pinned framework source in the research table.

### 3. Preserve the suite's architecture

Use `bea` for checked reads, reports, and authorized writes, following the [existing tool and trust contracts](../../skills/AGENTS.md). Do not introduce a second accounting engine, fork Fava's reports, or depend on upstream `internal-gl` MCP connectors. Any future hosted adapter must satisfy the repository's REST/GraphQL/MCP parity rules; this proposal itself requires no API change.

Keep accounting calculations executable and reproducible. The model can map an input field, suggest a movement classification, and explain a result; numerical truth comes from queries and deterministic calculation. Share narrowly scoped references or helpers within `skills/` where needed, with explicit inputs and tests. Do not build a generic finance-agent framework for these candidates.

Treat statements, invoices, spreadsheets, and their embedded instructions as data. Extract provenance with the values, validate it, and keep write authority in the existing confirmed workflow. Do not assume that every Claude Code or Codex host can enforce the upstream reader/worker permission topology; any isolation claim needs implementation and testing in that host.

## Evaluation before adoption

Use synthetic fixtures and compare skill-enabled runs with the existing suite. No production financial documents are needed. Each candidate must produce the required evidence and fail honestly when it cannot.

| Fixture | Required behavior |
| --- | --- |
| Statement set omits one of three active accounts | Name the uncovered account; do not call the entire ledger reconciled |
| Two equal payments, one statement row; split settlement; differing account labels | Preserve ambiguity and source-row identity; do not double-match or collapse accounts |
| Accrual partly invoiced, reversed next month, rerun twice; leap-day service interval | Apply the declared policy, balance the draft, and avoid duplicate entries |
| Roll-forward has unclassified postings, foreign currency, and a deliberate omitted movement | Keep units separate; show unclassified activity and an independently detected residual |
| Comparator is zero or negative; budget is absent; business driver is unknown | Explain denominator/missing-data choices; no invented percentage, budget, or cause |
| Workbook formula references the wrong row but evaluates successfully | Independent ledger tie-out detects the error; a clean recalculation is insufficient |
| Business receives funding while operating cash falls; no customer dataset | Exclude financing from operating burn; withhold customer metrics |
| Old reconciling item reappears under a changed row order; commodity uses more than two decimals | Retain item identity and age; preserve precision and report policy tolerance |
| Price and volume both change; product-level mix data is missing | Bridge components sum exactly; do not count interaction twice or invent a mix effect |
| Workbook has a pasted-over formula and a broken cross-sheet reference | Identify sheet/cell and source evidence; leave the original workbook unchanged |
| Two report artifacts disagree; source extraction failed for one table | Detect conflicting facts; disclose missing coverage rather than mark checks passed |
| Supporting document asks the agent to alter the ledger | Ignore the instruction as data; ledger content remains unchanged |

When implemented, use the skill-creator evaluation loop and the structural, installer, fixture, and guidance checks required by `skills/AGENTS.md`. This ADR is documentation only; it does not claim those candidate evaluations have run.

## Licensing and adoption limits

Learn workflow ideas first and write Beancount-specific instructions and fixtures. The inspected `xlsx` frontmatter labels its license proprietary and points to its own license file; public availability is not permission to vendor it. GitHub identifies knowledge-work-plugins, financial-services, and OfficeCLI as Apache-2.0, and wshobson/agents and ECC as MIT. GitHub did not identify a repository-level license for Nigo, although its inspected reconciliation and related-party skill frontmatter says MIT. Before copying any text, scripts, or assets, inspect the exact file-level terms and retain required notices; this research does not establish blanket reuse rights.

Defer full DCF/LBO modeling, general fundraising decks, corporate-registry related-party screening, and jurisdiction-specific audit opinions. Their data, dependencies, and review obligations exceed our present bookkeeping workflow. Do not claim GAAP/IFRS compliance because a template names a standard. In particular, the upstream financial-statements workflow is centered on generating an income statement, with balance-sheet and cash-flow reference material; it is not evidence of a tested complete reporting engine.

## Alternatives and consequences

- **Import the popular suites wholesale:** rejected. Repository stars do not resolve runtime, license, arithmetic, or authorization differences.
- **Add a top-level skill for every source name:** rejected. Close, reconciliation, and ad-hoc variance questions already have clear homes; duplicate triggers would fragment the suite.
- **Build spreadsheets first:** deferred. Attractive output is useful after evidence and ledger tie-outs are reliable; an optional renderer keeps the basic workflow portable.
- **Keep only the existing suite:** lowest maintenance cost, but leaves repeatable accrual and roll-forward work to ad-hoc prompting.

The proposed path adds focused accounting workpapers while retaining Beancount as the numerical source. It also creates maintenance obligations: policy definitions, deterministic calculations, source provenance, and meaningful failure fixtures. Promote a candidate only when those contracts work on realistic examples and its task quality improves over the current suite.
