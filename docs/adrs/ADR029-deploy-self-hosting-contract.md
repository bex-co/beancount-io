# ADR029: Self-hosting — what a self-hosted Beancount.io promises, and where it falls short today

- Status: Proposed
- Date: 2026-11-09
- Owners: Product, backend-v2, deploy
- Baseline: `main` at `bfe5fdddc`, plus one live run of the root `bex.yaml` Blueprint on bex on 2026-11-09 (all resources deleted afterwards, with 404 proofs)
- Scope: the experience of someone who runs the whole stack for their own users on bex, a single Docker host, or locally: what "self-hosted" means, which behaviours the `SELF_HOST` switch owns, and which hosted-service assumptions still leak into a self-hosted deployment. Out of scope: the hosted product's own deployment, billing design, and any new deploy target.

## Context

The repository ships five ways to run the stack, and nothing records what a self-hoster is promised.

| Target | Intended for | Inputs the operator supplies | Notes |
| --- | --- | --- | --- |
| [`bex.yaml`](../../bex.yaml) + [`deploy/bex/`](../../deploy/bex/README.md) | One-click PaaS | none (every secret generated) | Postgres, Key Value, Gitea on a disk, API, ledger, dashboard. Git over SSH off. |
| [`deploy/docker/`](../../deploy/docker/README.md) | One persistent server | ~15 secrets, three DNS names | Caddy TLS, optional SSH overlay. |
| [`deploy/docker-single-psql/`](../../deploy/docker-single-psql/README.md) | Same, one Postgres | as above | Variant of `docker/`. |
| [`deploy/docker-mac/`](../../deploy/docker-mac/README.md) | Local development | a few | Not a production target. |
| [`deploy/dev-sandbox/`](../../deploy/dev-sandbox/) | Development with the Ask-AI sandbox | generated | Not a production target. |

The decisions that exist are scattered: the design reasoning for bex lives in `deploy/bex/README.md` (including rejected options), the target list in [`deploy/AGENTS.md`](../../deploy/AGENTS.md), and one product rule in [`.pm/DO_NOT_DO.md`](../../.pm/DO_NOT_DO.md): *no half-self-hosted deployments* — a deployment is fully self-hosted or fully managed, and configuration whose only purpose is to make two halves agree is out. Other ADRs mention self-hosting in passing (for example [ADR 013](./ADR013-mobile-verified-https-oauth-redirect.md) on redirect URIs). No ADR owns it.

What has shipped so far: `SELF_HOST=true` (no email verification at sign-up, every plan limit lifted; [`self-host.ts`](../../backend-cluster/backend-v2/src/config/self-host.ts)), the cookie-domain fix, the same-origin `/api-gateway` proxy and runtime public-URL discovery for bex ([w22/m8](../../.pm/w22/done/m8/README.md), [w22/m9](../../.pm/w22/done/m9/README.md)).

## Evidence

On 2026-11-09 the root Blueprint was applied to an otherwise idle bex workspace and exercised end to end, then deleted.

| Check | Result |
| --- | --- |
| Time to a working sign-up | About 27 minutes from Blueprint creation (dashboard 6 minutes in, Gitea 7, API last). The workspace was not contended; the README's 20–40 minute range is plausible. |
| Sign-up | Passes: `signUp` returns a token directly, no verification step. The API logs `SELF_HOST is on` at boot. |
| Tier | `bea cloud status` reports `ENTERPRISE`. Plan limits are off. |
| OAuth and MCP discovery | The protected-resource and authorization-server documents name the dashboard host as issuer and resource. |
| CLI | `bea cloud status` and `bea cloud ledger list` work against the dashboard host with `BEA_API_URL` and `BEA_DASHBOARD_URL` set to it. |
| Forgot password | The page says **"Email sent!"** for an existing and for an unknown address. Nothing can be sent; see F1. |
| Receipt upload | `generateTempAssetUploadUrl` and the REST route fail with `CONFIGURATION_ERROR` and a hint naming the variables to set. The REST status is 500. |
| AI | `suggest-categories` fails with "LLM is not configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY." and the code `INTERNAL_SERVER_ERROR`. |
| Ledger clone | `GET /api-gateway/v1/ledgers` returns `sshUrl: ssh://git@git.beancount.io:2222/<user>/default.git` and `httpUrl: https://git.beancount.io/<user>/default.git`. `bea cloud ledger clone` tries the SSH URL and stops at "Host key verification failed". See F2. |
| Operator recovery | `POST /api/admin/login-as` on the API host, with `x-admin-token` (the generated `ADMIN_TOKEN`), returned a one-time login URL for the user. See F1. |

