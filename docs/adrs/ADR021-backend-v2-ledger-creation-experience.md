# ADR 0021: Ledger creation experience

- Status: Proposed
- Date: 2026-09-30
- Revised: 2026-10-03
- Owners: Product, dashboard, mobile, backend-v2, CLI
- Baseline: source tree read on 2026-10-03
- Scope: The design for everything [PRFAQ001](../prfaqs/PRFAQ001-ledger-creation.md) describes: the starter catalog plus blank, a human-readable title, operating currency, history start, first accounts and opening balances, the staged flow with review, resumable and idempotent creation, CLI presets, the separate demo, and local-to-hosted transfer. This record adds no roadmap items; only `/pm` writes the board.

## Decision

Build the scope PRFAQ001 describes as one approved design. Where this record and PRFAQ001 differ, PRFAQ001 governs and this record is wrong.

One versioned **setup specification** describes a new ledger: preset, title, operating currency, history start, answered or deferred capabilities, selected accounts, and opening records. A backend-owned pure builder turns that specification into Beancount files, and the Python CLI builds the same files from the same specification. Every hosted surface — REST, GraphQL, MCP — accepts the specification through the existing create operation, so no configuration is reachable from the dashboard alone.

The existing form already allows creation without typing once defaults load, so the new flow must keep that property: every stage has usable defaults, and a customer who accepts them reaches a valid private ledger without answering a question.

## What exists today

Read from source on 2026-10-03. The dashboard `LedgerForm` suite passed 23 tests with one skipped on 2026-10-01; those tests exercise the component in jsdom and establish nothing about production behavior or visual quality. No native simulator run and no authenticated GitHub walkthrough was completed.

| Area | As built |
| --- | --- |
| Create command | [`CreateLedgerCommand`](../../backend-cluster/backend-v2/src/features/ledger/workflow/ledger-workflow.types.ts) carries `name`, `description`, `private`, and `template` (`STARTER` or `SAMPLE`). `operatingCurrency` exists only on the read-side `LedgerOptionsData`. |
| Workflow | [`createLedger`](../../backend-cluster/backend-v2/src/features/ledger/workflow/ledger-workflow.ts) authorizes `LEDGER_CREATE` on the caller's user resource, picks one of two fixed file sets, takes a per-user creation lock, and delegates to the shared [create operation](../../backend-cluster/backend-v2/src/features/ledger/operations/create-ledger.ts), which enforces the tier ledger limit and passes `files` to the ledger service. |
| Templates | [Starter](../../backend-cluster/backend-v2/src/features/ledger/utils/ledger-template.ts) is one `main.bean`: title `Example Beancount file`, `operating_currency` USD, an auto-accounts plugin, 30 accounts opened in 1970, no transactions. Sample is a multi-file set of fictional USD activity. |
| REST | [`ledgerCreateInput`](../../backend-cluster/backend-v2/src/features/ledger/api/rest/v1/lifecycle-handler.ts) is a strict Zod object; `ledgerUpdateInput` is derived from it by omitting `template`. The name must match `^[a-z0-9_-]+$`, at most 100 characters. |
| GraphQL | [`CreateLedgerInput`](../../backend-cluster/backend-v2/src/features/ledger/api/resolvers/ledger-resolver.types.ts) declares the same fields; the [mutation](../../backend-cluster/backend-v2/src/features/ledger/api/resolvers/ledger-resolver.mutation.ts) calls the same workflow. |
| MCP | The `manageLedgers` tool's [`lifecycleToolInput`](../../backend-cluster/backend-v2/src/features/ai-agent/api/mcp-lifecycle.ts) is a separately declared strict object that re-parses its payload through `ledgerCreateInput`. |
| Signup | `signUp` is a GraphQL-only session ceremony. `withDefaultLedger` travels through the [resolver args](../../backend-cluster/backend-v2/src/features/auth/api/auth-resolver.ts) into the Redis [OTP session](../../backend-cluster/backend-v2/src/features/auth/data/signup-otp-session-model/types.ts); on OTP verification [`createDefaultLedger`](../../backend-cluster/backend-v2/src/features/auth/service/auth-service.ts) creates a `Default` Starter ledger. A failure is logged and never blocks signup. |
| Dashboard | One [form](../../dashboard/src/features/ledger-list/components/ledger-form.tsx) serves the [welcome page](../../dashboard/src/features/ledger-list/pages/welcome-page/index.tsx) and the [sidebar dialog](../../dashboard/src/features/ledger-list/pages/dashboard-page/components/dashboard-sidebar.tsx): name (prefilled `my-book`, slugified on submit), description, private (on), Starter/Sample cards, and a **Save** button. The welcome page returns to OAuth consent when `oauthUid` is present. |
| Mobile | The [native screen](../../mobile/src/screens/create-ledger-screen/create-ledger-screen.tsx) has the same four fields and a **Create** header action. |
| Hosted CLI | [`bea cloud ledger create`](../../cli/src/cli/commands/cloud/ledger/app.py) takes a name, `--description`, `--private/--public`, `--clone`, and `--dir`; its [request](../../cli/src/cli/commands/cloud/ledger/manager.py) sends name, description, and private only. |
| Local CLI | [`bea init`](../../cli/src/cli/commands/init.py) takes `--currency`, `--date`, and repeatable `--opening-balance`, and its [engine](../../cli/src/bea_engine/initiating.py) writes a fixed `Personal ledger` chart. |

