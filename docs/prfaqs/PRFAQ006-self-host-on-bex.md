# PRFAQ006 — Self-host Beancount.io on bex in one click

Status: Proposed. This is the target experience, written as if released. Capabilities marked **(planned)** do not exist yet; they are the decisions of [ADR 0029](../adrs/ADR029-deploy-self-hosting-contract.md). Everything else was exercised on a live bex workspace on 2026-11-09.

Date: 2026-11-09 (updated 2026-11-14 and 2026-11-16)

Scope: someone who wants their own Beancount.io, for themselves, with no server to look after. A deployment holds one account today (see question 3); a team is not served yet. Docker and local development are covered by their own READMEs.

Evidence baseline: `main` at `bfe5fdddc`; one live run of the root Blueprint, all resources deleted afterwards.

Changed in code after that run (2026-11-14), **not yet run on a live bex**: sign-up closes once the first account exists; Gitea is a private service and ledgers are cloned through the API's Git proxy; `SELF_HOST` accepts `true`, `1`, `yes` and `on`; the sign-up page no longer shows the hosted service's terms; `bea ask` uses `OPENAI_API_KEY`; the forgot-password page says when the server cannot send mail and the operator can issue a one-time reset link; a blocked user is sent to the operator, the plan card drops the hosted "Contact us" link, no welcome mail is attempted without a mail key, and sign-in no longer looks for the hosted showcase account. Each is marked **(not yet run on bex)** below.

## Press release

*Proposed launch copy. This is not a current product announcement.*

**Run your own Beancount.io in one click, and keep every byte of your books**

*Press **Deploy to bex.co**, wait for the build, sign up. The dashboard, API, ledger engine and Git storage run in your workspace, on your address.*

Beancount.io is open source, and today it became a one-click install. From the repository, press **Deploy to bex.co**, pick the workspace that should own it, review the plan, and apply. There is nothing to fill in: every secret is generated, the services find each other, and the address your dashboard gets is the address it uses everywhere.

When the build finishes, open the dashboard's URL and create an account. No verification email, no plan limits. Sign-up closes behind that first account, so make it straight away. Install the `bea` command line, point it at your address with two environment variables, and the same ledger is reachable from your terminal. Coding agents connect through the built-in MCP server, which advertises your address as its issuer, never ours.

Your ledger is a plain-text file in a Git repository on a disk in your workspace. Clone links point at your deployment: `git clone` over HTTPS, with a personal access token as the password, works against your own server **(not yet run on bex)**.

Optional pieces stay optional. Add an Anthropic or OpenAI key for receipt scanning, categorisation and the assistant; add an S3 bucket for receipt uploads; add a mail key for password reset. Until you do, each feature says plainly what to set, and nothing else is affected.

## Customer FAQ

### 1. What do I get, and what does it cost?

The dashboard (the address you use), the API (it also has an address of its own, see 8), the ledger service and Gitea (both private, with no public address; Gitea keeps its repositories on a 10 GB disk), one managed Postgres and one Key Value store. bex's preview showed about **33 USD a month** at the current Starter plans, billed to your workspace. Delete the resources to stop it. The software is MIT-licensed.

### 2. How do I install it?

