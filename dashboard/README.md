# Beancount Dashboard

## Search Console growth report

The dashboard package includes a read-only Search Console report for URLs owned by the dashboard.
It deliberately excludes CMS, forum, and API paths from its opportunity ranking.

Set GOOGLE_SERVICE_ACCOUNT_JSON_B64 in the local .env or CI secret, then run:

    yarn search-console-report --markdown --days 28 --inspect-limit 5

The report covers dashboard paths such as /ledger, /login, /sign-up, /auth, /settings, /lgasset,
and /oauth. It does not treat /forum, /api, or CMS content paths as dashboard opportunities.

Indexability (crawlers): public ledger **read/social** surfaces, user profiles,
the base Ask/agent landing page, and acquisition pages (login, sign-up, forgot
password) are indexable by default. Token/session flows, OTP/welcome, private
settings, parameterized query/error pages, write/editor UIs, bank-link screens,
auth-gated shells, and error pages emit `noindex` via
`src/common/lib/seo/indexability.ts`. Ask deep links with a prefilled question
are noindexed; Ask URLs canonicalize to the base agent page. Following GitHub's
crawl boundary, file directory (`tree`) and write routes stay noindex, while
read-only file (`blob`) pages are indexable with stable canonicals that omit
edit/line query parameters.

Roadmap ideas should go through the repository-level $pm-brainstorm workflow and public .pm board
in the parent repository. Search Console rows are evidence only after route ownership is verified;
do not turn CMS/forum/API rows into dashboard milestones.

