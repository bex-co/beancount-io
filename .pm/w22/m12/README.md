# w22 · m12 — `bea` signs Git in on a self-hosted stack: nothing to paste

**Worker:** worker1 **Goal:** on a self-hosted deployment, a person who has run `bea cloud login` runs `bea cloud git setup` once, and from then on plain `git clone`, `git pull` and `git push` over HTTPS sign in with no prompt and no token to copy, the way `gh auth setup-git` works for GitHub **Status:** todo (t001–t005, t009, t010, t012 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Decide the credential Git is given, and where `bea` learns the Git host — **DONE** | 1h | — |
| t012 | The server says it is self-hosted on REST, GraphQL and MCP — **DONE** | 30m | t001 |
| t002 | `bea cloud git setup`: register `bea` as Git's credential helper for one server — **DONE** | 2h | t001, t012 |
| t003 | `bea cloud git credential`: answer Git's credential protocol — **DONE** | 1h30m | t001 |
| t004 | `bea cloud logout` signs Git out too — **DONE** | 45m | t002, t003 |
| t005 | Point `bea cloud ledger clone`'s no-SSH advice at the helper — **DONE** | 30m | t002 |
| t006 | Live check on a temporary bex stack | 1h | t004, t005 |
| t007 | Release `bea` with the helper | 45m | t006 |
| t008 | Adoption surface | 45m | t007, t012 |
| t009 | Simplify — **DONE** | 30m | t008 |
| t010 | Test coverage — **DONE** | 1h | t008 |
| t011 | Closeout | 15m | t009, t010 |

## Definition of done

- On a self-hosted stack, after `bea cloud login` and `bea cloud git setup`, `git clone`, `git pull` and `git push` over HTTPS succeed with no prompt. This is run live on a temporary bex stack from a machine profile with an empty global Git config, and the stack is deleted afterwards.
- The credential Git receives can read and write ledgers and nothing more, is visible to the user (Settings → Personal access tokens, if t001 chooses a token), and stops working after `bea cloud logout`.
- On the managed service, `bea cloud git setup` refuses and points at SSH-key setup, and `bea cloud ledger clone` still never clones over HTTPS itself (`.pm/DO_NOT_DO.md`, "No hosted-ledger export without SSH setup").
- A tagged `bea` release carries the commands; `cli/docs/USAGE.md`, `deploy/bex/README.md` and PRFAQ006 describe them, and no document puts a token in a clone URL.
- `make check-all` passes in `cli/`; any backend change passes its package's checks with REST, GraphQL and MCP parity kept.

## Source + Goal linkage

- **Source:** the owner, 2026-11-18, reviewing the self-hosted beta's launch post: typing a username and pasting a token for Git "seems like a lot; is GitHub like this too?" GitHub needs a token once as well, but `gh auth setup-git` and Git Credential Manager let a signed-in user skip even that. The owner asked for `bea` to do the same, and for the launch post to be written assuming it does.
- **Evidence:** the Git proxy takes only HTTP Basic, with a `bcio_` personal access token or an account password as the password (`backend-cluster/backend-v2/src/features/gitea/api/git-proxy-handler.ts`, `gitCredentialKind`); `cli/src` has no Git credential helper (no `git-credential`, `credential.helper` or `GIT_ASKPASS`); on a bex stack, which routes no SSH, a user today makes a token in Settings and pastes it at Git's first prompt (PRFAQ006 question 4).
- **Goal linkage:** A2 (frictionless onboarding): a self-hoster gets from sign-in to a local clone with no token handling. A1 (agent-native): a coding agent working in a clone pulls and pushes without a secret in its environment or a URL.
- **Expected outcome:** a self-hosted user signed in with `bea` clones, pulls and pushes with plain `git` and is never asked for a password; no long-lived token ends up in a clone URL, a `.git/config` or shell history.
- **Why now:** the self-hosted beta's launch post already tells readers to run `bea cloud git setup`, so the post cannot be published until this ships.
- **Constraints:** the managed service keeps requiring an SSH key for hosted-to-local ledger workflows, and `bea cloud ledger clone` keeps cloning over SSH only (`.pm/DO_NOT_DO.md`, user decisions 2026-09-27 and 2026-11-17). A credential helper does not clone; Git does.
- **Adoption surface:** included, because the milestone ships CLI commands and changes the documents a self-hoster follows to get a local clone.
