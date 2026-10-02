# ADR 0021: Better ledger creation experience

- Status: Proposed
- Date: 2026-09-30
- Revised: 2026-10-01 after comparing the existing form with GitHub repository creation
- Owners: Product, dashboard, mobile, backend-v2
- Baseline: repository commit `c59947e7`; external sources accessed 2026-10-01
- Scope: Improve existing creation defaults and controls. No implementation or roadmap changes accompany this record.

## Decision

Keep the existing single-screen creation flow. Retain the name, optional description, private/public control, and Starter/Sample choice. Add a prefilled currency selector, correct inaccurate template copy, and use a creation-specific button label on web. Apply the same currency default and intended private default to automatic signup creation.

The normal path remains: accept or edit the name, accept the defaults, and create. There is no required template decision, purpose questionnaire, introductory lesson, review screen, or opening-balance setup.

## Evidence and limits

Reviewed the actual dashboard form, its welcome/dialog callers, English strings, native form, submission handlers, and backend generation/signup paths. Ran the existing dashboard `LedgerForm` interaction suite: **23 passed, 1 skipped**. These tests exercise the rendered component in jsdom with mocked data; they do not establish production behavior or visual quality.

For GitHub, reviewed its current official web instructions, the August 2025 general-availability announcement, template documentation, and May 2026 mobile release description. Direct access to authenticated `github.com/new` was unavailable. The local browser-preview attempt was blocked by the environment's port-binding restriction. This is a source-and-interaction-test comparison with official product documentation, not a claim of a fresh logged-in visual walkthrough. No real repositories or ledgers were created.

### What Beancount.io already does

| Surface | Existing fields and defaults | Submit behavior |
| --- | --- | --- |
| Web welcome and New ledger dialog | Name defaults to available `my-book`/suffix after list loading; Starter is selected; description is optional; private is on. Two template radio cards sit side by side on wider screens and stack on narrow screens. | The form slugifies the name, submits creation, and the caller navigates to the ledger or resumes OAuth. The button currently says **Save**. |
| Native New ledger screen | Name, optional description, private switch, then two template rows. Same name/Starter/private defaults. | Header **Create** submits, refreshes the list, selects the result, and opens Home. |
| Signup requesting a default ledger | Mobile and MCP consent registration use `withDefaultLedger: true`; other registration paths do not necessarily do so. | OTP verification provisions the backend's `Default` ledger without showing the manual creation form. |

Sources: [web form](../../dashboard/src/features/ledger-list/components/ledger-form.tsx), [welcome caller](../../dashboard/src/features/ledger-list/pages/welcome-page/index.tsx), [dialog caller](../../dashboard/src/features/ledger-list/pages/dashboard-page/components/dashboard-sidebar.tsx), [native form](../../mobile/src/screens/create-ledger-screen/create-ledger-screen.tsx), [interaction tests](../../dashboard/src/features/ledger-list/components/__tests__/ledger-form.test.tsx), [mobile consent](../../dashboard/src/features/oauth/pages/mobile-consent.tsx), [MCP consent](../../dashboard/src/features/oauth/pages/consent.tsx), [registration hook](../../dashboard/src/features/auth/hooks/use-register-form.ts).

The form already allows creation without typing once defaults are loaded, assuming quota and authorization permit it. Counting visible fields as if every field required a new answer overstated the current burden.

Three concrete gaps remain:

1. **Currency cannot be set during hosted creation.** The backend Starter has a hardcoded USD operating currency. Adding it only to the manual form would miss automatic signup creation.
2. **Web Starter copy is stale.** The [English template strings](../../dashboard/src/features/ledger-list/ledger-form-translations.ts) promise one example transaction, while the [actual Starter](../../backend-cluster/backend-v2/src/features/ledger/utils/ledger-template.ts) contains 30 open accounts and no transactions or opening balances. [Native copy](../../mobile/src/translations/en.ts) already describes empty books. Review the other locales for the same mismatch.
3. **Automatic signup has a privacy inconsistency.** Manual creation defaults to private, but [default provisioning](../../backend-cluster/backend-v2/src/features/auth/service/auth-service.ts) explicitly sends `private: false`. Correct that path; do not describe private-by-default manual creation as a new feature or change existing ledgers' visibility.

The current name is the repository name/address. ASCII slug restrictions, a default title inside the Beancount file, and a separate human-readable display title are distinct concerns. This decision keeps the current naming contract.

### What GitHub actually offers

GitHub's documented web flow collects owner/name, optional description, visibility, and optional initialization settings before one create action. Templates are optional; without one, README, ignore-file, and license initialization are available. This is a form with defaults and optional configuration, not just an empty name box. See [GitHub's creation instructions](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository).