Not run: the `bea cloud login` browser flow (the CLI checks used a session token in `BEA_TOKEN`), a mobile app against the stack, Git over HTTPS with credentials, a redeploy with data on the disk, backup and restore, a custom domain, Plaid, and mail delivery with a real key. Findings that rest on code reading only are marked as such.

## Findings

**F1 — A self-hoster who forgets a password has no documented way back, and the page says the mail was sent.** Without `SEND_GRID_API_KEY` the reset mail cannot be delivered, yet the dashboard shows "Email sent!" (the endpoint answers `success: true` for any address by design, so it cannot tell the page otherwise). The bex README says "forgot-password … do not work without `SEND_GRID_API_KEY`", but a user at the login screen never sees that. An operator path exists but is undocumented: the admin API's `login-as` signs the operator in as any user. We found no dashboard screen or mutation for setting a new password from a signed-in session, so `login-as` gets an operator into the account without restoring the user's password (code reading; not run past `login-as`). The admin API is also served on the API's own public host, protected only by `ADMIN_TOKEN`.

**F2 — Ledger clone URLs point at beancount.io's Git host.** `EXTERNAL_GITEA_HOST_NAME` defaults to `git.beancount.io` ([`config.ts`](../../backend-cluster/backend-v2/src/config/config.ts)). The `docker` and `docker-single-psql` Compose files set it from `GIT_DOMAIN`; `bex.yaml` deliberately does not, so on bex every ledger's `sshUrl` and `httpUrl` name the hosted service. `bea cloud ledger clone` follows the SSH URL, and bex has no TCP routing, so SSH could not work there even with the right host. This is exactly the seam the "no half-self-hosted" rule forbids, and the failure is silent about its cause.

**F3 — Hosted-service assumptions in side effects.** After every sign-up the API sends a welcome mail whose links are hardcoded to beancount.io (the ledger URL, the mobile-app link and the help centre; code reading). Without a mail key the send fails and logs two error lines per sign-up. After sign-in the API tries to follow the hosted showcase user `open_ledger`, which does not exist on a self-hosted stack, and logs a warning each time.

**F4 — Misconfiguration is reported inconsistently.** Object storage reports `CONFIGURATION_ERROR` with a hint but returns HTTP 500; the missing LLM key reports `INTERNAL_SERVER_ERROR` with a clear message. A client cannot tell "the operator has not set this up" from "the server broke" without reading prose.

**F5 — The Docker targets do not mention `SELF_HOST` in prose.** `deploy/docker/README.md`, `docker-single-psql/README.md` and `docker-mac/README.md` never name it. The variable appears only in `docker/.env.example` and `docker-mac/.env.example` and is not passed through by the `docker-single-psql` Compose file at all, so that target cannot turn it on. `docker` also asks the operator to "generate a JWKS offline" with no command, where bex derives the signing key from `AUTH_SECRET`.

**F6 — Day-two operations are thin.** bex has no push webhook (updates are manual) and a failed rollout is not retried. We found no backup or restore procedure for the bex deployment's Postgres and Gitea disk. The Docker README documents volume backups.

**F7 — Mobile is plausible but unproven.** The app keeps a runtime server-URL override and, per ADR 013, uses the custom-scheme redirects for self-hosted origins. No document tells a self-hoster to use it, and it was not run here.

