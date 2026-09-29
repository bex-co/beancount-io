# w4 · m29 — Explore public examples before signing in

**Worker:** worker1 **Goal:** a newcomer can inspect all five shared mobile tabs for a public example before registering, then continue into sign-in without losing the selected example. **Status:** done

## Scope

Add a read-only guest entry from Welcome using curated examples and the existing public-ledger reads. Reuse the shipped screen components and valuation behavior. `searchLedgers` requires authentication, so guest selection uses known example IDs and checks availability on the selected server instead of calling authenticated discovery.

Following the user's final endpoint decision, guest browsing is available only when the selected endpoint normalizes to `https://beancount.io/`; Welcome hides the entry and preview routes reject custom endpoints. The app never silently switches servers. Guest state must not fabricate a session or expose a previous account's cached data. Writes, account lists, starring, notifications, AI actions, and other protected destinations keep their existing authentication and authorization requirements.

This milestone adds no archive or hosted-to-local export path. The login and SSH-key requirements in [DO_NOT_DO.md](../../../DO_NOT_DO.md) remain in force. No backend policy change, additional public endpoint, new dependency, analytics, or offline demo data is needed. Hosted Universal Links configuration remains tracked separately in [blocked/001](../../blocked/001.md); the Welcome entry does not depend on it.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Add guest state scoped to the selected server and a read-only route shell — **DONE** | 50m | — |
| t002 | Adapt Home, Accounts, and Reports to work without an authenticated identity — **DONE** | 60m | t001 |
| t003 | Add the example selector and guest navigation — **DONE** | 50m | t001 |
| t004 | Gate account actions and preserve the selected report through sign-in or cancellation — **DONE** | 50m | t002, t003 |
| t005 | Localize loading, unavailable-example, connection-error, and access-denied states — **DONE** | 40m | t004 |
| t006 | Adoption surface — **DONE** | 25m | t005 |
| t007 | Simplify — **DONE** | 25m | t006 |
| t008 | Test coverage — **DONE** | 45m | t006, t007 |
| t009 | Closeout — **DONE** | 15m | t008 |

Implementation estimate: 250m (about 4–5h); 360m including the standing closing tasks.

## Definition of done

