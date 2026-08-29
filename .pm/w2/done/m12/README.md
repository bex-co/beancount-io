# w2 · m12 — Minimal centralized authz for mobile user deletion

**Worker:** worker2 **Goal:** let the existing mobile account-deletion mutation authorize self-deletion through one lightweight backend decision without changing client contracts or unrelated authorization behavior **Status:** done

## Tasks (in order)

| id   | title                                                                | est | depends_on |
| ---- | -------------------------------------------------------------------- | --- | ---------- |
| t001 | Create the minimal centralized `authorize()` seam — **DONE**         | 35m | —          |
| t002 | Route the existing `deleteAccount` mutation through authz — **DONE** | 35m | t001       |
| t003 | Remove parallel account-deletion policy checks — **DONE**            | 25m | t002       |
| t004 | Adoption surface — **DONE**                                          | 20m | t003       |
| t005 | Simplify — **DONE**                                                  | 15m | t004       |
| t006 | Test coverage — **DONE**                                             | 35m | t004       |
| t007 | Closeout — **DONE**                                                  | 10m | t005, t006 |

## Definition of done

- The existing argument-free `Mutation.deleteAccount` works for an authenticated mobile OAuth user and no longer fails at the session-only scope gate.
- The resolver derives `user:<id>` from the authenticated identity and makes exactly one `authorize(user.delete, user:<id>)` call before any deletion side effect.
- Browser-session and OAuth user credentials may delete only their own user resource; API keys, cross-user resources, unknown actions, and relationship-evaluator failures deny.
- User deletion has no `MOBILE_CLIENT_ID`, ledger scope, ledger pin, ledger role, or `ledger.admin` dependency.
- The implementation adds no step-up flow, deletion grant, Redis state, OAuth purpose, new dependency, OpenFGA runtime, or second policy DSL.
- Existing mobile and dashboard GraphQL operations remain unchanged, and unrelated operation classes and account behavior keep passing their tests.
- Backend formatting, typecheck, build, focused/full tests, authz model validation/tests, and agent-guidance validation pass.

## Source + Goal linkage

- **Source:** user report 2026-08-28: mobile `deleteAccount` fails with `ApolloError: This operation is not part of the API scope vocabulary and is reachable only from a browser session (GQL Mutation.deleteAccount)`.
- **Goal linkage:** **A2 — Frictionless onboarding** — first-party mobile users can manage the complete identity lifecycle without a browser-only dead end.
- **Expected outcome:** the existing mobile mutation reaches one centralized self-user decision and then the unchanged account-deletion behavior; denied requests perform no account work.
- **Why now:** the current session-only classification blocks a supported client, while a client-id or ledger-admin exception would encode the wrong authority boundary.
- **Adoption surface:** included — backend/authz contributor documentation changes; mobile UI, translations, and GraphQL contracts do not.
