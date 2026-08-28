# w1 · m7 — First-party sign-in without a consent screen

**Worker:** worker1 **Goal:** no mobile sign-in or sign-up path ever shows a permission list or an Approve/Cancel pair; password or OTP success returns to the app with no further tap, and a browser that already holds a session needs exactly one **Status:** todo

## Tasks (in order)

| id   | title                                                                                  | est | depends_on |
| ---- | -------------------------------------------------------------------------------------- | --- | ---------- |
| t001 | Dashboard: submit the grant immediately after login or OTP success                     | 45m | —          |
| t002 | Dashboard: one-tap "Continue as" for a signed-in browser; retire the scope list        | 30m | t001       |
| t003 | Backend + docs: pin the no-consent-UI contract and keep `prompt=consent` on the wire   | 30m | t001       |
| t004 | Verify every path end to end in the iOS simulator against the hosted service           | 30m | t002, t003 |
| t005 | Adoption surface                                                                       | 20m | t004       |
| t006 | Simplify                                                                               | 30m | t005       |
| t007 | Test coverage                                                                          | 45m | t005       |
| t008 | Closeout                                                                               | 15m | t007       |

## Definition of done

- No mobile interaction page renders a scope list, a "wants access" line, or an Approve/Cancel pair.
- A signed-out browser: password sign-in or registration + OTP returns to the app with no further tap; the only interstitial is a brief "Returning to Beancount…" state.
- A signed-in browser: exactly one tap — "Continue as <email>" — returns to the app; "Use another account" is still available.
- Refresh tokens are still issued (the existing `offline_access` case in `oidc-route.test.ts` passes) and the idle-based session lifetime from `backend-v2` is unaffected.
- Cancelling by dismissing the browser still returns the app to the welcome screen without a session.
- `mobile/README.md` and `backend-cluster/backend-v2/README.md` state the first-party no-consent contract and why `prompt=consent` stays in the request.
- Dashboard, mobile, and backend-v2 test gates pass.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-08-27 — "sign-in should not show a consent screen; this is a first-party app". Research found the provider's `native_client_prompt` check forces a consent *prompt* for native clients and that dropping `prompt=consent` silently strips `offline_access`, but the dashboard already resolves login and consent in one interaction POST, so the consent *screen* can go without any provider-policy change.
- **Goal linkage:** A2 — Frictionless onboarding: removes a screen and a decision from every first run. Secondary A3: the app stops looking like a third-party integration of its own service.
- **Expected outcome:** hosted and self-hosted mobile users go browser → app with zero permission prompts; self-hosters get an honest, documented reason for the `prompt=consent` parameter they will see in logs.
- **Why now:** cheap because the dashboard owns both prompts in a single POST; sequenced after m6 because both milestones edit `mobile-consent.tsx` and m6 introduces the signed-in-plus-sign-up branch this milestone collapses into the one-tap step. The one remaining tap is deliberate — RFC 8252 §8.6 wants end-user interaction for custom-scheme redirects, which any app on the device can claim; see inbox note `w1/001` for the verified-https path that would make it removable.
- **Adoption surface:** included — the README contract text changes in `mobile/` and `backend-v2/`.
