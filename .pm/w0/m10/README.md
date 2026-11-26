# w0 · m10 — Docker self-hosts sign in from the mobile app and MCP hosts, and bring books in, as written

**Worker:** worker1 **Goal:** someone who self-hosts with `deploy/docker` or `deploy/docker-single-psql` follows its README and can sign in from the store mobile app and from an MCP host that uses OAuth, without making a signing key by hand, and can bring a ledger in from another stack or from beancount.io **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Docker targets derive the OAuth signing key from `AUTH_SECRET` | 25m | — |
| t002 | Prove the derived key on a production-mode backend | 40m | t001 |
| t003 | Docker READMEs: the signing key, the mobile app's server address, and the MCP endpoint | 30m | t002 |
| t004 | Docker READMEs: bring books in from another stack or from beancount.io | 35m | — |
| t005 | Adoption surface | 15m | t003, t004 |
| t006 | Simplify | 15m | t005 |
| t007 | Test coverage | 30m | t005, t006 |
| t008 | Closeout | 10m | t007 |

## Definition of done

On both `deploy/docker` and `deploy/docker-single-psql`:

- With a new `.env` copied from `.env.example` and only the required values filled in, `https://<APP_DOMAIN>/.well-known/oauth-authorization-server` answers 200 and the JWKS route serves a key, with `OAUTH_JWKS` left empty. An explicit `OAUTH_JWKS` is served instead when it is set. An existing `.env` that lacks the new variable behaves exactly as before: OAuth answers `503 oauth_not_configured` until a key is supplied.
- `docker compose --env-file .env.example config --quiet` passes, and the rendered backend environment carries `OAUTH_JWKS_FROM_AUTH_SECRET`.
- The README no longer asks the operator to "generate a keyset offline" without a command. It says the key is derived from `AUTH_SECRET` by default, how to supply one instead, and that rotating `AUTH_SECRET` rotates the key and signs OAuth clients out. It tells the operator what to type into the mobile app's server settings (`https://<APP_DOMAIN>`), and gives the MCP endpoint (`https://<APP_DOMAIN>/api-gateway/mcp`).
- The README has the bring-books-in steps: create a ledger in the dashboard, merge the other ledger's files or Git history into it, and push (a forced push is refused). A run on a local Docker stack is recorded in t004: a ledger with its own history went into a new ledger and `checkLedger` reported no errors. Exporting from the hosted beancount.io goes through `bea cloud ledger clone`, with an SSH key, as `.pm/DO_NOT_DO.md` requires.

## Source + Goal linkage

- **Source:** `/pm-brainstorm another for w0`, 2026-11-25, item 1. The user routed it to w0 via `/pmx`.
- **Evidence:**
  - [#161](https://github.com/bex-co/beancount-io/issues/161), opened 2026-01-20, with the reporter and four more 👍: can the app be used with a self-hosted instance? The 2026-08-27 reply pointed to `deploy/docker` and to the app's server selection, which shipped in `mobile-v1.20260824.45`. On `deploy/docker` today, the app cannot sign in unless the operator makes a P-256 JWKS by hand. The compose file does not pass `OAUTH_JWKS_FROM_AUTH_SECRET`, and `.env.example` says only "Generate a keyset offline". Without a key, every `/oauth/*` route answers 503 (`deploy/docker/README.md`, "OAuth signing key").
  - [#194](https://github.com/bex-co/beancount-io/issues/194), 2026-11-17: a self-hoster designed OIDC sign-in so that "the mobile app and the OAuth consent pages" get the button. Both need OAuth to work.
  - [#176](https://github.com/bex-co/beancount-io/issues/176), item 3, 2026-09-10: a self-hoster with two instances asked for a supported way to bring them together. The reply answered a different question, about sharing one Postgres server. The answer now exists for ledgers, in [PRFAQ006](../../../docs/prfaqs/PRFAQ006-self-host-on-bex.md) question 15 (run on bex 2026-11-18: a 6,600-line ledger with its history went into a new ledger), but the Docker READMEs do not have it.
  - The self-hosters who named their target run Docker: [#180](https://github.com/bex-co/beancount-io/issues/180) (`docker-single-psql`, 2026-10-14) and [#258](https://github.com/bex-co/beancount-io/issues/258) (`deploy/docker`, 2026-11-22). GitHub traffic, 14 days to 2026-11-24: `/tree/main/deploy/docker` 10 unique visitors, `/tree/main/deploy` 7, `/tree/main/mobile` 12.
  - Context: [ADR029](../../../docs/adrs/ADR029-deploy-self-hosting-contract.md) (`Proposed`) names this gap in F5 ("docker also asks the operator to 'generate a JWKS offline' with no command, where bex derives the signing key from `AUTH_SECRET`"). Its decision 7 asks every production README to state the signing-key setup. The derivation itself shipped for bex in [w22/m9](../../w22/done/m9/README.md) (`backend-cluster/backend-v2/src/config/jwks`).
- **Goal linkage:** A2: a newcomer who self-hosts gets from first boot to a working app sign-in with nothing beyond the required `.env` values. A1: an MCP host that signs in with OAuth can connect to a Docker self-host.
- **Expected outcome:** a Docker self-hoster types `https://<APP_DOMAIN>` into the app's server settings and signs in, connects an OAuth MCP host, and moves a ledger in from another stack, each by following the README. #161 and #176 can then be answered with a link.
- **Why now:** four of the five self-hosters who reported publicly did so in the last 11 weeks. The key derivation has run on bex since w22/m9, so this is wiring and documentation, not new code. The app's sign-in to a self-hosted stack was proven on the iOS simulator against bex on 2026-11-19 (PRFAQ006 question 5).
- **Adoption surface:** included. The Docker READMEs and `.env.example` files are what a self-hoster follows step by step, and the root `README.md` and `deploy/AGENTS.md` describe these targets.
- **Not in scope:** `SELF_HOST` in the first-boot prose and the update procedure (the rest of ADR029 decision 7) have no observed failure yet. Prebuilt images are an open question for the owner.
