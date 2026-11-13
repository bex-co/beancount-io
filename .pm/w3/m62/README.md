# w3 · m62 — Ledger creation: a prefilled Currency field, backward compatible

**Worker:** worker3 **Goal:** the dashboard and native creation forms keep today's single form and gain one Currency field, prefilled for the user, so a Starter ledger opens in the right operating currency; app versions already installed keep creating exactly the ledger they create today. **Status:** todo (t001, t002 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Accept an optional `currency` on ledger creation across REST, GraphQL, and MCP — **DONE** | 90m | — |
| t002 | Dashboard: a prefilled Currency field on the create form — **DONE** | 90m | t001 |
| t003 | Native: a prefilled Currency field on the create screen | 90m | t001 |
| t004 | Adoption surface | 30m | t002, t003 |
| t005 | Simplify | 20m | t004 |
| t006 | Test coverage | 45m | t004 |
| t007 | Closeout | 10m | t005, t006 |

## Definition of done

- `createLedger` takes an optional, nullable `currency` on REST, GraphQL, and MCP with the same validation and failures. With `template` Starter (or omitted) it becomes the `operating_currency` of the created `main.bean`; an unsupported code is a validation error naming `currency`; `currency` with `template: SAMPLE` or with `setup` is a validation error. The field is never required.
- **Backward compatibility:** a request without `currency` (every app version already installed) creates a `main.bean` byte-identical to today's Starter (`USD`), and its idempotency hash is unchanged, so a `requestId` retry spanning the deploy still returns the original ledger. Creation never reads the profile `defaultCurrency` server-side (the m60 rule stands); prefilling is the client's job.
- The dashboard form and the native screen look like today's form plus one **Currency** field: prefilled from the saved profile `defaultCurrency`, else the browser or device region's currency when it is supported, else `USD`; editable; hidden while Sample is selected; sent only for Starter. Nothing else in the form changes, and the submit button says "Create ledger" on both.
- Release order is recorded where releases are read: backend first, then dashboard, then native, because a new client sending `currency` to an older server fails with an unknown-argument error.
- `yarn test`, the parity gate, and the OpenAPI snapshot pass in backend-v2; dashboard and mobile checks pass; the CLI's generated client and docs are in sync.

## Source + Goal linkage

- **Source:** owner request 2026-11-12 after [ADR026](../../../docs/adrs/ADR026-dashboard-onboarding.md) was suspended: keep the single form and support only a default currency, compatible with installed mobile apps. The two-step flow and its currency suggestion ([m60](../done/m60/README.md)) were reverted in `336b3cf4d` (dashboard) and `6dc73928d` (mobile); their `currency-suggestion` modules and `setup-currencies.json` are the starting point for t002–t003, trimmed to the order above.
- **Goal linkage:** A2 — Frictionless onboarding: a newcomer outside the United States gets a first ledger in their own currency without editing `main.bean` or learning the setup specification.
- **Expected outcome:** fewer new Starter ledgers whose operating currency is changed by hand after creation; non-USD Starter ledgers created from web and native.
- **Why now:** the API already validates currencies and stores `defaultCurrency`; the owner wants this slice without reviving ADR026. Adoption surface is included because the form and the API change are user- and agent-facing.
