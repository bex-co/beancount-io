# w22 · m9 — One-click "Deploy to bex" for the self-hosted stack

**Worker:** worker1 **Goal:** a person clicks a badge in this repository's README and gets a running, signed-in-capable beancount.io stack in their own bex workspace, answering only the few questions that cannot be generated **Status:** todo (t001–t003, t005–t007 done; t004 blocked)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Derive the public URLs instead of hard-coding them — **DONE** | 2h | — |
| t002 | Cut the deploy form to the values a person must supply — **DONE** | 1h30m | t001 |
| t003 | Point the button at a manifest bex finds, and put it in the README — **DONE** | 45m | t001, t002 |
| t004 | Verify the button end to end from a clean workspace — **blocked** | 1h | t003 |
| t005 | Adoption surface — **DONE** | 30m | t003 |
| t006 | Simplify — **DONE** | 30m | t005 |
| t007 | Test coverage — **DONE** | 1h | t005 |
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

## Blocked

**Blocked 2026-11-08** — t004, and with it this milestone's definition of done (the browser checklist on a deployment made through the badge). Nothing else in the milestone waits on it: t005 to t007 proceed; t008 cannot close the milestone until t004 is unblocked.

- **What was tried:** three deploys of the Blueprint into a clean second workspace, where the service names were already held, so every hostname carried a collision suffix. The last one was made exactly as the badge would, with no inputs.
- **What worked there:** the Blueprint created with nothing to fill in; the dashboard served its own suffixed address; the OAuth issuer was that address; the dashboard reached the API through its proxy; the API started and went live, which means the public-address, internal-address and signing-key steps all ran on suffixed hostnames.
- **What did not:** Gitea, which sign-up needs, never came up there. The first runs exposed a real ordering fault: Gitea's schema was created by the API's migration step, the API's build queued behind the others, and bex marks a rollout that misses its deadline as failed without retrying it. That is fixed on `main` (the Gitea wrapper creates its own schema, tested against a real Postgres; the API-side step was removed). The fix has **not** been confirmed on the platform: the one in-platform attempt with it could not reach Postgres from the pod for 17 minutes for a reason not yet known, and its replacement, which prints the reason, sat in the build queue for 35 minutes without starting.
- **Platform behavior seen, not caused by this change:** deploys in that workspace stayed `queued` for 20 to 35 minutes; the Blueprint sync and create calls intermittently answered 500 or 502 (create once left a half-made service behind); a manual deploy without a commit replays the previous image instead of building. These are reported on bex's own board.
- **Unblock:** a clean deploy of `main` into a workspace where the names are taken reaches all four services live in the platform's normal build times. Then read the Gitea logs for `schema gitea ensured` (or the reason it is not), run the browser checklist from t004 (sign-up, signed-in landing, cookie, refresh, a fresh-browser login, first ledger, on a suffixed host), and tear everything down with a 404 proof for each resource. The Blueprint takes no inputs now, so the deploy needs nothing prepared.
- **Who can clear it:** the bex platform for the build queue and control-plane errors; this repository for acting on the Gitea wrapper's message once a build runs.
- **Baseline shipped:** t001 to t003 are done and on `main`; the scratch deployment was torn down and each resource confirmed gone.
- **Correction to t001's record:** its Done section says migrations create the `gitea` schema through `ENSURE_SCHEMAS`. That mechanism was removed once the ordering fault was found; Gitea's own wrapper now does it. t001's text is history and is left as written.
