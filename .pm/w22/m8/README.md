# w22 · m8 — Self-hosted deployments: no verification page, no plan limits

**Worker:** worker1 **Goal:** an operator who runs the whole stack for their own users sets one switch, `SELF_HOST=true`, and their users sign up without any email step and without plan limits **Status:** todo (t001–t006 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | `SELF_HOST` switch and the unlimited tier — **DONE** | 1h | — |
| t002 | Sign-up answers signed in; the verification page never appears — **DONE** | 2h | t001 |
| t003 | Deployment config and docs — **DONE** | 45m | t001 |
| t004 | Adoption surface — **DONE** | 30m | t003 |
| t005 | Simplify — **DONE** | 30m | t004 |
| t006 | Test coverage — **DONE** | 1h | t004 |
| t007 | Closeout | 15m | t005, t006 |

## Definition of done

- With `SELF_HOST=true`, a browser sign-up sends one `SignUp` request, never shows a verification page, lands signed in, and the user can create more ledgers than the Free tier allows. With the variable unset or any value other than `true`, sign-up and every limit behave exactly as before.
- The retired `AUTH_SKIP_EMAIL_VERIFICATION` accepted any code; nothing replaces that: the public verify endpoints still check the real code.
- The switch is documented where an operator reads it (bex README, compose env examples, backend README) and the root `AGENTS.md` describes the bex target accurately.
- `yarn typecheck` and `yarn test` pass in `backend-cluster/backend-v2/` and `dashboard/`; the `surface-parity` gate and the OpenAPI snapshot are unchanged.
- Verified end to end in a browser on a real self-hosted deployment (done on the bex canary: signed in with no code page, four ledgers created).

## Source + Goal linkage

- **Source:** the one-click bex deployment work in w22/m7 (an owner-written checklist). Its canary had no mail provider, which exposed that a self-hoster has neither a mail provider nor a reason to meter their own users.
- **Goal linkage:** A2 (frictionless onboarding) — a self-hosting operator goes from a deployed stack to users signing up in one step, with no mail setup. This is a full self-host, not a half one: the operator runs the dashboard and the API together, which `.pm/DO_NOT_DO.md` allows.
- **Expected outcome:** anyone who deploys the stack for their own team or customers can register and use it immediately instead of hitting a mail error or a one-ledger cap.
- **Why now:** without it the self-hosted sign-up is dead on arrival for any deployment without a SendGrid key, and the interim any-code flag was a security hole worth closing.
- **Adoption surface:** included, because operators and agents read these deployment docs and guidance files.

## Known limits

- Email addresses are not verified, so anyone who can reach the URL can register; forgot-password and other mail still need a mail provider.
- The mobile app and managed service are untouched: the new `SignUpResponse` fields are optional and `SELF_HOST` is never set there.