## Decision (proposed)

1. **Definition.** A self-hosted Beancount.io is a complete stack under the operator's own origin. Nothing it shows, sends, or links to as *its own* address may name beancount.io; links to public documentation are fine. This restates the `DO_NOT_DO.md` rule as a testable property.
2. **`SELF_HOST` owns every behaviour that differs.** Today it covers sign-up verification and plan limits. It also gates, in addition: the `open_ledger` follow (skipped), and the welcome mail (sent only when mail is configured, with the deployment's own URLs).
3. **The Git address comes from the deployment.** The API derives the external Git host from Gitea's own address when `EXTERNAL_GITEA_HOST_NAME` is unset, as the bex Gitea wrapper already does for `ROOT_URL`; it never falls back to `git.beancount.io` when `SELF_HOST` is on. Where SSH is not served, ledger responses carry only the HTTPS URL, and `bea cloud ledger clone` uses it.
4. **Mail-less recovery is an explicit state.** When no mail provider is configured, the forgot-password page says the server cannot send email and names the operator as the way back. The operator path is a documented, tested admin operation that sets a user's password (or issues a one-time reset link), and the docs state that the admin API is a public surface guarded by `ADMIN_TOKEN`. The admin API is operator tooling, not a customer-facing capability, so the REST/GraphQL/MCP parity rule does not apply to it.
5. **Misconfiguration has one shape.** A feature that needs operator setup fails with `CONFIGURATION_ERROR` and a hint on every surface, mapped to one non-500 HTTP status. The LLM-not-configured error joins it.
6. **A self-host contract, checked after every deploy.** Every production target must pass the same checklist: sign-up with no verification page, session cookie on the operator's host, OAuth and MCP discovery naming that host, ledger create and clone through the operator's Git host, `bea` reaching it with two environment variables, mail-less recovery, and no beancount.io address in any response or mail. `dashboard/scripts/qa/run-self-host-sign-up.mjs` already checks the first three and is the place to extend.
7. **Targets and prose.** bex is the recommended one-click path and Docker the single-server path. All production READMEs state `SELF_HOST`, the signing-key setup, mail and AI as optional, and how to update and back up. `docker-single-psql` passes `SELF_HOST` through.

## Alternatives considered

- **Documentation only.** Cheapest, but F2 and F3 are behaviours a document cannot fix, and F1's "Email sent!" is a false statement on the screen.
- **Print reset links to the API log when no mail key is set.** Gives the operator a recovery path without new code, but puts a live credential into logs, which the auth mail service avoids on purpose. Rejected.
- **A separate self-host build.** Removes the hosted assumptions at the source, but is the "two halves" split the product rule rejects, and doubles the release surface. Rejected.

## Consequences

- Backend-v2 changes for decisions 2–5 touch sign-up, the ledger responses and error mapping, so REST, GraphQL and MCP move together for the customer-facing parts (ledger URLs, error shape).
- The `bea` CLI changes only if it must prefer the HTTPS URL; the hosted behaviour stays as it is.
- The self-host checklist becomes a gate: a target that cannot pass an item documents the exception instead of hiding it.
- The README's "Beta" caveats stay until rollout retries and update automation exist on the platform; those live outside this repository.

## Implementation status

Nothing in the decision is built. `SELF_HOST` sign-up and limits, the cookie fix, the same-origin proxy, runtime public-URL discovery and the smoke script are shipped and were re-verified on 2026-11-09 as described under Evidence. Follow-up work belongs on the board through `/pm`; none is filed by this record.

## References

[PRFAQ006](../prfaqs/PRFAQ006-self-host-on-bex.md) describes the target experience this record works toward. [`deploy/bex/README.md`](../../deploy/bex/README.md), [`deploy/AGENTS.md`](../../deploy/AGENTS.md) and [`.pm/DO_NOT_DO.md`](../../.pm/DO_NOT_DO.md) hold the current design and rules.