1. Open the **Deploy to bex.co** button in the [README](../../README.md#self-host) or [`deploy/bex/`](../../deploy/bex/README.md).
2. Choose the workspace that should own it, review the plan, and apply. Nothing is created until you approve.
3. Wait. The first build is the slow part: about **27 minutes** to a working sign-up on an idle workspace, longer when bex's single build queue is busy.
4. Open the dashboard service's URL and sign up.

You are asked for nothing. If a service shows a failed rollout, trigger a deploy of it again from the bex dashboard; bex does not retry it.

### 3. Who can sign up?

The first person to do it, **(not yet run on bex)**. The stack puts no plan limits on anyone and never proves an email address, so it takes sign-ups only until its first account exists: after that the API refuses `signUp`, and the sign-in page and `/auth/sign-up` stop offering it. Sign up as soon as the deploy is up; until you do, anyone who finds the address could be first. There is no way yet to add a second account; deleting the only account reopens sign-up.

### 4. How do I use the command line?

```zsh
export BEA_API_URL=https://<your dashboard address>
export BEA_DASHBOARD_URL=https://<your dashboard address>
bea cloud login            # browser sign-in
bea cloud ledger list
```

On 2026-11-09 `bea cloud status` and `bea cloud ledger list` worked this way with a token in `BEA_TOKEN`; the browser sign-in (`bea cloud login`) was not run.

Both variables name the dashboard: it forwards `/api-gateway/` to the API, so the CLI needs only that one address.

To get a ledger's Git history, use plain `git`: every ledger's `httpUrl` is `https://<your API address>/git/<owner>/<ledger>.git`, served by the API's Git proxy (Gitea itself has no public address) **(not yet run on bex)**. Mint a personal access token in the dashboard under Settings → API keys and give it as the password; any username works. `bea cloud ledger clone` clones over SSH only, and bex routes no SSH, so on a bex deployment it stops and says the deployment serves no Git over SSH.

### 5. Can I use the mobile app?

The App Store and Google Play apps keep a server-address override for self-hosted deployments, and they sign in with the custom-scheme redirect rather than a verified link ([ADR 013](../adrs/ADR013-mobile-verified-https-oauth-redirect.md)). We have not run the app against a bex deployment yet, so treat this as unconfirmed until we do.

### 6. What doesn't work until I configure it?

| You want | Set | Until then |
| --- | --- | --- |
| Receipt and attachment uploads | `TEMP_ASSETS_AWS_S3_*`, `PERM_ASSETS_AWS_S3_*` | The call fails with a configuration error naming these variables. |
| AI: receipt scan, categories, assistant | `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | The call fails with a configuration error naming these variables. |
| `bea ask` | `OPENAI_API_KEY` (and optionally `OPENAI_BASE_URL`), **(not yet run on bex)** | The call fails with a configuration error naming `OPENAI_API_KEY`. |
| Password reset and other mail | `SEND_GRID_API_KEY` | See the next question. |
| Bank connections | `PLAID_*` | Not tested on a self-hosted stack. |

Add variables in the bex dashboard's Environment tab; they survive Blueprint syncs. No plan limits apply, so the assistant has no monthly token cap: add a model key after you have signed up, once sign-up has closed.

### 7. I forgot my password and mail isn't set up. What now?

With no mail provider configured, the forgot-password page tells you the server cannot send email and that the person who runs it can help **(not yet run on bex)**. That person calls `POST /api/admin/password-reset-link` on the API's address with the `ADMIN_TOKEN` ([A user forgot their password](../../deploy/bex/README.md#a-user-forgot-their-password)) and gets a one-time link, good for an hour, on which you set a new password. On a one-person deployment you are both people.

### 8. Is the admin API exposed?

The API service has its own public address and serves `/api/admin/*` there, guarded by the generated `ADMIN_TOKEN` (find it in the API service's environment). Treat that token like a root credential. The dashboard address does not forward `/api/admin`. Of the six services, only the dashboard and the API have a public address; the ledger service and Gitea are private **(Gitea: not yet run on bex)**.

### 9. How do I update it?

A Blueprint made from the button has no push webhook. To take a change: sync the Blueprint for manifest changes, then trigger a deploy of the service with the new commit ([Rolling out a change](../../deploy/bex/README.md#rolling-out-a-change)). Builds queue one at a time, so a full rollout can take most of an hour.

### 10. Can I use my own domain?

Yes. Give the dashboard and API hosts a shared parent domain, set `AUTH_COOKIE_DOMAIN` to it, and set `DASHBOARD_URL`. With the generated `onbex.co` addresses you need none of this.

### 11. How do I back up my books?

The books are Git repositories on the Gitea disk and rows in the managed Postgres. We have not documented or tested a bex backup and restore procedure yet; until we do, `git clone` over HTTPS (question 4) gives you a full copy of each ledger's history.

### 12. Is my data private?

Your books stay on your disk and in your database. Nothing is sent to us and there is no analytics: the browser analytics script is included only when a build sets a measurement ID, and the Blueprint's build does not. A few things do leave the workspace, and these are all of them that we know of:

| What leaves | Where it goes | When |
| --- | --- | --- |
| The first 5 characters of the SHA-1 of a new password | api.pwnedpasswords.com | Every sign-up and password change. It is a breach check that tells the service neither the password nor the account; if the service cannot be reached, sign-up carries on. It cannot be switched off today. |
| Your prompts, and the ledger text, receipts or transactions they involve | The model provider you configured (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`) | Only when someone uses an AI feature or `bea ask`. |
| The recipient and the message | SendGrid | Only with `SEND_GRID_API_KEY`: password recovery, and a welcome mail whose dashboard link is your own address (its app-store and help-centre links are public pages). |
| Receipt and attachment files | The S3 bucket you configure | Only with `TEMP_ASSETS_AWS_S3_*` and `PERM_ASSETS_AWS_S3_*`. |
| An MD5 hash of the user's email address | gravatar.com | Whenever a page shows the avatar of a user who has not uploaded one: the browser fetches their Gravatar. |
| A request for the blog and changelog feeds (a language, nothing about the user) | beancount.io | When the API builds a user's home feed. |
| A request for a price feed | beancount.io | Only if a ledger `include`s a managed price URL such as `https://beancount.io/prices/BTC-USD`. |
| Bank connection data | Plaid | Only with `PLAID_*`; not tested on a self-hosted stack. |

Your own ledger is a text file you can read and diff.

## Internal FAQ

### Why bex first?

It is the only target with zero operator inputs, and the platform is ours to improve. The Docker target stays the choice for a single server you already run.

### What has to be true before we say "one click" without a beta caveat?

- The clone URL is the deployment's own (ADR 0029, decision 3). Built; awaits the live run.
- Mail-less recovery is stated on screen and has a documented operator path (decision 4). Built; awaits the live run.
- The self-host checklist passes after every deploy (decision 6).
- A documented backup and restore for the bex deployment exists.
- bex retries a failed rollout, or the README keeps the caveat.
- The closing of sign-up, the private Gitea and `bea ask` with `OPENAI_API_KEY` have been run on a live bex.
- There is a way to add a second account, or the copy keeps saying one account per deployment (it does today).

### What did the live run find?

Sign-up, tier, discovery documents, CLI access and the configuration errors worked. The clone URL, the false "Email sent!", the hosted-service welcome mail and the missing mail-less recovery did not; all four have since been changed in code. See the Evidence and Findings sections of [ADR 0029](../adrs/ADR029-deploy-self-hosting-contract.md).

### What is not verified?

The mobile app, Git over HTTPS with credentials, a redeploy with data on the disk, backup and restore, a custom domain, Plaid, and mail delivery with a real key. Since the live run, and also not run on bex: sign-up closing after the first account, Gitea as a private service (whether bex accepts `host` for a private service and a disk on it, and whether changing an existing Gitea service from web to private keeps its disk), and `bea ask` through `OPENAI_API_KEY`.
