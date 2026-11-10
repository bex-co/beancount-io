# PRFAQ006 — Self-host Beancount.io on bex in one click

Status: Proposed. This is the target experience, written as if released. Capabilities marked **(planned)** do not exist yet; they are the decisions of [ADR 0029](../adrs/ADR029-deploy-self-hosting-contract.md). Everything else was exercised on a live bex workspace on 2026-11-09.

Date: 2026-11-09

Scope: someone who wants their own Beancount.io, for themselves or a small team, with no server to look after. Docker and local development are covered by their own READMEs.

Evidence baseline: `main` at `bfe5fdddc`; one live run of the root Blueprint, all resources deleted afterwards.

## Press release

*Proposed launch copy. This is not a current product announcement.*

**Run your own Beancount.io in one click, and keep every byte of your books**

*Press **Deploy to bex.co**, wait for the build, sign up. The dashboard, API, ledger engine and Git storage run in your workspace, on your address.*

Beancount.io is open source, and today it became a one-click install. From the repository, press **Deploy to bex.co**, pick the workspace that should own it, review the plan, and apply. There is nothing to fill in: every secret is generated, the services find each other, and the address your dashboard gets is the address it uses everywhere.

When the build finishes, open the dashboard's URL and create an account. No verification email, no plan limits. Install the `bea` command line, point it at your address with two environment variables, and the same ledger is reachable from your terminal. Coding agents connect through the built-in MCP server, which advertises your address as its issuer, never ours.

Your ledger is a plain-text file in a Git repository on a disk in your workspace. **(planned)** Clone links point at your deployment, so `bea cloud ledger clone` and plain `git clone` over HTTPS work against your own server.

Optional pieces stay optional. Add an Anthropic or OpenAI key for receipt scanning, categorisation and the assistant; add an S3 bucket for receipt uploads; add a mail key for password reset. Until you do, each feature says plainly what to set, and nothing else is affected.

## Customer FAQ

### 1. What do I get, and what does it cost?

The dashboard (your one public address), the API, the ledger service (private), Gitea on a 10 GB disk, one managed Postgres and one Key Value store. bex's preview showed about **33 USD a month** at the current Starter plans, billed to your workspace. Delete the resources to stop it. The software is MIT-licensed.

### 2. How do I install it?

1. Open the **Deploy to bex.co** button in the [README](../../README.md#self-host) or [`deploy/bex/`](../../deploy/bex/README.md).
2. Choose the workspace that should own it, review the plan, and apply. Nothing is created until you approve.
3. Wait. The first build is the slow part: about **27 minutes** to a working sign-up on an idle workspace, longer when bex's single build queue is busy.
4. Open the dashboard service's URL and sign up.

You are asked for nothing. If a service shows a failed rollout, trigger a deploy of it again from the bex dashboard; bex does not retry it.

### 3. Who can sign up?

Anyone who can reach the URL. The stack is built for your own users and does not verify email addresses, so put it behind your own access control if that matters.

### 4. How do I use the command line?

```zsh
export BEA_API_URL=https://<your dashboard address>
export BEA_DASHBOARD_URL=https://<your dashboard address>
bea cloud login            # browser sign-in
bea cloud ledger list
```

On 2026-11-09 `bea cloud status` and `bea cloud ledger list` worked this way with a token in `BEA_TOKEN`; the browser sign-in (`bea cloud login`) was not run.

Both variables name the dashboard: it forwards `/api-gateway/` to the API, so your deployment has a single public address. **(planned)** `bea cloud ledger clone` then clones from your own Git host over HTTPS. Today it follows the SSH URL the API reports, which on a bex deployment names the hosted service's Git host and fails.

### 5. Can I use the mobile app?

The App Store and Google Play apps keep a server-address override for self-hosted deployments, and they sign in with the custom-scheme redirect rather than a verified link ([ADR 013](../adrs/ADR013-mobile-verified-https-oauth-redirect.md)). We have not run the app against a bex deployment yet, so treat this as unconfirmed until we do.

### 6. What doesn't work until I configure it?

| You want | Set | Until then |
| --- | --- | --- |
| Receipt and attachment uploads | `TEMP_ASSETS_AWS_S3_*`, `PERM_ASSETS_AWS_S3_*` | The call fails with a configuration error naming these variables. |
| AI: receipt scan, categories, assistant | `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | "LLM is not configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY." |
| Password reset and other mail | `SEND_GRID_API_KEY` | See the next question. |
| Bank connections | `PLAID_*` | Not tested on a self-hosted stack. |

Add variables in the bex dashboard's Environment tab; they survive Blueprint syncs.

### 7. I forgot my password and mail isn't set up. What now?

Today the page says "Email sent!" and nothing arrives, which is wrong. **(planned)** With no mail provider configured, the page tells you the server cannot send email and that your operator can help. The operator then runs a documented admin operation that sets a new password. Until that ships, the operator can use the admin API's `login-as` to open a session as the user. It does not restore the user's password.

### 8. Is the admin API exposed?

The API service has its own public address and serves `/api/admin/*` there, guarded by the generated `ADMIN_TOKEN` (find it in the API service's environment). Treat that token like a root credential. The dashboard address does not forward `/api/admin`.

### 9. How do I update it?

A Blueprint made from the button has no push webhook. To take a change: sync the Blueprint for manifest changes, then trigger a deploy of the service with the new commit ([Rolling out a change](../../deploy/bex/README.md#rolling-out-a-change)). Builds queue one at a time, so a full rollout can take most of an hour.

### 10. Can I use my own domain?

Yes. Give the dashboard and API hosts a shared parent domain, set `AUTH_COOKIE_DOMAIN` to it, and set `DASHBOARD_URL`. With the generated `onbex.co` addresses you need none of this.

### 11. How do I back up my books?

The books are Git repositories on the Gitea disk and rows in the managed Postgres. We have not documented or tested a bex backup and restore procedure yet; until we do, `bea cloud ledger clone` (once the clone address is fixed) gives you a full copy of each ledger's history.

### 12. Is my data private?

Yes. Nothing leaves your workspace unless you configure an AI provider or a mail provider, and then only what those features send. Your own ledger is a text file you can read and diff.

## Internal FAQ

### Why bex first?

It is the only target with zero operator inputs, and the platform is ours to improve. The Docker target stays the choice for a single server you already run.

### What has to be true before we say "one click" without a beta caveat?

- The clone URL is the deployment's own (ADR 0029, decision 3).
- Mail-less recovery is stated on screen and has a documented operator path (decision 4).
- The self-host checklist passes after every deploy (decision 6).
- A documented backup and restore for the bex deployment exists.
- bex retries a failed rollout, or the README keeps the caveat.

### What did the live run find?

Sign-up, tier, discovery documents, CLI access and the configuration errors worked. The clone URL, the false "Email sent!", the hosted-service welcome mail and the missing mail-less recovery did not. See the Evidence and Findings sections of [ADR 0029](../adrs/ADR029-deploy-self-hosting-contract.md).

### What is not verified?

The mobile app, Git over HTTPS with credentials, a redeploy with data on the disk, backup and restore, a custom domain, Plaid, and mail delivery with a real key.