The redesigned web form became generally available on August 26, 2025; the July preview is not the latest release state. Its announcement emphasizes required-field guidance and policy-aware inputs. See [the general-availability announcement](https://github.blog/changelog/2025-08-26-improved-repository-creation-generally-available-plus-ruleset-insights-improvements/).

GitHub Mobile also supports name, visibility, optional description/template, and conditional initialization options, then takes the user to the repository. See [the mobile release](https://github.blog/changelog/2026-05-11-create-repositories-on-the-go-with-github-mobile/). A [template](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template) initializes files and directory structure; it does not require a separate purpose-discovery process.

| Concern | GitHub documented flow | Beancount.io implication |
| --- | --- | --- |
| Identity | Owner and repository name | Keep one ledger-name field; do not add another editable address/title pair here. |
| Description | Optional | Keep it optional and directly available. |
| Visibility | Explicit creation setting | Keep the existing control and private default visible. |
| Initial contents | Optional template or initialization choices | Starter/Sample can remain an ordinary initialized choice. |
| Next action | Open the result | Preserve navigation to the created ledger; do not gate it on bookkeeping setup. |

Our inference is to improve the existing form incrementally. GitHub does not establish that every field should be hidden, that template cards are inherently confusing, or that a ledger needs a setup wizard. Its corporate-owner and repository-policy controls are not requirements to copy into our personal-ledger flow.

## Proposed form

Keep the existing containers and controls. The following is a schematic of fields, not a new layout system; retain the current responsive template cards on web and native rows on mobile.

```text
New ledger

Name                    [ my-book                 ]
Template                (●) Starter   ( ) Sample
Currency                [ CNY · Chinese yuan    ▾ ]
Description (optional)  [                         ]
Private                 [ On ]

[ Create ledger ]
```

Only **Currency** is a new field. It starts with a usable suggested value, so it adds no mandatory interaction. Do not add permanent paragraphs explaining ledgers, how locale inference works, or future sharing. Keep the existing concise visibility explanation and public warning. Show field help when a choice or error actually needs clarification.

Use accurate short template descriptions:

- **Starter:** Standard accounts, no transactions.
- **Sample:** Fictional transactions for exploring the app.

Starter remains selected. On web, change **Save** to **Create ledger** only in create mode; editing still uses **Save**. Mobile already has **Create**. Keep description and visibility directly accessible; introducing a More settings section for these existing controls is unnecessary for this change.

For Sample, show the fixed USD currency instead of an editable selector and explain briefly that the example uses USD. Do not imply that changing a dropdown converts its historical transactions and prices. When switching back to Starter, restore the user's prior suggested or selected currency.

Preserve current navigation and existing empty-ledger actions. Creating a ledger must not require entering a transaction, balance, bank account, date boundary, or import configuration. Financial onboarding can be improved independently after evidence identifies a specific obstacle.

## Do we need more templates?

No additional template is necessary to deliver this change. Keep the two supported templates and make their contents clear. Do not replace the current selector with a comparison table or build a gallery as a dependency of currency support.

A template can be a useful account/file scaffold without requiring a complete specialized application. Future personal, freelance, business, portfolio, rental, shared-expense, or community presets should describe exactly what they initialize. For example, an account scaffold must not imply automated invoicing, cost-basis migration, or group settlement unless those behaviors exist. Evaluate a new preset on observed setup needs and its maintenance cost, rather than assume that seven choices improve activation.

[PRFAQ001](../prfaqs/PRFAQ001-ledger-creation.md) remains the separate, unimplemented proposal for seven purposes plus blank and a broader guided workflow. This ADR recommends a smaller independent improvement; it does not approve that catalog. Further template work can reuse the existing selector and creation pipeline.

## Currency and signup behavior

### Suggest once, allow correction

Use this precedence: explicit selection in the active flow, then a supported native currency hint, then a supported currency mapped from an explicit browser/device region, then USD. Resolve once; preserve a correction across re-renders, template switching, validation errors, and OTP retries.

The installed `expo-localization` supplies native currency information. iOS uses device Region; Android follows locale; the web API does not provide `currencyCode`. See [Expo's documentation](https://docs.expo.dev/versions/latest/sdk/localization/). The stored UI language alone is insufficient: `en-GB` can suggest GBP, `fr-CA` can suggest CAD, and `en` without a region uses the fallback. Chinese UI does not necessarily imply CNY. Avoid IP inference, language-based region maximization, and new preference storage.

Display currency code and localized name. Use a documented mapping for supported explicit regions; ambiguous or unsupported regions fall back to editable USD. Once submitted, the selected code becomes the initial operating currency. It neither converts amounts nor prohibits transactions in other currencies. Changing the interface language must never rewrite a ledger.

### Cover the existing automatic path without a new step

On registration screens that already request a default ledger, use the same prefilled **Currency** control. This is the only additional setup control: no new title field, template questionnaire, explanatory summary/editor, or review screen. Existing sign-in and identity-only flows need none of it.

Native authorization may pass a validated currency hint to the hosted registration screen. Browser-side selection takes precedence. Persist the selected value with the existing signup/OTP session so verification uses it for the first file write. Keep hints separate from authorization, preserve requested scopes and return destinations, and do not create a ledger for an existing-user login.

The backend must provision the default ledger privately. Registration retains its existing account-creation semantics if provisioning fails; do not repeat signup to retry creation. Preserve the no-ledger fallback and manual creation route. This ADR does not add a general provisioning state machine or persistent draft-recovery feature.

## Implementation boundary

Add optional `operatingCurrency` to the [shared create command](../../backend-cluster/backend-v2/src/features/ledger/workflow/ledger-workflow.types.ts). Missing/null retains USD for existing clients. Validate an explicit value consistently; never silently discard an invalid value and create different settings.

Generate Starter files from the validated currency before creation, using a pure backend-owned builder. Both the [manual workflow](../../backend-cluster/backend-v2/src/features/ledger/workflow/ledger-workflow.ts) and [signup provisioning](../../backend-cluster/backend-v2/src/features/auth/service/auth-service.ts) use that builder and their existing authorization/quota paths. Do not mutate a global template or regenerate existing ledgers. Preserve the current account structure and opening dates; no fictional amounts are introduced.

Sample remains unchanged. Omitted/null currency and explicit USD are compatible with it; reject an incompatible explicit currency consistently. The UI never submits an incompatible Sample currency. The signup contract needs an optional default-ledger currency carried through OTP, not a new generic preferences service.

Keep customer-facing creation behavior in parity across REST, GraphQL, and MCP, following [ADR008](./ADR008-backend-v2-surface-parity.md). Update schemas, explicit tool arguments, generated clients, and parity tests together. The [REST update schema](../../backend-cluster/backend-v2/src/features/ledger/api/rest/v1/lifecycle-handler.ts) is derived from create input: exclude the new creation-only field from update. Update the separately declared [MCP lifecycle input](../../backend-cluster/backend-v2/src/features/ai-agent/api/mcp-lifecycle.ts). Preserve documented authentication-surface exceptions.

Local [bea init](../../cli/src/cli/commands/init.py) already accepts currency and optional opening balances; it needs no hosted onboarding dependency. Keep package boundaries intact. Deploy backend support before client controls; older/self-hosted backends must produce an actionable incompatibility response rather than silently turn a selected currency into USD.

## Alternatives and consequences

| Alternative | Disposition |
| --- | --- |
| Only correct template copy | Useful, but leaves the requested currency default unavailable. |
| Add currency only to the manual form | Incomplete: automatic signup users still receive hardcoded USD. |
| Separate display title and repository address | Legitimate future naming work, but adds a second concept and read/list contracts unrelated to this currency change. Defer. |
| Hide existing controls and add an Explore/Copy flow | No evidence yet that this improves the current two-option form. Keep existing creation and discovery capabilities. |
| Add seven templates, first-account questions, or a balance wizard | Independent product work. Do not make it a prerequisite for creating the same repository with the correct currency. |

The form gains one visible, defaulted control. The creation service gains one optional setting plus its signup propagation. Naming limitations and incomplete opening balances remain separate issues; this change should not claim to solve them. Less setup does not establish complete financial records, but it also does not require teaching accounting before creation.

## Validation

Existing-behavior check on 2026-10-01: `yarn test src/features/ledger-list/components/__tests__/ledger-form.test.tsx` from `dashboard/` passed 23 tests with one skipped. This run precedes implementation and is evidence about the existing component only. No native simulator or authenticated GitHub walkthrough was completed.

Implementation acceptance:

1. An eligible user can accept the prefilled name, Starter, suggested currency, and private setting and create without an additional screen or required question.
2. Correcting currency, selecting Sample and returning, or retrying validation preserves the Starter choice; generated files contain the selected operating currency and no transactions.
3. Web and native template descriptions match the generated contents. Create and edit buttons describe their respective actions.
4. Sample stays coherent in USD; all eligible APIs agree on omitted/null, valid, and incompatible currency inputs.
5. Default-ledger signup persists its selection through OTP and creates privately. Existing-user sign-in and unrelated authorization create no extra ledger.
6. Existing ledgers' data, names, currencies, and visibility remain unchanged. Authorization, limits, and existing error handling remain enforced. A failed list refresh must not trigger a second create.
7. Verify keyboard/screen-reader access, native large text, translated labels, RTL, and narrow-screen behavior using the actual screens before release.

Compare the existing form and this incremental version with a few representative users: accepting defaults, correcting a wrong currency, and distinguishing Starter from Sample. Observe extra actions and mistakes as well as completion. Do not require a new analytics system or claim conversion gains from source review. Revisit template presentation only if these observations identify a problem.
