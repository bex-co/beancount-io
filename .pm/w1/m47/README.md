# w1 · m47 — A mail-less self-hosted stack says so on forgot-password, and the operator has a tested way to restore access

**Worker:** worker1 **Goal:** on a stack with no mail provider, the forgot-password page tells the user the server cannot send email and to ask the operator, and the operator can issue a one-time password-reset link through a documented, tested admin operation. **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Tell the dashboard whether the deployment can send email | 45m | — |
| t002 | The forgot-password page states that this server cannot send email | 40m | t001 |
| t003 | An admin operation issues a one-time password-reset link for a user | 60m | — |
| t004 | Document operator recovery and the admin API's exposure | 30m | t003 |
| t005 | Adoption surface | 20m | t002, t004 |
| t006 | Simplify | 15m | t005 |
| t007 | Test coverage | 30m | t005, t006 |
| t008 | Closeout | 10m | t007 |

## Definition of done

- On `deploy/docker-mac/` with `SELF_HOST=true` and no `SEND_GRID_API_KEY`, the forgot-password page no longer says "Email sent!"; it says the server cannot send email and names the operator, in every dashboard locale (right-to-left included).
- The operator runs the documented admin call with `ADMIN_TOKEN` and gets a one-time reset link; the user opens it, sets a new password and signs in; the link cannot be used twice. A missing or wrong `ADMIN_TOKEN` is refused.
- No reset link or token is written to logs.
- With mail configured (the managed service), the forgot-password flow and its answer for unknown addresses are unchanged, so it still reveals nothing about which accounts exist (tests prove both).
- The deploy READMEs describe the recovery steps and state that the admin API is a public surface guarded only by `ADMIN_TOKEN`.

## Source + Goal linkage

- **Source:** [ADR029](../../../docs/adrs/ADR029-deploy-self-hosting-contract.md) (`Proposed`) Finding F1 and Decision 4. `/pm-brainstorm for w1`, 2026-11-14, item 3; routed by the user via `/pmx` the same day. Per Decision 4 the admin API is operator tooling, so the REST/GraphQL/MCP parity rule does not apply to t003; any customer-facing read added in t001 does follow it.
- **Goal linkage:** **A2 — Frictionless onboarding:** mail is optional for a self-hosted stack, so recovering a forgotten password must not depend on it.
- **Expected outcome:** a self-hosted user who forgets a password is told the truth and gets back in through their operator, instead of waiting for a mail that never comes. Signals: fewer "reset email never arrived" self-host issues; self-hosted stacks kept running.
- **Why now:** the page makes a false statement on screen today, and the only workaround (`login-as`) signs the operator in as the user without restoring the user's own access. Adoption surface is included because a dashboard page and operator docs change.

## Out of scope

- Printing reset links to the API log (rejected in ADR029's alternatives: it puts a live credential in logs).
- A self-service "change password while signed in" screen.
- Moving the admin API off the public host.