- From a signed-out launch on Beancount.io, Welcome offers a labeled example action, a visitor can choose an available public example, and Home, Accounts, Transactions, Reports, and Files show its real data without registration. Record the elapsed time and taps to the first useful report in a repeatable native walkthrough.
- Example selection reads only the selected deployment. Missing, newly private, or unavailable examples have a recoverable state; a denied read never presents cached data as a successful current read.
- Guest navigation makes no authenticated-only queries or mutations. Protected destinations, including directly opened write routes, retain their authentication and permission checks. Anonymous users receive no synthetic user ID, session, or permission grant.
- Canceling or failing sign-in returns to the selected guest view. Successful sign-in rechecks access before restoring that view. Server changes and logout clear the appropriate guest, session, and cache state; a late response from the prior context cannot restore it.
- Cash-only and investment examples retain the shipped balances, valuation disclosures, and report semantics. Existing signed-in navigation continues to work across all five tabs.
- New copy exists in all 13 mobile locales. Native verification covers light and dark themes, ordinary and enlarged text, readable errors, and labeled controls. Loading uses layout-matched skeletons.
- Mobile `yarn format:check`, `yarn lint`, `yarn typecheck`, and `yarn test:unit` pass. Behavioral checks cover guest access, context changes, and authentication continuation. Verification uses public reads or isolated synthetic fixtures and performs no production ledger mutations.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w4`, 2026-09-27, candidate 1; explicitly selected by the user with `/pm them two for w4`. Source review found that `mobile/app/(app)/_layout.tsx` redirects every signed-out visitor and `mobile/src/common/hooks/use-session.ts` throws without a session. The three target screens use that strict hook. The backend already permits anonymous reads of individual public ledgers but requires authentication for search.
- **Goal linkage:** **A2 — Frictionless onboarding**, with **A3 — Community & distribution**: a prospective mobile adopter can evaluate real reports before creating an account.
- **Expected outcome:** the signed-out launch-to-first-report journey becomes possible. A recorded clean-launch walkthrough measures its time and taps without adding analytics.
- **Why now:** [m4](../m4/README.md) delivered authenticated discovery, and [m26](../m26/README.md), [m27](../m27/README.md), and [m28](../m28/README.md) improved the examples' valuation presentation. This exposes those existing capabilities at the first onboarding step. The user selected w4, which has capacity after m28; it remains a general-purpose queue.
- **Adoption surface:** included because the milestone changes Welcome, public-example navigation, and the mobile product walkthrough. The independent root README CLI-status correction is tracked as w4/190.

## Verification — 2026-09-27

Verified in the local workspace and iOS development build. This closeout does not claim an App Store/Play release or a pushed commit.

- **Native walkthrough:** on a fresh signed-out iPhone 17e simulator, launch the app, tap **Try an example**, **Everyday finances**, then **Reports**. Three taps produced populated income/expense and cash-flow charts. The observed cold-launch run took **32.669 seconds**; a repeat took **53.421 seconds**. Both include XCTest startup/interaction overhead, public network requests and a two-second settling wait, so these are reproducible automation observations rather than a product latency benchmark.
- **Public data and navigation:** inspected Home, Accounts and Reports across the everyday, MiniMax company and crypto examples. Company chart labels include their complete MUSD amounts; investment screens retain market value, cost and unrealized-change disclosures. Native browser cancellation returned to the same company example and Reports tab. Existing signed-in Home, Transactions, Accounts, Reports and Files were also inspected with read-only navigation.
- **Presentation:** checked light/dark, enlarged English navigation and German Reports at the first accessibility text size. New guest controls grow or wrap at the largest text setting; shared header geometry is unchanged. Error recovery is scrollable, translated controls are labeled, and first-load placeholders reserve the caption layout. Native screenshots and the automation scripts were kept as ignored local verification artifacts.
- **Access and failure evidence:** real Apollo tests exercise selected-server URLs, missing/denied examples, offline reads, no bearer header, rejected account queries/mutations and isolation from late responses. Rendered integration tests prove that a selected guest ledger cannot bypass the existing protected route layout or grant write permission. Continuation tests cover cancellation/failure, reauthorization before restore, context changes and the ten-minute limit, including a response arriving after expiry. Successful sign-in restoration was verified through these production-code tests; the native browser check used cancellation and did not register an account.
- **Gates:** `yarn format:check`, `yarn lint`, `yarn typecheck`, and `yarn test:unit` passed; **1,973 tests passed**. `git diff --check` and the canonical agent-guidance checker also passed. No new dependency, backend permission change, analytics or production ledger mutation was introduced.
- **Handoff:** leave Metro running and the iOS simulator open on the guest Reports tab. The menu chooses another public example and the close button returns to Welcome. The independent README correction remains in w4/190.

## Resume verification — 2026-09-28

- Reconciled with upstream main and recovered the final user-requested scope: the shared five-tab navigator and drawer, account/transaction details, transaction filters, and read-only Files; Nvidia replaces MiniMax in the catalog.
- Welcome and preview routes allow only the normalized Beancount.io root endpoint and react to server changes. Corrected the mobile walkthrough's obsolete three-tab, detail-sign-in, and self-hosted-preview wording.
- Mobile format, lint (including dead-code checks), typecheck, and unit gates pass: 1,996 tests. The public working-tree files pass gitleaks; ignored local credentials and build artifacts are excluded from the shipped tree.
- Reopened the iPhone 17e development build and tapped Welcome → Try an example → Company finances. The signed-out Nvidia Home renders real data with all five tabs and no write or notification buttons. The separate signed-in iPhone 17 Pro session remains intact. Earlier detailed native coverage is recorded above; no production ledger writes were made.
