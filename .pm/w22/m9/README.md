# w22 · m9 — One-click "Deploy to bex" for the self-hosted stack

**Worker:** worker1 **Goal:** a person clicks a badge in this repository's README and gets a running, signed-in-capable beancount.io stack in their own bex workspace, answering only the few questions that cannot be generated **Status:** todo (t001–t002 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Derive the public URLs instead of hard-coding them — **DONE** | 2h | — |
| t002 | Cut the deploy form to the values a person must supply — **DONE** | 1h30m | t001 |
| t003 | Point the button at a manifest bex finds, and put it in the README | 45m | t001, t002 |
| t004 | Verify the button end to end from a clean workspace | 1h | t003 |
| t005 | Adoption surface | 30m | t003 |
| t006 | Simplify | 30m | t005 |
| t007 | Test coverage | 1h | t005 |
| t008 | Closeout | 15m | t006, t007 |

## Definition of done

- The root `README.md` carries a "Deploy to bex" badge whose link opens the Blueprint wizard prefilled and valid.
- `bex.yaml` and `dashboard/.env.production` contain no hard-coded `onbex.co` host, and the stack signs a user in on whatever host bex assigns, including a collision-suffixed one.
- A clean-workspace preview asks for no more than the inputs a newcomer must decide (no duplicated tokens, no optional integration).
- A deployment made through the badge into a scratch workspace passes the browser checklist (sign-up, signed-in landing, cookie, refresh, fresh-browser login, first ledger) and was torn down.
- Managed beancount.io behavior is unchanged: each new switch is off unless set, and the existing suites pass.

## Source + Goal linkage

- **Source:** the owner's request to offer a "Deploy on Render"-style badge for bex, after the w22/m7 one-click checklist and the w22/m8 self-host switch. Research on 2026-11-07 found that bex already ships the button (a `/deploy?repo=` route and a badge asset) and that this repository's Blueprint previews valid in a clean workspace; what blocks one click is on this side (hard-coded hosts, 15 required inputs).
- **Goal linkage:** A2 (frictionless onboarding) for the deployment path, and A3 (community & distribution): a badge in the README is the lowest-friction way for a stranger to try the product on their own infrastructure.
- **Expected outcome:** anyone who finds the repository can start their own instance from the README without reading a deployment guide first, and a template-style listing of the repository on bex becomes possible.
- **Why now:** m7 and m8 removed the mail and plan blockers, and the platform side already exists; the remaining work is entirely here and is small enough to finish before the Blueprint drifts again.
- **Adoption surface:** included, because the milestone ships a README entry point and deployment docs that humans and agents follow.
- **Platform follow-ups** (a public docs page for the button, and a check that the link survives sign-up and the payment gate for a new account) are tracked on the bex platform's own board, not here.

## Known limits

- The hosted service charges for the resources it creates (about 33 USD a month at the current Starter plans); the badge must say so.
- The link names a branch; it should point at `main` once `bex-deploy` is merged, which is the owner's call.
