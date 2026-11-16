# w3 · m68 — Git over HTTPS: personal access tokens instead of the account password

**Worker:** worker3 **Goal:** a user cloning, pulling, or pushing a hosted ledger over HTTPS authenticates with a scoped personal access token instead of their Beancount.io account password, and password sign-in on the Git endpoint can be phased out through one code-level setting, `gitHttp.passwordAuth`. **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Accept a personal access token as the Git HTTPS password, honoring its scopes, ledger restriction, and expiry — **DONE** | 90m | — |
| t002 | `gitHttp.passwordAuth` (`allow` / `warn` / `deny`) in code-level config, shipped as `warn` — **DONE** | 60m | t001 |
| t003 | Tell users what to type: clone menu, docs, and stale-credential cleanup — **DONE** | 45m | t001 |
| t004 | Adoption surface — **DONE** | 30m | t002, t003 |
| t005 | Simplify — **DONE** | 20m | t004 |
| t006 | Test coverage — **DONE** | 45m | t004 |
| t007 | Closeout — **DONE** | 10m | t005, t006 |

## Definition of done

- `/git/:owner/:repo/*` accepts HTTP Basic Auth whose password is a live `bcio_` personal access token, with any non-empty username. `info/refs?service=git-upload-pack` and `git-upload-pack` need `ledger.read`. `info/refs?service=git-receive-pack` and `git-receive-pack` need `ledger.write`. A key restricted to one ledger is refused on every other `owner/name`, in the same way REST refuses it. A revoked, expired, or unknown key gets a 401 like a wrong password, and keys that once existed cannot be told apart from keys that never did. A token request does not charge the account's failed-password budget.
- `gitHttp.passwordAuth` is a typed constant in backend-v2's config. It is **not** read from an environment variable: environment variables are for credentials. It governs both password paths, app email + password and the Gitea-username passthrough:
  - `allow`: today's behavior.
  - `warn`: still accepted, but logged and counted per path, and the user is told to switch to a token wherever the Git protocol carries a message.
  - `deny`: refused with a 401 whose text names the token settings page.
  The shipped value is `warn`. Tokens work under all three values.
- The dashboard clone dialog's HTTPS option says the password is a personal access token and links to `/settings/api-keys`. The backend and self-host docs that describe Git over HTTPS say the same, and show how to clear a stale stored credential (`git credential reject`, the macOS Keychain entry, `~/.git-credentials`).
- backend-v2 `yarn typecheck`, `yarn lint:deadcode`, `yarn format:check`, and `yarn test` pass, and the dashboard checks pass.

## Source + Goal linkage

- **Source:** user request 2026-11-15, after comparing with GitHub's retirement of account passwords for Git over HTTPS in favor of personal access tokens. In code today (`backend-cluster/backend-v2/src/features/gitea/api/git-proxy-handler.ts`), the Git HTTPS endpoint accepts only the account email + password or the generated Gitea credential. Personal access tokens ([m10](../m10/README.md)) authenticate REST, but the Git endpoint does not accept them.
- **Evidence:** a Git credential is stored on disk by credential helpers and copied into scripts and CI. Here that credential is the account password, which also signs in to the dashboard. An account with no password (magic-link sign-in only) cannot use Git over HTTPS at all, because `verifyPasswordCredentials` has nothing to compare. The SSH proxy is already publickey-only (`ssh-proxy-server.ts`), so HTTPS is the one Git path that takes a password.
- **Goal linkage:** A1 — Agent-native accounting: agents and CI get a least-privilege, revocable, expiring Git credential instead of the account password.
- **Expected outcome:** a user can revoke one leaked Git credential without changing their password, and a read-only token can clone but not push. Once the `warn` counts are known, the owner can schedule `deny`.
- **Why now:** the token model (scopes, ledger restriction, expiry, revocation) already exists from m10 and the trusted client address from w0/m7. The remaining gap is the Git endpoint. Adoption surface is included because the clone dialog and the docs are user-facing.
- **Out of scope, by decision:**
  - Switching the shipped value to `deny` is the owner's call after `warn` has run, because minting tokens is a paid feature.
  - A `bea` Git credential helper is excluded: `bea` clones only over SSH, and `.pm/DO_NOT_DO.md` ("No hosted-ledger export without SSH setup") forbids making the hosted-to-local workflow work without an SSH key.
  - This milestone does not present HTTPS as a substitute for SSH-key setup in onboarding.
