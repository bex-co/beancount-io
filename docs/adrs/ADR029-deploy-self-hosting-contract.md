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
3. **The Git address comes from the deployment, and is the API's own where Gitea is private.** On bex Gitea is a private service with no address a client can reach, so deriving the external Git host from Gitea's own address (its `ROOT_URL`) fails there. The address a self-hosted API reports must be one the deployment serves, through the API's Git proxy (`git-proxy-handler.ts`); it never falls back to `git.beancount.io` when `SELF_HOST` is on. Where Gitea has a public address, `EXTERNAL_GITEA_HOST_NAME` names it, as today. Where it has none, the deployment says where the proxy is with `GIT_PUBLIC_URL`, an https address ending in `/git`, and every ledger's `httpUrl` is built on it. On bex that is the API service's own address (the platform gives every web service its own, `RENDER_EXTERNAL_URL`) and `/git`; the dashboard's address is not used, because it forwards only `/api-gateway/` and `/.well-known/`, and forwarding Git through the SSR server would add a hop and reserve `/git` against a user of that name. The path prefix has to be in the address: the hosted service reaches the same proxy through a Caddy rewrite to `/git{uri}`, which bex has no equivalent of. Where SSH is not served, ledger responses carry only the HTTPS URL, and `bea cloud ledger clone` uses it. The AI assistant's pull-request link is left out on such a stack: it is a page of Gitea's, and the proxy forwards git's requests and nothing else.
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

Decision 3's first half is built ([w1/m46](../../.pm/w1/done/m46/README.md), 2026-11-14): with `SELF_HOST` on and no `EXTERNAL_GITEA_HOST_NAME`, the API learns its Git address from Gitea's `ROOT_URL` at start (`learnExternalGitHost` in `backend-cluster/backend-v2/src/shared/gitea-utils.ts`) and stops rather than fall back to `git.beancount.io`; a self-hosted stack without the SSH proxy returns `sshUrl: null` on REST, GraphQL and MCP; `bea cloud ledger clone` refuses such a ledger, saying the deployment serves no Git over SSH; and the dashboard's clone menu shows only the HTTP address. On a stack whose Gitea is private, `GIT_PUBLIC_URL` (set by the bex Blueprint's start command from `RENDER_EXTERNAL_URL`, or by the operator) is the clone address: `parseGitPublicUrl` in `config.ts`, which `learnExternalGitHost` yields to and which turns off the pull-request link; not yet run on a live bex. Decision 3's second half (`bea` cloning over HTTPS) is not built: it awaits the owner's ruling on `.pm/DO_NOT_DO.md` "No hosted-ledger export without SSH setup". The rest of the decision is not built. Decision 4 is built ([w1/m47](../../.pm/w1/done/m47/README.md), 2026-11-14): the public `featureFlags` read on REST, GraphQL and MCP carries `emailDelivery` (true only on a production server with `SEND_GRID_API_KEY`; `deliversEmail` in `backend-cluster/backend-v2/src/config/config.ts`); when it is false the dashboard's forgot-password form, on its page and inside the OAuth consent flows, says the server cannot send email and sends the user to the operator instead of offering a link; and `POST /api/admin/password-reset-link` (guarded by `ADMIN_TOKEN`) returns a one-time reset link from the mailed flow's own token store, valid for an hour and never logged. The bex, Docker and single-Postgres READMEs document the call and state that the admin API is public and guarded only by `ADMIN_TOKEN`; the docker-mac README documents it for local use. Decision 5 is built ([w1/m48](../../.pm/w1/done/m48/README.md), 2026-11-14): `CONFIGURATION_ERROR` maps to HTTP 503 instead of 500 (`backend-cluster/backend-v2/src/shared/errors/error-category.ts`); a missing LLM key (`llmNotConfiguredError` in `src/features/llm/utils/fallback-language-model.ts`, also raised before the self-hosted agent chat opens its stream) and a missing model-proxy key raise it with a hint naming the variables, as unconfigured object storage already did, and it is not retried; parity tests pin the code, hint and status for category suggestions and `generateTempAssetUploadUrl` on REST, GraphQL and MCP beside a 500 `INTERNAL_SERVER_ERROR` control; the dashboard shows the hint for AI and upload failures, and `bea` reports the server's `code` and `hint` in its `--json` error envelope. `SELF_HOST` sign-up and limits, the cookie fix, the same-origin proxy, runtime public-URL discovery and the smoke script are shipped and were re-verified on 2026-11-09 as described under Evidence. Follow-up work belongs on the board through `/pm`; none is filed by this record.

### Update, 2026-11-14

Changed in code and tests after the live run; **none of it has been run on a live bex**:

- **Sign-up closes once the first account exists** (an addition to decision 2). With no verification and no plan limits, an open door lets anyone who finds the address use the operator's disk and model key. `signUp` answers `FORBIDDEN`; an anonymous GraphQL query `deploymentInfo { selfHost signUpOpen }` lets the sign-in and sign-up pages drop "Sign up", and `/auth/sign-up` redirects to sign-in. It is part of the sign-up ceremony, so it has no REST or MCP twin, like `signUp`. Registration on a self-host is serialized so two simultaneous first sign-ups cannot both succeed. Consequence: **there is no way yet to add a second account**, which sits badly with "for themselves or a small team"; an operator-created-account path is the open question.
- **The hosted service's terms are not shown on a self-host** (part of the F3 family, decision 1): the sign-up page leaves out the Terms and Privacy Policy line. The ban message, the welcome mail and the Enterprise contact link still name beancount.io.
- **`SELF_HOST` is read forgivingly**: `true`, `1`, `yes`, `y` and `on` mean on, in any case. A value that is neither on nor off stays off and is logged at boot, instead of silently leaving a verification step no mail provider can complete.
- **Gitea is a private service on bex.** It has no public address; only the API and the ledger service reach it. This **changes decision 3**: "derive the external Git host from Gitea's own address" no longer works there, because Gitea has no address a client can reach. The Git address a self-hosted deployment reports has to be the API's own, served by its Git proxy (`git-proxy-handler.ts`), at `<API address>/git` (decision 3); the dashboard does not forward it. Gitea keeps its default `ROOT_URL`, which is **what the first half of decision 3 (w1/m46, merged the same day) learns at start**: `learnExternalGitHost` does not check that the origin is reachable, so on bex every ledger's `httpUrl` would be `http://localhost:3000/<owner>/<repo>.git`. The AI pull-request tool leaves out a link built on a loopback or dotless address, whether Gitea reported it for the pull request or the server learned it at start. That is why the API's start command now sets `GIT_PUBLIC_URL`, and the learned address is only the fallback when the platform gives the API none. Unverified on bex: `RENDER_EXTERNAL_URL` being set for the API service, the proxy behind the platform's ingress for a large push (body size, idle timeout, `TRUSTED_PROXY_HOPS` for the per-address rate limit), `property: host` for a private service, a disk on one, and whether changing an existing Gitea service from web to private keeps its disk.
- **`BLOCKEDEN_ACCESS_KEY` is gone.** `bea ask`'s model proxy forwards to `OPENAI_BASE_URL` (default `https://api.openai.com/v1`) with `OPENAI_API_KEY`. Without the key it answers `CONFIGURATION_ERROR` (503) with the hint `Set OPENAI_API_KEY (see .env.example)`, like every other unconfigured feature (w1/m48). Before, its upstream was a hard-coded BlockEden gateway a self-hoster has no account with, so `bea ask` could not work on a self-host at all; the READMEs called the key "metering". See [ADR 011](./ADR011-backend-v2-ai-api-usage.md), Path C.
- **PRFAQ006 question 12 now lists every outbound flow we know of** (breach check, model provider, mail, S3, Gravatar, beancount.io feeds and price feeds, Plaid), where it used to say nothing leaves the workspace.
- **The admin token is compared in constant time** (`admin-api-middleware.ts` used `!==`, which returns at the first differing byte); a missing or repeated header is refused as before. The agent-box example env file no longer carries a BlockEden access key that looked real. It stays in git history, so the key itself has to be revoked at BlockEden.

### Update, 2026-11-16

The rest of decision 2 and the decision 1 leftovers are built (code and tests; not yet run on a live bex). With `SELF_HOST` on: sign-in no longer tries to follow the hosted showcase user `open_ledger` (`auth-session-workflow.ts`); the welcome mail is sent only when the deployment delivers mail, and its dashboard link is the deployment's own address (`welcomeMailLinks` in `backend-cluster/backend-v2/src/features/auth/utils/deployment-copy.ts`; the app-store and help-centre links are public pages); a blocked account is told to contact the person who runs the server, at sign-in and on the Git proxy (`bannedUserMessage`, same file); and the dashboard's plan card leaves out the hosted "Contact us" link. The managed service's behavior and wording are unchanged.

Still open from this review: the Pwned Passwords check cannot be switched off; the API's `/api/admin/*` and Git proxy are on the internet behind a single header token with no visible lockout.

## References

[PRFAQ006](../prfaqs/PRFAQ006-self-host-on-bex.md) describes the target experience this record works toward. [`deploy/bex/README.md`](../../deploy/bex/README.md), [`deploy/AGENTS.md`](../../deploy/AGENTS.md) and [`.pm/DO_NOT_DO.md`](../../.pm/DO_NOT_DO.md) hold the current design and rules.