The web dashboard for [Beancount.io](https://beancount.io/) — a browser UI for
double-entry bookkeeping: ledgers, reports, journals, an in-app editor, bank
account linking, and an AI assistant.

Part of the [`beancount-io`](https://github.com/bex-co/beancount-io) monorepo.

## Prerequisites

- Node.js ≥ 22
- Yarn 4 via Corepack (`corepack enable`)
- A running Beancount.io backend for the Dashboard server's `SSR_API_URL`

## Getting started

```zsh
corepack enable
yarn install
cp .env.example .env   # then edit values
yarn dev               # http://localhost:5173
```

## Environment variables

Copy `.env.example` to `.env` and fill in values. All client-side variables must
be prefixed with `VITE_`.

| Variable                             | Required   | Purpose                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_API_URL`                       | Yes        | Same-origin browser gateway path; use `/api-gateway/` so the host-only OAuth cookie reaches every CSR request.                                                                                                                                                                                                                                                                                               |
| `VITE_SSR_API_URL`                   | Local      | Direct backend URL used by local SSR/proxy development.                                                                                                                                                                                                                                                                                                                                                      |
| `SSR_API_URL`                        | Deployed   | Runtime-only internal backend URL used by the deployed SSR server and same-origin proxy.                                                                                                                                                                                                                                                                                                                     |
| `VITE_GA_MEASUREMENT_ID`             | No         | GA4 Measurement ID for this environment's analytics data stream. Use a **separate stream per environment** (set the dev/staging stream's ID locally and the production stream's ID in prod). When unset, analytics is disabled and no GA script loads. Non-production builds send events with GA4 `debug_mode` so you can validate instrumentation in GA4 DebugView before it reaches the production stream. |
| `DASHBOARD_OAUTH_TRANSACTION_SECRET` | Production | Server-only HMAC key for the ten-minute state/PKCE transaction cookie. Generate at least 32 bytes; never prefix it with `VITE_`.                                                                                                                                                                                                                                                                             |

## Scripts

| Script              | Description                                    |
| ------------------- | ---------------------------------------------- |
| `yarn dev`          | Start the dev server (port 5173) with HMR      |
| `yarn build`        | Production build                               |
| `yarn start`        | Serve the built SSR server                     |
| `yarn lint`         | Generate routes, type-check (`tsc -b`), ESLint |
| `yarn test`         | Run the test suite (Vitest)                    |
| `yarn format:check` | Check formatting (Prettier)                    |
| `yarn codegen`      | Regenerate GraphQL types from the schema       |

## Personal access tokens

Signed-in paid-plan users can create scoped API credentials from **Settings →
Personal access tokens**, or open
[`/settings/api-keys`](https://beancount.io/settings/api-keys) directly. The
creation flow defaults to read-only access, supports an optional single-ledger
restriction and expiry, and reveals the plaintext only once. Existing tokens
show lifecycle metadata and a display prefix, never the recoverable secret.

## OAuth consent pages

The dashboard serves the human interaction pages for backend-v2's authorization
server. `/oauth/mobile-consent` reuses the normal login, registration, and OTP
forms, then shows an account-wide native-app approval; it never posts a bearer
token to a WebView. The backend issuer redirects here through backend-v2's
`DASHBOARD_URL`. The Dashboard, authorization server, discovery documents, and
browser API share that one public front door in every environment; server-side
Dashboard requests reach backend-v2 through the internal `SSR_API_URL`.

## Dashboard OAuth session

The Dashboard is the static public OAuth client `beancount-dashboard`. Password,
signup OTP, and magic-link entry points begin authorization code + S256 PKCE
before accepting credentials. Password verification, one-time-link consumption,
and OTP account creation finish the exact Dashboard interaction directly; none
issues an intermediate legacy session. Credential forms POST through the
interaction-scoped Dashboard consent route, which validates the signed HttpOnly
transaction before forwarding to backend-v2. The callback requests the application
resource `<issuer>/v1`, exchanges the code server-side, and stores the access
token only in the `Secure`, `HttpOnly`, `SameSite=Lax`
`authSess:beancount.io` cookie. Browser JavaScript, storage, URLs, analytics,
HTML, and logs never receive that token or the PKCE verifier.

Already-issued valid legacy Dashboard tokens remain accepted by the identity
resolver until their own expiry and may be silently upgraded on a protected
route. They are never renewed or reissued, and a failed upgrade does not delete
the still-valid credential. New unauthenticated Dashboard login cannot reach
that compatibility verifier as an issuer.

The Dashboard token lasts exactly 365 days and has no refresh token. Logging out
clears this browser's cookie and authorization-server browser state; it cannot
revoke a copied self-contained token before its expiry. For a confirmed token
compromise, operators must rotate the OAuth signing key, remove the compromised
public key from the accepted JWKS, redeploy, and review authorization audit
events. This invalidates every token signed only by that key.

Deploy the Dashboard and OAuth issuer behind one public origin. Browser
GraphQL, REST, agent, `/api-gateway/oauth/*`, and RFC well-known requests enter
through the Dashboard's same-origin proxy and reach backend-v2 through the
runtime `SSR_API_URL`. For an issuer `https://books.example/beancount`, the
registered callback is
`https://books.example/beancount/oauth/dashboard/callback`; the public proxy
must preserve that prefix. See
[`ADR 0011`](../docs/adrs/ADR011-dashboard-oauth.md) for migration,
credential-boundary, and revocation semantics.

## Exporting financial statements

Open a ledger's Balance Sheet, Income Statement, or Cash Flow report, apply
the time, account,
advanced, interval, and conversion controls you need, then choose **Export**
in the report header. **Spreadsheet CSV** downloads the visible filtered
hierarchy in a formula-safe, Excel-compatible file, including both source-ledger
and statement-facing signs. **Markdown report** downloads a reviewable,
pagination-independent management statement with consistent amount formatting.
Income Statement exports put the conventional single-step summary first—total
revenue, total expenses, and net income or loss—and move the complete account
hierarchy into a supporting-detail appendix. Multi-unit results are explicitly
labeled as a management schedule and must not be added across units; select a
presentation currency for a single-currency statement.
Cash Flow exports open with net cash from operating, investing, and financing
activities, then the opening → net change → closing cash bottom line, with
per-activity account detail as supporting sections. Accounts default to a
heuristic activity split and cash & equivalents set inferred from account
names; an account can declare its role explicitly via `cash-flow-role`
metadata on its `open` directive (see `../docs/adrs/ADR003-dashboard-cash-flow-ledger-roles.md`),
and cash-flow exports disclose the inference only for rows still resolved by
the heuristic.
Balance Sheet exports similarly put an accounting-equation summary first—total
assets, total liabilities, total equity, total liabilities and equity, and the
reconciliation difference—then move the complete ledger hierarchy to a new-page
supporting appendix with section totals at the bottom. A nonzero reconciliation
difference keeps the statement labeled as an internal draft. Because the source
hierarchy does not carry maturity classifications, the export discloses that
current and non-current groupings are unavailable instead of guessing from
account names.
**Print / Save as PDF** opens the browser's print dialog with an unaudited
management statement, reporting dates, scope notices, and ledger-unit
disclosures; choose your browser's PDF destination to create a PDF. The
reporting entity is taken from Beancount's `option "title"`; if it is missing,
the export uses the source ledger name and displays a readiness notice. Other
report pages do not expose this statement export menu.

## Tech stack

React 19 · TypeScript · TanStack Start / Router (SSR) · Apollo Client · Tailwind
CSS v4 · Vitest · i18next (13+ languages).

## License

[MIT](../LICENSE) © Beancount.io — the repository root `LICENSE` governs all packages.
