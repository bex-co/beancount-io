# w1 · m6 — Native sign-up lands on registration; welcome screen loses the browser explainer

**Worker:** worker1 **Goal:** a newcomer who taps **Sign Up** on the mobile welcome screen is taken straight to a registration form in the system browser and returns to the app signed into the account they just created; the welcome screen stops explaining browsers **Status:** done — closed 2026-08-28. Verified on hosted: Sign Up → registration, Sign In → login, dismiss, signed-in browser → account choice. Verified on the local `deploy/docker-mac` stack built from `main`: fresh sign-up → OTP → app signed in, Approve → app (hosted needs the backend-v2 redeploy for those two; fix shipped in `321f870`). Two pre-existing m5 defects found and fixed during closeout: hosted `Query.userProfile` refused OAuth tokens (`session-only`), and the cold/deep-link callback route never completed (`Linking.useURL()` null under Expo Router). Follow-up filed: `w1/003` (`Query.getFeed` is still session-only, so Home's feed is refused for OAuth sessions).

## Tasks (in order)

| id   | title                                                                                      | est | depends_on   |
| ---- | ------------------------------------------------------------------------------------------ | --- | ------------ |
| t001 | Backend: accept and forward a `screen_hint=signup` authorization parameter for the mobile client | 30m | —            | — **DONE**
| t002 | Mobile: emit `screen_hint=signup` from the pending sign-up flow                            | 30m | —            | — **DONE**
| t003 | Dashboard: open the mobile interaction on the register step for a sign-up hint             | 45m | t001         | — **DONE**
| t004 | Dashboard: first-party copy and a lighter in-interaction register step                     | 30m | t003         | — **DONE**
| t005 | Mobile welcome: drop the browser explainer, flow-aware failure copy, purge dead auth keys   | 30m | t002         | — **DONE**
| t006 | Adoption surface                                                                           | 30m | t004, t005   | — **DONE**
| t007 | Simplify                                                                                   | 30m | t006         | — **DONE**
| t008 | Test coverage                                                                              | 45m | t006         | — **DONE**
| t009 | Closeout                                                                                   | 15m | t008         | — **DONE**

## Definition of done

- From a fresh iOS simulator with no browser session, tapping **Sign Up** opens the system browser directly on the registration form (not the login form); completing OTP returns to the app signed into the *new* account with a default ledger selected.
- Tapping **Sign In** opens the login form, as today.
- With an existing browser session, tapping **Sign Up** shows an explicit choice ("Continue as <account>" / "Create a different account") and never silently signs the app into the existing account.
- The authorization request for a sign-in tap carries no `screen_hint`; the request for a sign-up tap carries exactly `screen_hint=signup`, the provider forwards it to the interaction URL, and any other value is dropped (not rejected — it is a display hint, and an app newer than a self-hosted server must still get a login form).
- The welcome screen shows no "opens your browser" explainer; the failure line under Sign Up says sign-up failed, not sign-in; the ten unused legacy auth translation keys are gone from all 13 locales.
- `yarn test` in `mobile/` and `dashboard/` and the backend-v2 test suite pass, including new cases for the hint on all three sides.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-08-27 — user report "mobile sign-up is broken", reproduced against the hosted service: both welcome buttons issue byte-identical authorization requests because `pending.flow` is stored but never emitted (`mobile/src/common/oauth/authorization-url.ts`), the provider forwards only `uid` and `scope` to the interaction page, and the dashboard route accepts only those two.
- **Goal linkage:** A2 — Frictionless onboarding. The store-install → first ledger path is blocked at its first screen for anyone without an account. Secondary A3: the first-run experience is the app's public face.
- **Expected outcome:** a newcomer creates an account from the phone in one uninterrupted flow and lands in the app; the welcome screen reads as an app, not as an OAuth tutorial.
- **Why now:** the native flow shipped in the m5 series with the sign-up intent captured but never sent; every day it is live costs store-installing newcomers. It does not depend on m5's remaining tasks; m5's deployment-contract verification (t011) should exercise the new parameter.
- **Adoption surface:** included — the `screen_hint` parameter changes the documented mobile OAuth contract in `mobile/README.md` and the provider description in `backend-cluster/backend-v2/README.md` that self-hosters read.
