# PRFAQ004 — Beancount Tax Preview

Status: Research-backed proposal for review; no product changes implemented

Date: 2026-10-02

Purpose: Learning lessons in preparation for Beancount Tax

Scope: A public tax explainer and a private preview connected to ledger records, followed by separately gated preparation and filing capabilities.

**Recommendation:** CountryTaxCalc is a useful reference for making tax questions approachable. Use its simple entry, comparisons, and contextual explanations as product inspiration. Build Beancount Tax around independently verified rules and traceable financial records. The first proposed release, **Beancount Tax Preview**, helps customers understand a supported estimate, reconcile its inputs with their books, and identify what still needs review.

Recommend a bounded US federal, tax-year-2026 pilot before adding jurisdictions. This is a proposed sequencing decision based on the available official references and open-source models, not evidence that US customers have the greatest demand. Validate that choice before implementation.

This extends the evidence-preservation approach in [PRFAQ001](PRFAQ001-ledger-creation.md) and preserves [PRFAQ002's distinction between market prices and acquisition records](PRFAQ002-include-live-price.md). Those documents contain proposals as well as implemented work; this PRFAQ does not assume every prerequisite has shipped.

## Press release

*Proposed launch copy, written as if released. Product name, availability, and scope remain proposals; this is not a current product announcement.*

**Beancount.io introduces Tax Preview to explain tax estimates using the records behind them**

*Understand a supported tax scenario, connect it to your books, and see the missing information before preparing a return.*

Beancount.io today introduced Beancount Tax Preview for people who want to understand their taxes throughout the year. Customers can explore a simple example without an account, then use their own ledger and supporting records to build a private, reviewable preview.

A tax calculator can answer a quick question about a salary. Keeping that answer useful requires knowing which income it includes, which tax year applies, what has already been withheld, and whether the underlying records are complete. Tax Preview brings those questions into the same workflow.

The initial calculator covers a published set of US federal wage-income scenarios for tax year 2026. Every result identifies its assumptions and shows how taxable income passes through the tax brackets. Customers can compare a different salary assumption and see why a higher marginal rate does not apply to all their income. Federal estimates clearly identify the state, local, and other items outside their scope.

Customers connecting their books review proposed income and payment mappings, reconcile them with pay statements, and inspect the records behind each total. Missing gross-pay details or an unsupported income source produces a specific next step. A hypothetical scenario is saved separately from actual transactions.

Tax Preview also produces a review summary of confirmed inputs, supporting references, and unresolved questions. It prepares customers for a later tax-preparation workflow while preserving their editable Beancount records. The preview does not submit returns or make tax payments.

The public explainer is proposed to be free. Private previews begin with an opt-in pilot; broader availability and pricing follow validation of accuracy, usefulness, and the cost of maintaining the supported rules.

## Customer FAQ

### 1. Who is this for?

People who already keep financial records and still have to rebuild the context behind a tax estimate. The initial calculation pilot targets US residents with straightforward wage income. Freelancers and investors participate in research and can organize records, but their additional tax calculations require later coverage.

The central job is: “Explain this estimate using information I can verify, and tell me what is missing.” Someone who only wants a one-time salary estimate can use the public explainer without creating books.

### 2. What does the first release calculate?

The proposed initial calculation is **US federal ordinary income tax before credits**, for a single filer eligible for the basic standard deduction, with wage income and no other income or adjustments. It uses an explicitly selected 2026 ruleset. Extra deductions, credits, other filing statuses, self-employment, investments, retirement distributions, and international situations fall outside this initial calculation.

The interface asks about these conditions before presenting a personal result. Unsupported or unanswered conditions prevent a complete personal estimate; the customer can still explore a clearly hypothetical wage-only example. The eligibility questions must themselves receive tax review, including circumstances that affect deduction eligibility.

Payroll withholding and employee contributions can be reconciled from pay records, with each identified separately. The first release does not calculate state or local tax, promise a complete take-home-pay figure, determine estimated-payment obligations, or predict a refund. A comparison between withholding and this limited estimate must retain the same scope label.

This deliberately narrow pilot tests whether explanations and record reconciliation are useful. It is insufficient for many existing Beancount customers; evidence that those customers primarily need freelance or investment workflows should change the launch recommendation before development.

### 3. How do I get a useful result?

1. Choose **Explore an example** or **Use my records**. The example requires no account and remains separate from real books.
2. Confirm jurisdiction, tax period, and the supported personal circumstances. Currency, language, and account names cannot establish tax residence or filing status.
3. Enter annual wage assumptions, or select a permitted ledger and review proposed mappings alongside pay statements. Show confirmed year-to-date amounts separately from assumptions about the rest of the year.
4. Review taxable income, the bracket calculation, the included tax components, and the outstanding questions. Open a total to inspect its inputs and source references.
5. Change a supported assumption or save a review summary. Saving a scenario never adds hypothetical transactions to the ledger.

The first useful result is an explained calculation with a visible coverage boundary, or a precise account of why one cannot yet be produced.

### 4. Why connect a ledger when free calculators already exist?

The proposed advantage is continuity: reuse reviewed records, explain changes since the last preview, and preserve the path from an amount to its evidence. A standalone calculator usually starts with numbers the customer supplies; Beancount should help establish where those numbers came from.

For example, a bank deposit may show only net pay. The product requests the pay statement needed to separate gross wages, tax withholding, and other deductions. Adding a year-end wage statement reconciles existing records rather than counting the same wages a second time.

The hypothesis to validate is that this reduces repeated data entry and preparation work. Competitor pages alone do not establish that benefit.

### 5. What will I learn?

Short explanations appear beside the result or missing input that makes them relevant. The initial topics are gross versus net pay, taxable income versus cash received, marginal versus average rates, and withholding versus calculated tax. Each explanation has a small worked example and a link to the applicable authority.

Later income modules add concepts such as business-use allocation and adjusted tax basis when the customer reaches those decisions. Learning is optional; completing a lesson never marks financial records as verified.

### 6. What happens when my records are incomplete?

The preview distinguishes **confirmed**, **assumed**, **missing**, and **unsupported** inputs. An unrecorded amount is not a confirmed zero. The user must confirm completeness for the selected period and entity; a valid Beancount file alone cannot establish that every income source has been recorded.

Show the exact obstacle and a useful next action: add a pay statement, confirm the remaining salary, resolve duplicate evidence, or seek review of an unsupported income source. A subtotal can remain available with its scope attached, but it must not appear as a complete tax bill or a “tax-ready” badge.

### 7. Can I compare countries or see whether moving saves tax?

International comparison is a later module. It needs separate, supported profiles for each jurisdiction, including the relevant period, household, income source, residence assumptions, and employee contributions. Display-currency conversion needs a named rate and date; it must remain distinct from any exchange-rate method required for tax reporting.

A comparison would show conditional scenarios, not determine residence, treaty eligibility, immigration rights, or the full cost of moving. A low headline rate is insufficient to establish a customer's tax outcome. Initial research should establish whether this is a useful acquisition route into ongoing bookkeeping.

### 8. Will AI decide which expenses are deductible?

AI may suggest mappings, identify missing evidence, and explain a calculation using its recorded sources. Reviewed, versioned calculation rules produce the numbers. An AI suggestion remains a suggestion until the customer or reviewer confirms it.

An expense account name cannot establish deductibility. A recorded acquisition cost may need adjustments before it becomes tax basis. A new market price cannot supply missing acquisition evidence or create a realized sale. Future modules must preserve these distinctions and retain the reason for each reviewed treatment.

### 9. What is saved, and what can I give my accountant?

The proposed public manual calculator runs its arithmetic in the browser without sending financial inputs to analytics or putting them in URLs. Connecting hosted records uses the existing private ledger permissions and requires a clear action. Neither mode sends records to a tax-data vendor merely to retrieve rules.

A review summary includes the covered period and tax components, confirmed inputs, assumptions, calculation details, evidence references, and unresolved items. Preview the contents before sharing; document access does not become public through a reference. It is a preparation aid, not a filed return or certification of completeness.

Local CLI support is a later client adaptation. Existing login and SSH requirements for obtaining hosted ledger files remain applicable; this proposal does not introduce a ledger-archive shortcut through the review summary.

### 10. How much will it cost?

Propose a free public explainer and a free, limited private pilot. Test whether customers value maintained rules, recurring reconciliation, saved scenarios, and reviewer collaboration enough to fund those services. No price, revenue forecast, or conversion claim is established by this research.

## Internal FAQ

### 11. Is CountryTaxCalc a good reference?

**Yes, for product entry and explanation; its tax content requires independent verification.** Its [homepage](https://www.countrytaxcalc.com/) presents salary and location inputs, country comparisons, breakdown options, and contextual guides without requiring signup. These are useful patterns to study. Their effect on acquisition or retention has not been measured here.

The public pages also contain material inconsistencies:

| Observed evidence on 2026-10-02 | Implication for Beancount |
| --- | --- |
| The homepage advertises 2026 data and self-employment support for most countries. The [methodology](https://www.countrytaxcalc.com/methodology/) still lists older source years, a December 2025 major update, and exclusions for self-employment. | Publish coverage and calculation assumptions from the same maintained specification. A current year in a page title cannot establish that every rule is current. |
| The [US guide](https://www.countrytaxcalc.com/tax-calculator/usa/) gives approximately $18,000 federal tax for $100,000 of income while presenting the 2026 basic standard deduction and brackets. Applying those assumptions gives $13,170 before credits; see the worked check below. | Generate explanatory examples from reviewed fixtures and check prose when rules change. This is a discrepancy in the published example, not a demonstrated runtime calculator defect. |
| That US guide still describes New Hampshire as taxing investment income. The state tax authority's [repeal notice](https://www.revenue.nh.gov/news-and-media/interest-dividends-tax-repeal) states that its interest and dividends tax was repealed effective January 1, 2025. | Review jurisdiction narratives as well as rate tables. Correct numbers cannot compensate for stale eligibility or coverage explanations. |

The review sampled public pages and checked selected statements against primary sources. It did not run an exhaustive calculator test, purchase API access, inspect private implementation, verify browser privacy claims, or measure traffic and revenue. The New Hampshire notice was available through its indexed official text; direct retrieval returned HTTP 403.

These findings justify independent validation before relying on the site's data. They do not establish that every calculator result is wrong.

### 12. Which references are stronger for specific parts of the product?

There is no single best reference for acquisition, calculation, evidence collection, and filing. Use sources according to the question they can answer.

| Reference | What the source establishes | Proposed lesson and limit |
| --- | --- | --- |
| [IRS Tax Withholding Estimator](https://www.irs.gov/individuals/tax-withholding-estimator) | Identifies eligibility, asks for pay records and personal context, and connects an estimate to withholding decisions. | Start with the customer's records and a concrete next step. An official withholding tool still has a defined scope. |
| [IRS recordkeeping guidance](https://www.irs.gov/businesses/small-businesses-self-employed/what-kind-of-records-should-i-keep) | Describes supporting documents and records needed for business income, expenses, and assets. | Make evidence and unresolved treatment part of preparation. An account category alone is insufficient. |
| [HMRC income-tax estimator](https://www.gov.uk/estimate-income-tax) | Names the exact UK tax-year dates, employee eligibility, and included deductions; routes other situations separately. | Define coverage before promising a result. Use the relevant national authority when adding a country. |
| [OECD Taxing Wages 2026](https://www.oecd.org/en/publications/taxing-wages-2026_3a5169ef-en.html) | Compares eight household types and distinguishes employee deductions, employer contributions, benefits, and labour costs. The 2026 publication uses data through 2025. | Define denominators and household assumptions in comparisons. Publication year is not the modelled tax year; aggregate comparisons cannot settle an individual's return. |
| [ProjectionLab Tax Analytics](https://projectionlab.com/help/understanding-tax-analytics-marginal-rates) | Documents annual drill-downs, tax and income components, bracket displays, and marginal-income exploration. It also identifies limits in its progression chart. | A stronger reference for explaining a financial plan over time. Make scenario interactions and exclusions visible; documentation is not independent validation of its results. |
| [PSL Tax-Calculator](https://taxcalc.pslmodels.org/) | An open-source model of US federal income and payroll taxes that accepts individual filing-unit data and documents cross-model validation. | Evaluate it as a calculation candidate and comparator. Verify the exact version, input semantics, supported law, licensing, and intended use before selecting it; it is not a filing integration. |
| [OpenFisca parameters](https://openfisca.org/doc/coding-the-legislation/legislation_parameters.html) and [calculation traces](https://openfisca.org/doc/openfisca-web-api/endpoints.html) | Documents dated parameters with legislative references and an API for inspecting calculations. | Model rule dates, provenance, and explanation paths explicitly. A framework does not establish the completeness of any country's rules. |

For payment timing and later estimated-tax features, use [IRS Publication 505](https://www.irs.gov/publications/p505). Its distinction between withholding, estimated payments, and payment periods shows why an annual liability divided by four is not a sufficient payment feature.

### 13. Which lessons should become product decisions?

| Lesson | Proposed decision |
| --- | --- |
| A specific question makes tax approachable. | Start with one understandable calculation and progressively reveal the information needed to personalize it. |
| Comparisons help explain a change. | Compare a baseline with one changed assumption and show the component differences. Keep assumptions separate from actual books. |
| Helpful pages can attract people before signup. | Publish a small set of maintained explainers tied to supported tasks. Measure whether readers subsequently use their records; do not equate page volume with adoption. |
| Source links need operational support. | Store the applicable period, rule revision, exact authority passage, review date, and reviewer alongside each supported calculation. |
| Broader coverage multiplies maintenance work. | Expand by reviewed jurisdiction, year, and income type. A new country name alone does not count as supported coverage. |
| Beancount already has a place for financial history. | Invest in reconciliation, evidence, and explanations of changes rather than requiring customers to re-enter the same totals each visit. |

### 14. What must the product preserve as it grows into Beancount Tax?

Keep three layers distinguishable: **recorded facts**, **reviewed tax treatment**, and **calculated results**. A rule update may change a result without rewriting the transaction that produced its inputs.

Each saved preview needs the ledger revision, selected entity and period, reviewed mappings, external inputs, forecast assumptions, ruleset version, and included tax components. A repeated calculation with the same inputs and rules must reproduce the result. A correction creates an identifiable new result with the affected components explained; it does not silently rewrite an earlier saved preview.

Mappings must handle ownership, multiple postings, transfers, refunds, and statement reconciliation without double counting. Combining ledgers requires explicit selection and permission. Keep unknown amounts and unsupported treatment visible in both human and machine-readable output.

Assign an owner and a qualified reviewer for every supported ruleset. Record enacted changes and their effective dates; treat proposed legislation separately. When coverage is known to be wrong, suspend the affected personal calculation until corrected while preserving access to prior records and their status.

Public customer capabilities must reach eligible REST, GraphQL, and MCP surfaces together, following the repository's [API parity requirements](../../backend-cluster/backend-v2/AGENTS.md#required-api-parity-workflow). Preserve authorization and the same assumptions, components, provenance, and incomplete-result behavior across interfaces. MCP writes remain explicit tools. Package-specific implementation and any engine selection belong in a subsequent ADR; this proposal adds no cross-package runtime dependency.

### 15. What should ship in each stage?

| Stage | Customer outcome | Evidence required to advance |
| --- | --- | --- |
| Research and prototype | Try a public wage example and a synthetic ledger reconciliation. | Confirm the target cohort and first jurisdiction; observe whether tracing records solves a recurring problem; obtain review of eligibility and the calculation contract. |
| Tax Preview pilot | Get the bounded estimate, explanations, reviewed record mappings, scenario comparison, and private review summary described above. | Pass accuracy, reconciliation, permission, and comprehension checks for every advertised scenario. |
| Tax preparation modules | Assemble reviewed schedules for one additional income type or jurisdiction, such as US freelance records or investment disposals. | Validate its evidence requirements and all applicable interactions. Existing support cannot silently imply the new calculation is complete. |
| Filing or payment integrations | Submit a supported return or make a supported payment through an explicitly selected integration. | A separate PRFAQ and implementation review covering provider contracts, consent, submission status, correction, and applicable operating requirements. |

International relocation modelling, corporate returns, payroll processing, and automatic deduction recommendations are separate expansion decisions. Keeping them outside the pilot makes its accuracy and customer value assessable.

### 16. How do we decide whether to continue?

Begin with 8–10 existing or prospective users spanning wage earners, freelancers, and investors, plus two tax practitioners. Use synthetic tasks initially and private records only with consent. This is discovery research, not a representative market sample.

Provisional pilot gates, to calibrate after baseline measurement:

- At least 80% of participants can explain the included tax, distinguish marginal from average rate, and identify an unsupported case without assistance.
- Every advertised calculation fixture agrees with an independently reviewed expected result under the documented rounding rules. Investigate every unexplained discrepancy; comparison with a second model alone is insufficient.
- No scenario silently treats missing data as zero, duplicates wages, changes actual transactions, or exposes another ledger's data in the acceptance suite.
- At least 70% complete a supported preview and find its source records unaided. Compare active work time with doing the same task using a standalone calculator and manual records.
- For a pilot lasting at least six weeks, at least half return to reconcile a later pay period or deliberately refresh their scenario. Record reasons for non-return and usefulness ratings; page views and lesson completion are secondary measures.

These are proposed thresholds, not measured outcomes. Stop expansion if users cannot understand the scope, reviewers cannot validate coverage, or maintenance cost is incompatible with observed value. Reconsider the wage-only launch if research demonstrates substantially greater demand for a different bounded workflow.

## Worked check of the published US example

Synthetic scenario: tax year 2026, single filer eligible for the basic standard deduction, $100,000 wage income, no other income or adjustments. Calculate ordinary federal income tax before credits; exclude payroll, state, local, and other taxes. The [IRS 2026 adjustment notice](https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill) supplies the deduction and brackets.

| Step | Calculation | Amount |
| --- | --- | --- |
| Taxable income | $100,000 − $16,100 | $83,900 |
| First band | $12,400 × 10% | $1,240 |
| Second band | ($50,400 − $12,400) × 12% | $4,560 |
| Remaining taxable income | ($83,900 − $50,400) × 22% | $7,370 |
| Federal income tax before credits | $1,240 + $4,560 + $7,370 | **$13,170** |

The marginal bracket is 22%; this tax divided by gross wages is 13.17%. An additional $10,000 of otherwise identical wage income adds $2,200 to this calculation. These are arithmetic checks for the stated scenario, not outputs from an implemented Beancount Tax engine or a complete personal tax estimate.