Already shipped from this scope:

- **Signup creates privately.** `createDefaultLedger` sends `private: true` (commit `80e3b7cd`, covered by [`signup-ledger.test.ts`](../../backend-cluster/backend-v2/src/features/auth/api/__tests__/signup-ledger.test.ts)). Existing ledgers' visibility is unchanged.
- **Starter seeds no example money** (commit `2d754ae2`).

Known defects this design also corrects: the web Starter description in [`ledger-form-translations.ts`](../../dashboard/src/features/ledger-list/ledger-form-translations.ts) still promises "one example transaction" in English and every other locale, while [native copy](../../mobile/src/translations/en.ts) already says empty books; and the web create button says **Save**.

## Setup specification

The specification is the contract PRFAQ001 question 18 asks for. It is added to `CreateLedgerCommand` as one optional `setup` object, so existing callers that send only today's fields behave exactly as now.

| Field | Meaning | Default when omitted |
| --- | --- | --- |
| `preset` | Catalog ID with version, one of `personal@1`, `freelance@1`, `business@1`, `portfolio@1`, `rental@1`, `shared-expenses@1`, `community@1`, `blank@1` | The current Starter chart |
| `title` | Human-readable title, any script; written as the Beancount `title` option | The preset's suggested title |
| `operatingCurrency` | One code from the supported list below | `USD` |
| `historyStart` | Date the books begin; used for `open` directives and the opening boundary | The creation date |
| `capabilities` | Per optional question: `enabled`, `declined`, or `deferred` | `deferred` |
| `accounts` | Selected first accounts: kind (bank, cash, card, other), name, currency, and an opening state of `unknown`, `zero`, or `known` with a signed amount | None |

Rules:

- `setup` and `template` are mutually exclusive. `template: SAMPLE` with a `setup` object is rejected on every surface with the same validation error. Omitted or null `setup` keeps today's behavior, including the USD Starter.
- An explicit value is validated and never silently replaced. An unknown preset, unsupported currency, impossible date, or account that the preset does not allow fails the request; nothing is created.
- `unknown`, `zero`, and `known` are distinct. `unknown` writes no posting and marks the account as unverified in portable ledger metadata; `zero` is a customer-confirmed starting point; `known` writes the opening transaction on the day before `historyStart` and a balance assertion on `historyStart`, as PRFAQ001 question 8 describes. A liability the customer says they owe is stored as the corresponding negative posting.
- `setup` is creation-only. `ledgerUpdateInput` must omit it the way it omits `template`; later changes go through ordinary file and entry edits.

