# PRFAQ001 — Start a ledger that fits your life and work

Status: Proposal for review; no product changes implemented

Date: 2026-09-10

Updated: 2026-09-11

Scope: Starter catalog, dashboard creation, local `bea init`, preparation for future tax workflows, and the transition between local and hosted books

Research baseline: repository commit `a1c1bac8`, local command walkthroughs, and public documentation accessed 2026-09-10

Tax recordkeeping and conditional-question references reviewed 2026-09-11. The catalog below is a product proposal; its fixtures and new capabilities have not been implemented.

**Recommendation:** Ship seven purpose starters plus a blank entry point, defined in [Appendix A](#appendix-a-starter-catalog-and-delivery-contract). Each provides a clean account structure, a useful first task, and support for preserving evidence needed by future tax workflows. Ask only the few questions that change initial setup; collect transaction details when they become relevant. Keep fictional activity in a separate learning experience and make the same choices work in the dashboard and CLI.

## Press release

*Proposed launch copy, written as if released. These are proposed capabilities, not an announcement of current availability.*

**Beancount.io introduces starters for everyday money, businesses, investments, and shared finances**

*Create financial records that match your needs, in your currency, with a clear next step in the browser or terminal.*

Beancount.io today introduced guided ledger creation with starters for personal and household finances, freelance work, small businesses, investment portfolios, rental property, shared expenses, and community organizations. Customers can also start blank, bring existing records, or explore a separate example before committing to setup.

The experience begins with a practical question: what do you want to keep track of? A household can begin with cash and living expenses. A freelancer can track customer payments. An investor can record a purchase and its cost. Housemates can understand who paid and who still owes money. Each starter provides ordinary, editable Beancount files and a short guide to its first useful result.

Customers choose their currency and when their records begin, then add the first account they want to track. Someone who does not know an opening balance can leave it for later; the product explains which results remain incomplete. Example purchases and invented balances never appear in new real books. A short next step helps the customer record a transaction, review an import, or verify an existing balance.

The dashboard and `bea init` use the same setup concepts. Local creation works offline without a Beancount.io account. Customers who later want hosted access can bring those books into the dashboard without rebuilding them. Hosted books begin private, with sharing presented as a separate choice.

Customers can start small: no bank connection, accounting vocabulary test, or complete financial history is required. The setup can grow into more detailed bookkeeping as their needs develop.

The starters also help preserve receipts, ownership, original amounts, and acquisition records as customers use their books. These records support future tax preparation without requiring a tax questionnaire during creation. Filing support and country-specific tax calculations will be introduced separately.

Availability will follow a measured rollout after usability, accounting correctness, and compatibility checks. Core guided creation is proposed for existing entry plans; hosted ledger limits remain visible before creation.

## Customer FAQ

### 1. What is a ledger, and how many do I need?

A ledger is one set of financial records. It can contain many bank accounts, cash wallets, cards, investments, and income and expense categories. Customers should not need a new ledger for every bank account, currency, or calendar year.

Use separate ledgers when the books belong to different entities or need different access: personal and company finances, separate clients, or a private household account and a shared club. Put this explanation beside the first creation choice, with examples. A template does not determine legal ownership.

### 2. Who is this for?

The purposes in Appendix A cover everyday money, work, assets, and money managed with others. Within each purpose, design independently for accounting knowledge, software familiarity, and the records available. A developer may be new to bookkeeping; an experienced accountant may prefer browser forms. These are design scenarios, not validated market-size claims.

Students, retirees, and customers who use only cash can use the personal starter without salary or bank-account assumptions. International customers need language, currency, and tax jurisdiction to remain independent. Customers bringing historical records should enter through import; learners through demo; experts and agents through explicit presets or blank books.

Across all starters, test non-English and right-to-left interfaces, keyboard and screen-reader use, narrow screens, limited connectivity, and interruptions. Different members of a household may need separate private ledgers even when they use the same starter. Do not infer financial circumstances from age, nationality, language, or job title.

### 3. What does the dashboard ask me to do?

The entry page offers **Start new books**, **Bring existing records**, and **Explore an example**. Existing customers reach the same flow from **New ledger**. These describe different starting situations; importing and learning should not be hidden inside a template picker.

For new books, use three short stages, with a compact review in the final stage:

1. **Choose a starter.** Present the seven named purposes in Appendix A and a visible **Start blank** option, each with a one-sentence outcome. Visual groups can aid scanning without introducing another required selection. Show no sub-options for unselected starters. After a selection, offer at most two relevant setup questions as described below; both may be deferred.
2. **Set the basics.** A human-readable title, currency for the initial accounts and reports, and the intended history start. Suggest a title from the purpose and an editable currency from an explicit saved preference or locale hint. Language alone must not silently select a currency. Present **Start from a chosen date** and **Bring earlier history**; neither requires reconstructing a lifetime of transactions.
3. **Start with your first account where relevant, then review.** Offer bank account, cash, card, or another account. Ask for its name, currency, and whether its opening balance is known. Allow more accounts or **Set up accounts later**. Blank skips account setup. Shared expenses without a shared pot can proceed to the first bill after creation without adding a bank account. Review the title, currency, start boundary, selected accounts, and privacy before **Create ledger**.

Description, repository address, and file layout stay expandable. Tax profiles and complex business configuration are introduced when needed after creation. Use a suggested valid address when the title cannot form an ASCII slug; `家計簿` must remain a usable title. Preserve choices when navigating back or correcting an error. Make the destination and visibility clear before saving.

After creation, show one recommended action and a visible way to choose another: **Record a transaction**, **Import records**, or **Verify a starting balance**. Keep unfinished setup accessible even after financial activity appears. Someone who creates a valid empty ledger has completed creation, but has not yet reached their first financial result.

### 4. Which starters will we provide?

The first-release catalog is **personal, freelance, business, portfolio, rental, shared-expenses, community, and blank**. [Appendix A](#appendix-a-starter-catalog-and-delivery-contract) defines the account groups, tax-preparation facts, creation questions, later prompts, teaching examples, and acceptance scenario for each. This catalog is the proposed delivery scope; research will refine labels and defaults rather than leave starter selection undefined.

Personal and household finances share a starter with optional ownership detail. Shared expenses have a distinct starter because advances, allocations, and repayments are their central job. Freelance and business starters have different entry guidance and equity needs while reusing account groups. Language, currency, jurisdiction, and expertise are configuration dimensions; they do not multiply the catalog into separate copies.

Generate the selected financial accounts and the starter's small core of counterpart categories. Preview additional account groups before adding them. Starter choice remains editable through account additions and reviewed changes; it never locks the ledger to one purpose. Investment and rental starters ship with basic validated scenarios. Complex imports, tax calculations, payroll, and specialist automation can follow without delaying these basic structures.

### 5. How do sub-options help without making setup complicated?

Beyond the shared title, currency, date, and first-account basics, use a design budget of **zero to two optional questions per starter in total during creation**. A simple follow-up counts toward that budget, with at most one level of nesting; detailed forms become later tasks. This is a hypothesis to test, not a universal usability rule. Every question must change the initial accounts, evidence capture, or recommended next task, and explain that effect in one sentence.

| When to ask | Information needed | Example |
| --- | --- | --- |
| During creation | A fact that meaningfully changes initial structure | Whether a freelancer wants to track unpaid customer invoices |
| On first use | Details needed for the selected job | Quantity, acquisition date, cost, and fees for an investment purchase |
| During entry or import review | Facts specific to this transaction | Receipt, business purpose, ownership, or a personal/business split |
| When tax preparation is enabled | Confirmed filing context and unresolved treatment | Entity, jurisdiction, tax year, and accounting method |

Ask about a familiar task, such as “Track customer invoices before they are paid?” Pair it with “Adds unpaid customer balances and payment tracking.” Choosing this option does not elect a tax accounting method. “Not needed” and “Not sure / set up later” are distinct states; an unanswered option must not become a claim that the activity or tax obligation does not exist.

Ask only about the selected starter. Carry forward previous answers, allow back navigation, and show the resulting account preview. Put complex follow-ups in their own later task. Adding a capability later must preserve existing books; turning off its guidance must not delete used accounts or transactions. These choices follow established guidance to ask only necessary questions, permit uncertainty, and keep conditional follow-ups simple. [GOV.UK question pages](https://design-system.service.gov.uk/patterns/question-pages/), [conditional questions](https://design-system.service.gov.uk/components/checkboxes/).

### 6. How do starters prepare for future tax filing?

Every starter includes support for preserving useful records by default. Customers supply those records at the relevant transaction or import step; tax setup is optional during creation. The first release promises traceable records and visible gaps. It does not determine deductibility, certify a return, or submit a filing.

Tax preparation needs more than expense names. For example, IRS guidance describes supporting documents for business expenses and records of asset acquisition, improvements, use, and disposal. This supports capturing evidence when it is available rather than reconstructing it at year-end. [IRS recordkeeping guidance](https://www.irs.gov/businesses/small-businesses-self-employed/what-kind-of-records-should-i-keep).

Use three complementary parts:

- **Durable facts.** Preserve original dates and amounts, currencies, counterparties, source documents, ownership, and relevant allocations. Keep invoice and settlement dates, gross amounts and separately stated fees/taxes, and asset lots and acquisition records when applicable. Unavailable facts remain explicitly unknown; templates must not invent them.
- **Stable accounting meanings.** Account names may change without losing their category meaning. An account can provide a default classification; individual postings can override it, including mixed personal/business use. A business-use proportion is a recorded fact or reviewed allocation, distinct from a tax deduction percentage.
- **Optional tax profiles and versioned rules.** Future profiles identify the reporting entity, jurisdictions, tax year, and confirmed treatment. Rules map ledger categories to the applicable forms by jurisdiction and year, preserving overrides, provenance, and review history. Changing a rule must not rewrite historical books or alter a previously reviewed export silently.

Keep ledger access, economic ownership, and filing identity separate. A household ledger can contain records for multiple people; a bookkeeper can manage multiple entities. UI language and currency do not establish tax residence. History start, accounting period, and tax year are independent, and profiles may need different effective periods or jurisdictions. Official UK guidance illustrates how invoice timing, settlement timing, and accounting method can affect the reporting period. [UK business records guidance](https://www.gov.uk/self-employed-records).

Do not collect tax identifiers or a full filing questionnaire during basic setup. Show specific preparation gaps such as missing evidence, unresolved ownership, or a classification awaiting review. A skipped tax profile never means “ready to file.” Appendix A specifies what each starter must help preserve and when to ask for it.

### 7. Do I need to understand debits and credits?

No. Guided setup uses “money you have,” “money you owe,” and “starting balance,” with the accounting terms available beside them. Ask “You owe 300 EUR” for ordinary card debt and generate the corresponding negative liability posting. Support a card credit and an overdrawn bank account explicitly as well.

Show a readable preview and let experts inspect the generated entries. The underlying file keeps standard Beancount syntax. Changing interface language changes labels, not existing account identifiers. Customers may edit account names with validation; setup must not silently rename established books.

### 8. What if I do not know my balance or need older transactions?

**Unknown, confirmed zero, and a known nonzero balance are different states.** A skipped balance creates no invented money. Show “Starting balance not verified” and identify affected totals. A zero balance explicitly confirmed by the customer is a valid starting point.

Explain the boundary in ordinary language: the opening amount is the balance before the transactions being brought in. For example, a statement closing on August 31 can anchor records beginning September 1. An implementation can record the opening transaction on August 31 and its balance assertion on September 1, with accounts open before the posting. Beancount checks assertions at the beginning of their date. This behavior follows the upstream accounting model. [Beancount getting started](https://beancount.github.io/docs/getting_started_with_beancount/), [Beancount.io quick start](https://beancount.io/docs/Basics/getting-started).

For historical imports, preview the earliest transaction and opening boundary together. If earlier history is added later, review account open dates and the opening entries as one change; changing dates alone can double-count money. Do not silently pad a discrepancy to make validation pass. An accountant importing a trial balance must preserve the supplied equity structure and review any unexplained difference.

### 9. Can I use several currencies?

Yes. Separate the reporting currency preference from each account's permitted currencies and from commodities such as shares or crypto. The same ledger may hold EUR cash, USD savings, and investment units. Currency selection must not imply conversion or a bank connection.

Guided amount fields accept the selected locale's unambiguous number format and show the normalized amount before saving. If a separator is ambiguous, ask for correction rather than guessing. Machine-oriented CLI flags retain decimal-point syntax and decimal-string amounts. Preserve zero-decimal currencies and commodity precision; do not assume every amount has two decimal places.

Without the necessary prices, show amounts by unit and identify unavailable conversions. Setup must not claim that a portfolio is initialized merely because its cash is initialized.

### 10. What if I already have records?

Start with the source: existing Beancount files, a supported bank or app export, or a custom mapping. Do not require customers to create and then remove an unrelated chart of accounts.

For Beancount, identify the root file, collect its includes, preserve account names, commodities, lots, and metadata, and validate the complete file set before creating a destination. Unsupported plugins or missing includes need a specific explanation. Never upload an entire working directory as a shortcut.

For exports, show supported formats and preview dates, accounts, categories, duplicates, and the opening boundary using the existing import capabilities. Unsupported formats get a clear path to mapping or an importer; the creation wizard does not promise universal migration. Keep source files untouched. A valid parse is insufficient evidence that the imported account matches the source balance.

### 11. How does this work with `bea init`?

Interactive `bea init` guides customers through the same purpose, title, currency, history, and first-account decisions. Skip questions already answered by options. It remains a local command: no account, network request, bank connection, or model call is required to create books.

Proposed command shape; the new `--preset` and `--title` options below are not implemented:

```sh
# Guided local setup
bea init ./books

# Explicit setup for scripts; preset names include a stable version.
bea --no-input --json init ./books \
  --preset freelance@1 --title "Studio books" \
  --currency EUR --date 2026-09-01
```

Expose the same eight preset IDs, optional capabilities, account selection, and opening records through explicit options or a documented input file so automated callers can express every guided choice. Omitted sub-options remain deferred, consistent with the wizard; machine callers never receive surprise questions. The exact expanded schema belongs in the implementation design. Show the created path, chosen preset/version, validation result, unresolved setup items, and a command for the selected next task in the appropriate human or JSON output.

Preserve existing scripts' accepted flags, exit categories, target resolution, private file creation, and refusal to overwrite. Existing unattended calls without a new preset retain their account names and signed opening-balance semantics. An explicit preset/version opts into a new structure. Human-friendly debt entry in the wizard must not reverse existing `--opening-balance` values.

### 12. Can I start locally and use the dashboard later?

Yes, through an explicit hosted action that imports the existing books into one private destination. Creating local books must not create a remote account or imply synchronization.

Proposed extension; `--from` below does not exist today:

```sh
bea cloud login
bea cloud ledger create studio-books --from ./books/main.bean
```

Preview the file set and destination, validate the include graph, and create the hosted ledger from those files instead of a starter. Preserve content; transfer of Git history is a separate capability. Return a dashboard link and explain how subsequent updates work. Do not describe a one-time upload as ongoing sync.

The inverse remains available through hosted ledger cloning. A failed transfer must identify whether the destination already exists and how to resume without creating another book. Existing `create --clone` behavior already distinguishes remote creation from clone failure and should retain that honesty.

### 13. How do examples, privacy, and sharing work?

Each purpose starter has three to five separate teaching examples covering the jobs in Appendix A. Explore opens these in a dedicated demo, clearly marked in every report, with no personal financial data and no use of a customer's hosted ledger allowance. Reading an example should be possible before signup. Creating real books from it carries forward only deliberately selected structure; it never copies example transactions, balances, identities, or documents. Blank books can link to general syntax examples without adding a populated counterpart.

All real hosted creation paths start private, including optional automatic creation during signup. Offer collaboration after the first useful result and show what invitees can access before an invitation is sent. A shared purpose does not automatically publish books or invite anyone. Public ledgers remain useful for education and transparency, but publishing is a separate explicit action.

Existing customer ledgers are not automatically scrubbed, renamed, or made private. Offer an inspectable cleanup or visibility change where appropriate. Do not infer that a real transaction is fictional from its amount or date.

### 14. What if I leave halfway through or something fails?

Allow return to an unfinished hosted setup and preserve non-sensitive choices across authentication. Keep an OAuth/device authorization flow's return destination intact; ledger creation must not strand the original task. Do not store raw balances or uploaded records in unprotected browser persistence.

Recheck permissions, plan limits, and name conflicts when creating. Validate before committing files; show progress until the ledger is actually readable. A network timeout must not produce a false success message or blindly create a second ledger. Repeated submission of the same creation intent should return the same destination or a precise recoverable status. Local initialization keeps its existing atomic creation and conflict behavior.

## Internal FAQ

### 15. What did the research establish about today's experience?

This is an implementation and documentation study, with local CLI execution. It includes no customer interviews, support-ticket analysis, or production conversion data. The authenticated dashboard form was reviewed in source; a live unauthenticated visit to `/auth/welcome` redirected to login, as did `/ledger-gallery`. No hosted ledgers or user accounts were created. These limits matter: the friction below is observed behavior or a stated inference, not measured abandonment.

| Area | Verified current behavior | Product implication |
| --- | --- | --- |
| Dashboard creation | First-ledger welcome and the existing-ledger dialog share a form with name, Starter/Sample, description, privacy, and **Save**. Defaults are Starter and private; a `my-book` name is suggested. No creation inputs for currency, dates, balances, or purpose. | Useful defaults exist, but financial setup follows repository setup. [Form](../../dashboard/src/features/ledger-list/components/ledger-form.tsx), [welcome](../../dashboard/src/features/ledger-list/pages/welcome-page/index.tsx), [dialog](../../dashboard/src/features/ledger-list/pages/dashboard-page/components/dashboard-sidebar.tsx). |
| Hosted starter | The default is one `main.bean`, USD, title `Example Beancount file`, 30 explicit accounts opened in 1970, an auto-accounts plugin, and a dated example adding 14.99 USD to cash against equity. Sample is a detailed file set with US-oriented fictional activity. | Both choices contain fictional financial activity. A customer needs to distinguish it from their own books; account creation is not personalization. [Templates](../../backend-cluster/backend-v2/src/features/ledger/utils/ledger-template.ts), [selection](../../backend-cluster/backend-v2/src/features/ledger/workflow/ledger-workflow.ts). |
| Local initialization | `bea init` writes `Personal ledger` with 14 fixed accounts. It prompts for currency (USD suggestion), earliest date (today suggestion), and checking balance (zero suggestion). Optional signed opening amounts accept only the starter's asset/liability accounts in one currency. Without nonzero balances, it adds no live transactions. | A good small personal scaffold, but custom work accounts and unknown balances need a better path. It is materially different from hosted creation. [Implementation](../../cli/src/cli/commands/init.py). |
| After creation | Welcome navigates to the overview, or back to OAuth consent. The overview already has an account/first-entry checklist when there is no financial activity, with a separate read-only state. Nonzero activity controls whether it appears. | Extend existing guidance. Nonzero example or opening activity can hide it; activity is not evidence that onboarding is complete. [Empty setup](../../dashboard/src/features/reports/overview/components/empty-ledger-setup.tsx), [activity logic](../../dashboard/src/features/reports/overview/lib/overview-utils.ts). |
| International titles | Dashboard slugification removes characters outside ASCII letters, digits, underscores, and hyphens and requires a nonempty result. | A title such as `家計簿` cannot pass this form; separate readable title from technical address. [Form validation](../../dashboard/src/features/ledger-list/components/ledger-form.tsx). |
| Hosted CLI creation | `bea cloud ledger create` is private by default, can clone, and exposes no template, currency, or opening-account choices. Its request omits the API's existing template field. | Local init and hosted creation are separate workflows; a common plan and explicit transfer close the gap. [Commands](../../cli/src/cli/commands/cloud/ledger/app.py), [request construction](../../cli/src/cli/commands/cloud/ledger/manager.py). |
| Signup edge path | Ordinary dashboard signup defaults `withDefaultLedger` to false. When explicitly enabled, the backend creates a `Default` ledger using the same starter with `private: false`. | Privacy defaults are inconsistent across entry paths. This is a conditional path, not a claim that normal signup publishes every new user's books. [Signup UI](../../dashboard/src/features/auth/pages/register/index.tsx), [backend path](../../backend-cluster/backend-v2/src/features/auth/service/auth-service.ts). |
| Existing guidance | The public quick start begins with Beancount syntax; the CLI guide gives a complete personal purchase example. Purposeful household, freelance, rental, and investment examples already exist in documentation. | Reuse existing accounting examples and improve the handoff into creation; do not build another disconnected template collection. [Quick start](https://beancount.io/docs/Basics/getting-started), [CLI walkthrough](https://beancount.io/docs/Basics/bea-cli), [working examples](https://beancount.io/docs/examples). |

Local walkthroughs used isolated synthetic ledgers under `cli/tmp/`, then removed them:

- Interactive setup prompted for currency, date, and checking balance; EUR, 2026-09-01, and 123.45 produced the advertised 14-account file and next-command guidance.
- EUR cash of 100 and card debt of 30 produced a valid ledger and net worth of 70 EUR; the file had POSIX mode `0600`.
- A JPY initialization without opening balances produced a valid ledger with zero transactions.
- Repeating creation returned conflict exit 4 and preserved the original bytes. Missing currency unattended returned usage exit 2.
- Opening `Assets:BusinessBank`, specifying a currency on an individual opening amount, and using `100,50` each returned usage exit 2.
- A transaction before the chosen opening date returned validation exit 1 and explained the inactive accounts; nothing was written.
- Separately parsing the hosted starter with Beancount confirmed its 30 explicit accounts, one example transaction, and zero validation errors. Technical validity does not make an example balance the customer's balance.

### 16. What do other products and upstream guidance suggest?

GnuCash separates new books, import, and learning on first run. Its account assistant exposes currency, account categories, a preview, and opening balances, including language/country choices. This is evidence of a useful pattern, not evidence of conversion improvement. Our inference is to adopt purpose and preview while reducing the mandatory setup surface. [GnuCash setup documentation](https://www.gnucash.org/docs/v5/C/gnucash-guide/basics-running-gnucash.html).

Actual Budget connects account setup to a dated starting balance and the transactions since that date, explicitly includes cash, and encourages categories to evolve. Our inference is to make the first verified account the center of setup while allowing incomplete knowledge. Its budgeting-specific recommendation about limiting old history should not become a restriction on business books or historical Beancount imports. [Actual Budget: Starting Fresh](https://actualbudget.org/docs/getting-started/starting-fresh/).

Upstream Beancount treats starting balances, dated account openings, and later historical additions as substantive bookkeeping decisions. Our inference is that a shorter form alone cannot solve onboarding: creation must help establish a consistent starting boundary. [Getting started with Beancount](https://beancount.github.io/docs/getting_started_with_beancount/).

### 17. What should we build first, and what should we defer?

| Increment | Deliverable and release gate |
| --- | --- |
| Establish the baseline and catalog | Instrument the hosted creation-to-first-result funnel and run representative tasks against current flows. Inventory all creation paths, including signup, invitations, OAuth, dashboard, CLI, REST, GraphQL, and MCP. Turn each Appendix A contract into a clean fixture, isolated teaching examples, and known expected results. |
| Ship coherent new books | All seven purpose starters plus blank, including basic investment and rental scenarios; title/currency/date/account setup; zero-to-two optional questions; known/unknown balances; starter-specific evidence capture and a resumable next step. Release dashboard and explicit CLI presets together after both engines validate the fixtures and accounting, accessibility, privacy, and compatibility gates pass. New hosted Starter creation stops seeding example activity across all eligible surfaces; communicate that default change. |
| Connect existing books | Validate and transfer existing Beancount file sets; route supported exports into the current import preview with setup context retained. Include the explicit local-to-hosted command. Gate on identical books after transfer and recovery from partial failure. |
| Expand automation and tax workflows | Add advanced investment imports, corporate actions, property automation, payroll, inventory, and fund-accounting workflows according to validated demand. Introduce jurisdiction/year tax mappings, reviewed preparation exports, and eventually filing through separately scoped releases. Preserve the original records and starter compatibility. |

Initial creation includes the data and evidence foundation for future tax preparation. Automatic tax determination, return generation/submission, payroll calculation, specialist valuation, a universal migration engine, new bank integrations, and automatic synchronization remain later work. Build on the existing accounting engine and report surfaces. A basic starter must deliver its stated first result before it is listed, even when advanced automation is deferred. Native mobile onboarding is a subsequent client adaptation; shared backend changes still need compatibility checks for mobile callers.

### 18. What must remain consistent across clients?

Define one versioned setup specification: preset ID/version, title, selected capabilities and their answered/deferred state, account selection, currency and commodity declarations, history boundary, supplied opening records, and whether the book is a demo. The catalog owns the core account groups, optional questions, category meanings, evidence requirements, and next tasks. Resolve defaults explicitly. The same specification must yield equivalent accounting entries and reports whether rendered by local Python tooling or the hosted service.

Preserve demo identity and unresolved opening-balance status in portable ledger metadata, with a documented interpretation in both clients. Cloning or reopening a file must not turn an unknown starting balance into an apparently verified zero. Keep these annotations compatible with ordinary Beancount tools; they do not substitute for actual postings or assertions.

Preserve stable category meanings, economic ownership, source references, and transaction/posting overrides in the same portable contract. Linked evidence must remain identifiable after transfer, with missing or inaccessible documents reported explicitly. Reserve an extensible representation for entity/jurisdiction/period tax profiles without requiring them to create books. Keep future tax-rule versions independent of starter versions; a new tax year must not require a new ledger or preset.

Use a canonical catalog and common conformance fixtures with package-local consumers; avoid cross-package runtime imports or a second accounting engine. Validate representative outputs with Beancount and the deployed ledger engine. Existing account names and history never change merely because a preset is updated.

Extend eligible REST, GraphQL, and MCP creation/preview capabilities together, preserving credentials, scopes, authorization, limits, failure behavior, and retry semantics. Regenerate the OpenAPI snapshot and CLI clients. New dashboard-only configuration would recreate the current problem. Follow the repository's [API parity requirements](../../backend-cluster/backend-v2/CLAUDE.md#required-api-parity-workflow).

Coordinate updates to tutorials and the agent-facing [beancount-init skill](../../skills/.claude/skills/beancount-init/SKILL.md), which also describes a fixed personal scaffold and fallback. They should teach the released behavior and expose the same customer decisions.

### 19. How will we know the experience improved?

Track a funnel with separate states: **setup started → valid ledger created → real starting position established → first useful result → continued use**. A created file, demo activity, and a positive chart are not interchangeable activation events.

Use each starter's first result in Appendix A to define activation: a purchase and its balance effect, unpaid customer money, a company's funding position, investment units and costs, rental receipts and deposits, member settlement balances, or community funds remaining. For migration, compare an imported account with a source balance. Confirmed zero is legitimate; unknown holdings or valuations remain visible. Exclude fictional entries from real-book activation and track demo learning separately. Tax-preparation completeness is a distinct later measure and must not block initial bookkeeping activation.

Provisional targets below are decision thresholds to calibrate after baseline research, not measured performance or launch claims:

- At least 80% of participants complete their assigned core setup task unaided, with no recurring critical failure hidden by the overall average.
- For simple new books, median active setup time under two minutes and first useful result under five minutes. Also report end-to-end time including installation, authentication, and obtaining source records; analyze migration and portfolio tasks separately.
- Improve seven-day first-result completion by 15 percentage points over the measured hosted baseline without reducing continued use in days 8–30.
- Zero fictional entries in new real starters, unintended public creation, overwritten ledgers, duplicate destinations from retries, or falsely confirmed unknown balances in the release scenario suite.
- Track optional-question exposure, deferral, backtracking, and completion time by starter. Keep the zero-to-two question budget unless research demonstrates a better outcome from a change. A high skip rate alone does not prove failure when customers can finish their task and add the capability later.
- Track evidence availability and unresolved ownership/classification when customers use the relevant tasks. Missing records stay visible; enabling a starter or skipping a tax profile must never mark an account or return as tax-ready.

Measure drop-off and errors by entry point, intent, new versus returning customer, and voluntarily supplied research context. Examine language, device, accessibility, and accounting familiarity in usability research without inferring protected demographics. Do not log titles, account names, balances, file contents, or financial records as analytics. Local CLI measurements require opt-in research or telemetry; offline users cannot be silently counted in a hosted funnel.

### 20. What customer research and acceptance work is still needed?

Run two rounds of 8–10 participants, mixing accounting beginners and experts with browser and terminal preferences. Distribute tasks across all seven purposes, blank books, and historical migration; include cash-only and shared-household variations. Include non-English, decimal-comma, right-to-left, and assistive-technology sessions. These samples identify usability failures; they cannot establish population conversion rates or represent every background.

Use Appendix A's synthetic scenarios plus tasks that skip an unknown balance, add a deferred capability, import history older than today, choose private/shared boundaries, and recover from interrupted creation. Ask participants to explain what changed when they selected a sub-option and which totals or records remain unverified. Distinguish inability to find an action from misunderstanding the accounting.

Before broad rollout, require every Appendix A acceptance scenario to pass with equivalent dashboard/CLI accounting results and valid file graphs on both engines. Also cover zero, unknown, debt, overdraft, non-USD, multiple-currency, and historical starts; no incomplete success after transfer failure; keyboard and screen-reader completion; locale-aware number review; and representative existing scripts. Verify that renaming accounts preserves category meaning, source/ownership facts survive transfer, deferred options remain deferred, and mixed-use or missing-evidence entries remain reviewable. Confirm that switching guidance preserves existing entries. These are required implementation checks, not tests executed for this proposal.

The starter catalog and approach to preserving evidence are the proposed product decisions. Research must refine the labels, core categories, optional questions, and timing of later prompts. The first supported filing jurisdictions and submission integrations belong to a future tax PRFAQ. Roll out to an opt-in cohort, compare the defined outcomes with baseline, and pause expansion if correctness or privacy gates fail.

## Appendix A: Starter catalog and delivery contract

This appendix defines the first-release catalog. IDs are proposed stable identifiers shared by dashboard and CLI; `@1` denotes the initial version. Account names below specify the intended catalog, with customer-facing labels localized separately. They are editable and are not jurisdiction-specific tax classifications. All numeric examples are synthetic acceptance targets, not customer data or results already verified for these proposed starters.

Unless an opening amount is specified, the numeric scenarios begin with confirmed zero balances. Monetary amounts use one selected currency; investment quantities retain their own commodity units.

| Starter | Preset ID | Customer's first useful result |
| --- | --- | --- |
| [Personal and household](#a1-personal-and-household) | `personal@1` | Record a purchase and understand its effect on money remaining |
| [Freelance and side business](#a2-freelance-and-side-business) | `freelance@1` | Record customer income or see what an unpaid customer still owes |
| [Small business and company](#a3-small-business-and-company) | `business@1` | Establish an opening position and distinguish funding from revenue |
| [Investment portfolio](#a4-investment-portfolio) | `portfolio@1` | Record a purchase and verify units, acquisition records, and cash movement |
| [Rental property](#a5-rental-property) | `rental@1` | Record receipts and distinguish rent from a refundable deposit |
| [Shared expenses and settlement](#a6-shared-expenses-and-settlement) | `shared-expenses@1` | Record an advance and see who owes whom |
| [Community organization](#a7-community-organization) | `community@1` | Explain contributions, project spending, and funds remaining |
| [Blank](#a8-blank) | `blank@1` | Add a chosen structure without removing unwanted categories |

### A.0 Common delivery requirements

Every purpose starter delivers five things together:

1. **A clean ledger.** A small core of income/expense/equity categories, selected real financial accounts, and optional account groups enabled by the customer's choices. Open directives use the reviewed history boundary. No balances, transactions, identities, or documents are invented. Business opening records preserve the supplied equity structure. Blank is the exception with no initial account tree.
2. **A bounded setup.** Zero to two starter-specific optional questions in total, including follow-ups, with their account or workflow effect stated. Account names, people, instruments, and other detailed records can be completed at first use. Skipped answers remain deferred. Existing banks, cards, and wallets are created only when selected; the catalog does not imply the customer owns them.
3. **Evidence capture at the relevant task.** Support the facts named below when recording or importing that activity. Preserve source links, original values, unknowns, and review decisions through ordinary file editing and local/hosted transfer. A missing receipt or unknown acquisition cost remains visible without blocking unrelated bookkeeping.
4. **A separate teaching pack.** Three to five worked examples and a short route to the first result, using current reports, account balances, or queries where possible. Demonstration records are isolated from real books. Blank instead links to general examples.
5. **Executable acceptance fixtures at implementation time.** Validate clean and populated examples on Beancount and the hosted engine; compare accounting results across dashboard and CLI, including optional/deferred paths. Verify both numeric results and preservation of evidence, ownership, and unresolved classifications. No starter is considered complete merely because an empty file parses.

All populated starters must compose with existing imports: include the importer's required review account, such as `Expenses:Uncategorized`, or provide a supported explicit mapping. Review entries must remain distinguishable from confirmed classifications. Keep semantic categories separate from tax-form line numbers, and support transaction/posting overrides rather than assuming one account always receives one tax treatment.

### A.1 Personal and household

**Use and scope:** Everyday income, expenses, cash, debt, and household balances. Suitable for cash-only users, students, retirees, and families without assuming salary, a bank, a card, or joint tax filing. Use shared-expenses when reimbursement between people is the main task.

- **Base catalog:** Selected `Assets:Cash`, bank accounts, and card/loan liabilities; `Income:General`; everyday categories for food, housing, transport, utilities, health, and other spending; `Equity:OpeningBalances`. Add distinct income sources when actually used.
- **Creation question (one):** “Track whose income or assets these are?” Enable ownership attribution; ask for member details at first use. Explain that this does not grant access or establish filing status.
- **Tax-preparation facts:** Income source and owner; available gross pay, withholding, and net pay; receipt/source references; ownership of jointly held assets. Category names alone do not establish a deduction or exemption.
- **Later prompts:** At salary import, offer a payslip split rather than infer gross salary from a net deposit. At a shared transaction, confirm its attribution. Record donation, interest, or other supporting statements when supplied.
- **Teaching examples:** Cash purchase, income deposit, account transfer, card payment, and shared ownership attribution.
- **Acceptance scenario:** With a confirmed opening cash balance of 100, a purchase of 12.50 leaves cash of 87.50 and expense of 12.50 in the chosen currency. An unknown opening balance leaves the spending entry usable but the total balance unverified. No salary or card account is required.

### A.2 Freelance and side business

**Use and scope:** Services, consulting, contracting, and other independent work, with business costs distinguished from the owner's personal money. The starter does not determine legal entity status or elect a tax accounting method.

- **Base catalog:** Selected business bank/cash/card accounts; `Income:Services`; software, supplies, travel, and fee expenses; owner contributions and drawings. The invoice option adds `Assets:AccountsReceivable`; asset records and separately stated taxes can be added at the relevant task.
- **Creation questions (two):** “Track customer invoices before they are paid?” adds receivables and invoice/payment guidance. “Review income and costs by client or project?” enables allocation labels without requiring an account for every client.
- **Tax-preparation facts:** Business purpose and source documents, personal/business splits, gross customer receipts and separate payment fees, invoice and settlement dates, client/project attribution, and original currencies. Owner funding remains distinct from customer income.
- **Later prompts:** Ask for client/invoice details on the first invoice; for evidence and allocation on a mixed-use expense; for net/tax/gross components when a document separately states tax. Asset acquisition records are collected on the first equipment purchase. None of these choices silently determines deductibility or tax registration.
- **Teaching examples:** Direct customer payment, invoice with partial payment, owner contribution, mixed-use expense, and payment-processing fee.
- **Acceptance scenario:** In invoice-tracking mode, an invoice of 1,000 followed by payment of 400 leaves customer receivables of 600 and adds 400 to bank cash. The invoice and receipt stay linked and the payment does not book the same revenue twice. With invoice tracking deferred, a direct payment can be recorded without answering invoice questions.

### A.3 Small business and company

**Use and scope:** Separate company books with funding, operating activity, and an opening position. Provide a path for an accountant's chart or trial balance. The starter supplies a basic structure without prescribing a legal form, share structure, or tax regime.

- **Base catalog:** Selected business financial accounts; sales/services revenue; operating expenses; capital and opening/retained equity as supported by supplied records. Optional groups include receivables/payables, fixed assets, loans, and separately stated tax balances.
- **Creation questions (two):** “Track customer invoices and supplier bills before payment?” enables receivables/payables. “Track equipment and other assets over time?” enables the fixed-asset records and acquisition guide.
- **Tax-preparation facts:** Entity ownership, invoice/payment dates, gross/net/tax components, business purpose, source documents, asset acquisition and in-service dates, and reviewed capital/loan classifications. Preserve earlier depreciation and adjustments if supplied; never fill them with assumed values.
- **Later prompts:** Collect legal or filing context when preparing the relevant report, asset details at purchase, and payroll/inventory integration requirements when those activities first arise. Enabling invoice records must not automatically choose the filing basis.
- **Teaching examples:** Capital contribution, loan funding, customer invoice/payment, supplier bill/payment, and equipment acquisition.
- **Acceptance scenario:** A capital contribution of 1,000 and a loan of 500 produce bank assets of 1,500, a loan liability of 500, equity of 1,000, and zero sales revenue in statement presentation. Importing an opening trial balance preserves its supplied equity and identifies an unexplained difference rather than inventing an adjustment.

### A.4 Investment portfolio

**Use and scope:** Basic ownership and cash activity for stocks, funds, and crypto. Use the same starter for different instruments and currencies; the first release supports validated ordinary purchases, holdings, income, and disposals.

- **Base catalog:** Selected broker/wallet cash and holdings accounts; user-selected commodity declarations; dividend/interest income, fees, and a disposal gain/loss category. Keep acquisition lots separate where the source provides them.
- **Creation question (one):** “Bring investments you already own?” starts an opening-holdings task and requests the relevant statement or acquisition records when that task is opened. A customer can defer it and begin with cash or a new purchase.
- **Tax-preparation facts:** Instrument, owner, acquisition and disposal dates, quantity, original costs and currencies, fees, lot references, and broker/wallet source documents. Preserve original FX amounts and any supplied rate/date/source. Unknown basis must not be replaced by today's market value.
- **Later prompts:** Ask for purchase details on the first trade; for lots when bringing holdings or selling; for prices only when requesting valuation. Record the chosen book treatment of fees visibly while retaining the original fee for later tax review.
- **Teaching examples:** Cash funding, purchase with fee, dividend, partial disposal of a specified lot, and transfer between tracked accounts.
- **Acceptance scenario:** Buying 10 units at 20 with a separately recorded fee of 2 yields 10 units and a cash outflow of 202. The acquisition amount of 200 and fee of 2 remain separately recoverable. Missing market prices do not prevent quantity reporting; missing acquisition costs prevent a claim that gain or tax basis is verified.

### A.5 Rental property

**Use and scope:** Basic rental receipts, expenses, deposits, and borrowing for one or more properties within the same books. Separate entities or access needs still require separate ledgers.

- **Base catalog:** Selected bank/cash accounts; rental income; repair, insurance, management, and other property expenses; refundable-deposit liabilities. Optional groups include loans and interest. Give each property a stable reference; acquisition and improvement records can attach to it without requiring its street address during creation.
- **Creation questions (two):** “Track more than one property?” enables property-level attribution. “Track a loan for the property?” adds the loan and principal/interest recording guide.
- **Tax-preparation facts:** Property and ownership attribution, rental/use periods, receipts, loan principal/interest details, acquisition and improvement records, and supporting invoices. Preserve facts about a repair or improvement without automatically deciding its tax treatment or depreciation.
- **Later prompts:** Collect the property's details on its first record; distinguish rent from a refundable deposit when received; obtain a principal/interest breakdown when recording a loan payment; ask about mixed use when relevant to the record.
- **Teaching examples:** Rent receipt, refundable deposit and return, repair payment, loan installment, and an improvement record.
- **Acceptance scenario:** Receiving rent of 1,000 and a refundable deposit of 500 adds 1,500 to cash, records rental income of 1,000, and records a deposit liability of 500. Returning the deposit clears that liability without creating a new rental expense. Additional properties retain distinct references.

### A.6 Shared expenses and settlement

**Use and scope:** Trips, housemates, and shared activities where people advance money and settle their shares. The ledger represents the group's settlement records; it does not import each participant's private bank balances. A community organization managing its own revenue and funds uses community instead.

- **Base catalog:** Member receivables/payables, shared-cost allocations, and settlement records, with an optional shared cash/bank account. Preserve the original bill and link allocations and repayments to it so cost and debt views do not count a settlement as another expense.
- **Creation questions (two):** “Use a shared cash pot?” adds a group financial account. “Split equally by default?” saves a proposed allocation rule, reviewed on each expense. Member details and unequal shares can wait until the first bill.
- **Tax-preparation facts:** Original payer, beneficiaries and their shares, purpose, source receipt, and the link between an expense and its reimbursements. Preserve the distinction between advances, settlements, and outside income; do not infer participants' individual tax treatment.
- **Later prompts:** Ask for participants, payer, and shares on the first expense; for affected obligations when settling; and for allocation changes on a refund. Do not expose unrelated personal records to the group.
- **Teaching examples:** Equal split, unequal split, repayment, refund, and spending from a shared pot.
- **Acceptance scenario:** A pays a bill of 90 for A, B, and C in equal shares. The settlement view shows A owed 60, B owing 30, and C owing 30. After B pays A 30, B owes zero and A is owed 30. The original total cost remains 90; repayments add no new cost. Validate the accounting representation and reconcile the member balances before release. Automatic payment execution and optimized settlement suggestions are later capabilities.

### A.7 Community organization

**Use and scope:** Clubs, volunteer groups, associations, and community projects with money held for the organization. Selecting this starter does not establish nonprofit registration, tax exemption, or donors' deduction eligibility.

- **Base catalog:** Selected organization cash/bank accounts; membership dues, contributions, and event income; project, event, and administrative expenses; opening fund balances. Optional project/fund and contributor references organize activity without multiplying accounts for every person.
- **Creation questions (two):** “Track money set aside for named projects?” enables project/fund attribution. “Track dues or contributions by member?” enables contributor records. Names and project details are collected when first used.
- **Tax-preparation facts:** Source and purpose of receipts, contributor references when needed, amounts and dates, project allocation, supporting documents, and any supplied restrictions on funds. Preserve those conditions independently of a later legal/tax interpretation.
- **Later prompts:** Capture designated purpose when receiving such funds, supporting evidence for spending, and member/contributor details when tracking a contribution. Formal fund accounting and tax-receipt issuance require separately validated workflows.
- **Teaching examples:** Member dues, a contribution, project spending, reimbursement of a volunteer, and a contribution designated for a project.
- **Acceptance scenario:** Contributions of 500 and an event cost of 120 leave cash and net funds of 380, with income of 500 and expense of 120 in statement presentation. A designation for one project survives recording and export; it does not silently make all cash unrestricted or produce a tax-deductible receipt.

### A.8 Blank

**Use and scope:** Experienced users, bookkeepers with their own chart, and automation. Bringing an existing file set remains a separate import action; blank does not merge or overwrite it.

- **Base catalog:** Valid title/currency configuration and a recorded intended history boundary, with no accounts or transactions. Customers add their own structure or select account groups later.
- **Creation questions:** None beyond title, currency, and the intended history boundary; skip the first-account stage. No personal, business, or tax assumptions are inserted.
- **Tax-preparation facts:** Use the same optional semantic categories, ownership, source references, and review annotations as other starters when the customer supplies them. Unmapped categories remain unmapped; never infer tax meaning from the account's name alone.
- **Later prompts:** Offer account creation or an import handoff as the first task. Offer semantic mapping when preparing reports that require it; omit unrelated starter guidance.
- **Teaching references:** Minimal account openings, a balanced transaction, and an include file, shown outside the real ledger.
- **Acceptance scenario:** Initialization creates a valid file with zero account openings and zero transactions. The user can then open their own asset and opening-equity accounts, record a supplied balance of 100, and retrieve that balance with no forced personal categories. Repeating initialization preserves the existing file and reports a conflict.