### Title and address

`name` stays the repository address and keeps its ASCII slug rule on every surface. `title` is separate and unrestricted. Clients derive a suggested address from the title with the existing slug function; when the result is empty — as for `家計簿` — they fall back to the existing `my-book` suggestion with its numeric suffix and show the address for correction. The server never derives an address.

The title lives in the file as the Beancount `title` option, which is portable across local and hosted books and already readable through ledger options. Whether lists show it is an [open question](#open-questions).

### Supported currencies and region mapping

No shared currency list exists in the repository today. The canonical catalog (below) owns two tables that every package consumes as a generated local copy:

- **Supported operating currencies:** the active ISO 4217 alphabetic codes. Hosted creation rejects any other value. `bea init` keeps accepting any syntactically valid Beancount currency symbol for callers that do not pass a preset, so existing scripts are unaffected.
- **Region to currency:** one row per region whose CLDR territory data lists exactly one currency in current legal-tender use. Regions with none or several fall back to an editable `USD`.

Suggestion precedence: an explicit selection in the active flow, then a supported native currency hint, then the mapped currency of an explicit browser or device region, then `USD`. Resolve once and preserve a correction across re-renders, starter switches, validation errors, back navigation, and OTP retries. Language alone never selects a currency: `en` without a region uses the fallback, and a Chinese interface does not imply CNY. Do not infer from IP address.

`expo-localization` is already a mobile dependency and is read in [`translations/index.ts`](../../mobile/src/translations/index.ts) for language only; its currency and region fields supply the native hint. Display the code with its localized name. The selected code becomes the initial operating currency; it neither converts amounts nor prohibits other currencies, and changing the interface language never rewrites a ledger.

## Catalog and builder

One canonical catalog defines, per preset version: account groups, the zero to two optional questions and their effect, category meanings, evidence requirements, first-result task, teaching examples, and the acceptance scenario in PRFAQ001 Appendix A, plus the two currency tables. Packages must not import each other, so each consumer — backend-v2, dashboard, mobile, CLI — holds a generated copy with a drift check. Conformance fixtures pair a specification with its expected files and report values, and both engines (the Python CLI and the hosted ledger service) must produce equivalent accounting results for every fixture before a preset is listed.

In backend-v2 a pure builder replaces the two fixed file sets as the source of Starter content. Both the manual workflow and signup provisioning call it and keep their existing authorization, lock, and tier-limit paths. It does not mutate a shared template and never regenerates an existing ledger. A preset update creates a new version; existing account names and history never change because a preset changed.

Opening-balance status and demo identity are recorded in ordinary Beancount metadata so that cloning or reopening a file cannot turn an unknown balance into an apparent zero. The exact keys are fixed in the catalog and must load cleanly in upstream Beancount and the hosted engine.

## Hosted API and parity

Every capability below changes a customer-facing contract and follows the [required parity workflow](../../backend-cluster/backend-v2/AGENTS.md#required-api-parity-workflow) and [ADR008](./ADR008-backend-v2-surface-parity.md). `surface-parity` gaps stay at zero.

| Capability | REST | GraphQL | MCP |
| --- | --- | --- | --- |
| Create with a setup specification | `setup` on `ledgerCreateInput` for `POST /api-gateway/v1/ledgers` | `setup` input on `CreateLedgerInput` | `setup` on `lifecycleToolInput` for `manageLedgers` `create`; declare it explicitly, because that object does not inherit new create fields |
| Idempotent create | `requestId` on the same body | `requestId` argument | `requestId` on the same tool input |
| Preview a setup without creating | New operation returning the generated files, account list, and validation result | New field with the same input and result | A `preview` branch that executes the same protected workflow method |
| Create from supplied files (local-to-hosted) | Pending an [open question](#open-questions) | Same | Same |
| Signup default-ledger settings | Not eligible | `signUp` arguments | Not eligible |

Details:

- **One workflow.** All three adapters delegate to `createLedger` and a new preview method on the same workflow, under the existing `LEDGER_CREATE` action, so preview and create have identical credential and relationship eligibility. Register the preview verb in `VERB_TABLE` in [`op-class.ts`](../../backend-cluster/backend-v2/src/server/api/op-class.ts) with all three bindings.
- **Discovery.** Preset IDs and the capability states are enumerated in the schemas themselves, so OpenAPI, GraphQL introspection, and the MCP tool schema expose them without a catalog endpoint.
- **Signup exception.** Signup is a session-only ceremony with no REST or MCP twin; that existing exemption is recorded in `op-class.ts` and is preserved, not widened. The default-ledger settings are therefore GraphQL-only by the documented credential policy, not by omission.
- **Contracts.** Regenerate [`docs/openapi/v1.json`](../../backend-cluster/backend-v2/docs/openapi/v1.json), the dashboard and mobile GraphQL types, and the CLI's generated [REST client](../../cli/src/cli/api/rest_client/models/create_ledger_body.py). Add contract tests that drive the same specification through HTTP REST, GraphQL execution, and an MCP client and compare created files, defaults, and validation failures.

### Idempotent and recoverable creation

Creation today is serialized per user by a lock but has no retry identity: a client that times out cannot tell whether the ledger exists, and a retry either hits the name conflict or creates a second ledger under a new name.

`requestId` is an optional client-generated identifier. Inside the existing per-user lock the workflow records `(user, requestId)` with the canonical form of the request and its outcome in the Redis store that already holds signup OTP sessions. A repeat with the same identifier and the same request returns the original ledger; the same identifier with a different request is a validation error; a repeat while the first attempt is still running returns a precise in-progress status rather than a second create. Records expire after 24 hours. Permissions, tier limits, and name conflicts are rechecked on every first attempt, and files are validated before the ledger service is called. Clients report success only after the created ledger is readable, and a failed list refresh must not trigger a second create.

### Signup

Registration screens that already request a default ledger — the [mobile consent](../../dashboard/src/features/oauth/pages/mobile-consent.tsx) and [MCP consent](../../dashboard/src/features/oauth/pages/consent.tsx) flows through the [registration hook](../../dashboard/src/features/auth/hooks/use-register-form.ts) — gain the prefilled currency control. Add optional `defaultLedgerCurrency` to the `signUp` arguments, to `CreateSessionInput` and `SignupOtpSession`, and to the session written in [`redis-impl.ts`](../../backend-cluster/backend-v2/src/features/auth/data/signup-otp-session-model/redis-impl.ts), so OTP verification uses it for the first file write. A session without the field resolves to `USD`; sessions live ten minutes, so no migration is needed. Native authorization may pass a validated currency hint through the mobile-consent route's search parameters; a browser-side selection takes precedence. Keep hints separate from authorization, preserve requested scopes and return destinations, and create no ledger for an existing-user sign-in. Registration keeps its account-creation semantics when provisioning fails, and the no-ledger fallback and manual creation route remain.

### Behavior against an older backend

Clients may reach a backend that predates `setup`, as self-hosted stacks can. All three surfaces already refuse unknown input: the REST and MCP create schemas are strict objects, and GraphQL rejects undeclared arguments. An older backend therefore answers a request carrying `setup` or `requestId` with a validation error and creates nothing. Clients must treat that as "this server does not support guided setup", say so, and offer creation with the server's defaults as an explicit choice. They must never drop the fields and retry silently, because that turns a selected currency into USD. Deploy backend support before any client sends the new fields.

## Dashboard flow

The entry page offers **Start new books**, **Bring existing records**, and **Explore an example**; existing customers reach the same flow from **New ledger**. New books use three stages in the existing welcome and dialog containers:

1. **Choose a starter.** The seven purposes and a visible **Start blank**, each with a one-sentence outcome. After selection, at most two optional questions from the catalog; each may be answered, declined, or deferred.
2. **Set the basics.** Title, currency, and history start (**Start from a chosen date** or **Bring earlier history**).
3. **First account, then review.** Add accounts or **Set up accounts later**; blank skips this. Review title, address, currency, start boundary, accounts, and privacy before **Create ledger**.

Description, repository address, and file layout are expandable, not removed. Privacy stays visible and defaults to private. Back navigation and validation errors preserve every choice. After creation show one recommended next action with the others visible — **Record a transaction**, **Import records**, or **Verify a starting balance** — by extending the existing [empty-ledger setup](../../dashboard/src/features/reports/overview/components/empty-ledger-setup.tsx). Its visibility is driven by [`hasOverviewActivity`](../../dashboard/src/features/reports/overview/lib/overview-utils.ts), so opening balances would hide it; unfinished setup must stay reachable after activity appears.

**Bring existing records** routes to the existing [importer](../../dashboard/src/features/importer/AGENTS.md) with setup context retained. Accept the locale's unambiguous number format in amount fields and show the normalized amount before saving.

**Resuming.** Keep the in-progress specification, minus opening amounts and uploaded records, in browser session storage keyed to the flow, and carry the existing `oauthUid` and `oauthScope` search parameters through every stage so an authorization flow returns to its consent screen. Opening amounts are re-entered after an interruption; raw balances are never written to unprotected browser persistence.

Correct the Starter description in every locale and label the create action **Create ledger**; editing keeps **Save**.

## CLI

- **`bea init`** gains `--preset`, `--title`, and a documented input file that expresses the full setup specification; the existing `--currency`, `--date`, and `--opening-balance` remain. Interactive use asks the same starter, title, currency, history, and first-account questions and skips those already answered by options. Calls without `--preset` keep today's `Personal ledger` chart, account names, exit categories, and signed opening-balance semantics. It stays local: no account, network request, or model call.
- **`bea cloud ledger create`** gains `--preset`, `--title`, `--currency`, and `--date`, sent as `setup`, and sends a `requestId` on every create so `--clone` retries cannot duplicate a ledger. Without them the request is unchanged. `--from` is the local-to-hosted transfer in phase 3.
- Output reports the created path or address, preset and version, validation result, unresolved setup items, and the command for the next task, in human or JSON form.
- Update the agent-facing [beancount-init skill](../../skills/.claude/skills/beancount-init/SKILL.md) and tutorials with the release.

## Demo and the Sample template

Teaching examples are a separate, clearly marked experience: three to five worked examples per purpose starter, readable before signup, holding no customer data, and never counted against a ledger allowance. The dashboard already has a [gallery page](../../dashboard/src/features/ledger-list/pages/gallery-page/index.tsx) and anonymous reads of public ledgers, which is the natural host. Creating real books from an example carries forward only deliberately selected structure, never example transactions, balances, identities, or documents.

New real books never contain fictional activity, so the staged flow does not offer Sample. The `template: SAMPLE` API value keeps working unchanged until its [open question](#open-questions) is decided.

## Phasing

One approved scope, delivered in the order PRFAQ001 question 17 sets:

1. **Baseline and catalog.** Inventory creation paths, instrument the creation-to-first-result funnel, write the catalog, currency tables, and conformance fixtures.
2. **Coherent new books.** Backend `setup`, `requestId`, preview, and signup currency on all eligible surfaces first; then the dashboard flow and CLI presets together, gated on both engines passing every fixture and on accounting, accessibility, privacy, and compatibility checks.
3. **Connect existing books.** Validated transfer of existing Beancount file sets and `bea cloud ledger create --from`.
4. **Native mobile.** The staged flow on the native screen is a subsequent client adaptation. Until then the native form keeps sending today's fields, which stay valid because every new field is optional.

Tax determination, filing, payroll, advanced investment imports, new bank integrations, and automatic synchronization are outside this record.

## Open questions

PRFAQ001 leaves these undecided. Do not settle them in implementation.

1. **Title in lists.** Ledger lists come from repository metadata, which has a name and description but no title. Showing titles in lists needs either a stored copy or a per-ledger options read. Which, and whether lists show title, address, or both?
2. **Sample's future.** Is `template: SAMPLE` retired, kept as an API-only value, or converted into the demo? It is a published contract on three surfaces.
3. **Demo hosting.** Which account owns the example ledgers, and are they public ledgers in the gallery or a dedicated read-only surface?
4. **Signup starter.** Does automatic signup creation keep the current Starter chart, use `personal@1`, or offer a starter choice? Does it also collect a title?
5. **Local-to-hosted transfer path.** `--from` could upload files through the API or create an empty ledger and push over SSH. [`.pm/DO_NOT_DO.md`](../../.pm/DO_NOT_DO.md) requires SSH-key setup for hosted-to-local workflows as a bot defense; does the same requirement apply in this direction? The answer decides whether a create-from-files capability is added to REST, GraphQL, and MCP, and its size limits.
6. **Server-side resume.** PRFAQ001 asks that unfinished hosted setup be resumable across authentication. This design keeps the draft in the browser session only. Is a server-stored draft, resumable on another device, required?
7. **Saved currency preference.** PRFAQ001 mentions "an explicit saved preference". No account-level currency preference exists today. Add one, or rely on the region hint?
8. **Catalog content.** Labels, core categories, the optional questions, and later-prompt timing are to be refined by the research in PRFAQ001 question 20.
9. **Catalog endpoint.** Is a readable catalog (descriptions, account previews) needed on the API for agents, beyond the enumerated IDs?
10. **Plans and limits.** Is guided creation available on every plan, and how are ledger limits shown before the first stage?

## Risks

- **Two engines, one result.** Divergence between the Python and hosted builders produces books that differ after transfer. The shared fixtures are the only control; a preset is not listed until both pass.
- **Opening boundaries.** A wrong opening date or a padded discrepancy double-counts money. Never pad silently; review account open dates and opening entries as one change.
- **Compatibility.** Older mobile builds, existing scripts, and older backends must keep working: every new field is optional, and unsupported servers fail loudly.
- **Translation debt.** Every starter, question, and account label needs each supported locale, including right-to-left.
- **Scope pressure.** Seven starters with evidence capture and teaching packs is a large first release; phase 2 ships only starters that deliver their stated first result.

## Validation

Implementation acceptance:

1. An eligible user can accept every default and create a private ledger without a required question; the same specification sent through REST, GraphQL, and MCP creates identical files.
2. Each Appendix A acceptance scenario passes with equivalent dashboard and CLI accounting results on both engines, including the deferred-option paths.
3. Unknown, zero, known, debt, overdraft, non-USD, multiple-currency, and historical starts behave as specified; an unknown balance is never reported as a verified zero after clone or transfer.
4. A title that cannot form a slug creates a ledger with that title and a suggested valid address.
5. A retried create with the same `requestId` returns the same ledger; a timeout produces neither a false success nor a second ledger.
6. A client pointed at a backend without `setup` reports the incompatibility and creates nothing unless the user chooses the defaults.
7. Default-ledger signup persists its currency through OTP and creates privately; existing-user sign-in and unrelated authorization create no ledger.
8. Existing ledgers' data, names, currencies, and visibility are unchanged; existing `bea init` and `bea cloud ledger create` invocations produce the same results as before.
9. Template and starter descriptions match generated contents in every locale. Keyboard and screen-reader access, native large text, right-to-left, and narrow screens are verified on the actual screens before release.

Outcome measurement and the research rounds follow PRFAQ001 questions 19 and 20.
