# ADR 013: Verified https redirect URIs for the native mobile client

- Status: Rejected (2026-10-03) — the mobile app keeps its custom-scheme redirects and the approve step stays for every client. See [Why it is not being done](#why-it-is-not-being-done).
- Date: 2026-09-11
- Decision owners: Mobile (`mobile/`), Backend (`backend-cluster/backend-v2`), Dashboard (`dashboard/`)
- Scope: whether `beancount-mobile` should redirect OAuth authorization responses to a claimed `https://` URL (iOS Universal Links, Android App Links) instead of the custom schemes `io.beancount.ios:/oauth/callback` and `io.beancount.android:/oauth/callback`, and whether that would let the dashboard drop the approve step.

## Context

The native client is registered with two custom-scheme redirect URIs (`backend-cluster/backend-v2/src/features/oauth/data/config.ts`, mirrored in `mobile/src/common/oauth/discovery.ts`). Any app on the device can claim a custom scheme, so RFC 8252 §8.6 asks the authorization server to obtain end-user interaction before redirecting to one. The dashboard mobile interaction page therefore requires an explicit approve step (and, for a signed-in browser on Sign Up, a continue-as / create-different-account choice) before posting the grant (`dashboard/src/features/oauth/pages/mobile-consent.tsx`).

RFC 8252 §7.2 recommends claimed https redirects instead: the platform verifies the app's identity against a file the site publishes, so only the genuine app can receive the response and the interaction requirement no longer applies.

## What was proposed

Adopt `https://beancount.io/oauth/callback` as the redirect for store builds talking to the hosted origin on iOS 17.4+ and Android, and let the dashboard skip the approve / continue-as interaction for requests arriving with that redirect URI. The custom schemes would stay registered for self-hosted origins, older iOS, and links opened outside an auth session.

The investigation found the proposal feasible but narrow:

- **Most of the platform side exists.** `mobile/app.json` declares `applinks:beancount.io` and an `autoVerify` intent filter; backend-v2 serves `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` (`backend-cluster/backend-v2/src/features/well-known/api/well-known-route.ts`, indexed in [ADR009](./ADR009-backend-v2-well-known-paths.md)); and the app already classifies an https URL ending in `/oauth/callback` as an OAuth callback (`mobile/src/common/app-links/oauth-callback-url.ts`). The vouchers and the intent filter cover `/ledger` paths only and would need widening.
- **iOS needs 17.4+.** `expo-web-browser` 57 completes an https callback through `ASWebAuthenticationSession` only on iOS 17.4 or later; older versions would need a runtime branch back to the custom scheme.
- **Self-hosted origins cannot use it.** Universal Links and App Links bind a specific host into the app binary, so the store build can never receive an https redirect for a self-hoster's domain. The custom-scheme path, with its interaction requirement, would remain a first-class configuration indefinitely.
- **It costs a second supported flow.** The backend would register a conditional third redirect URI and move the interaction requirement from "native client" to "custom-scheme redirect"; the dashboard would serve an `/oauth/callback` return page; the mobile launcher would choose a redirect per server and OS and fall back when a Universal Link fails to verify; and both flavors would need tests and signed-build verification on each platform.

## Why it is not being done

- **The status quo is good enough.** The whole payoff is one fewer tap for a signed-in hosted user re-authenticating the app. That does not justify a second redirect flavor, a per-OS runtime branch, and a verification chain that degrades silently when a voucher breaks.
- **Skipping consent contradicts [ADR 019](./ADR019-backend-v2-mcp-host-compatibility.md) D3.** D3 relies on oidc-provider's `native_client_prompt` so that every authorization by a native client shows consent, and it rejects inferring the rule from redirect URIs precisely because hosts with `https` redirects would then skip the screen. Moving the interaction requirement onto the redirect URI, as this proposal needed, is that inference.
- **The approve step is the contract.** Commit `ed6ad635` ("revert(w1/m7): restore mobile consent UI and delete the milestone") removed a first-party no-consent sign-in path so that the approve step and its documentation are the only contract again. This proposal would have reopened what that revert closed.

## Consequences

- `beancount-mobile` keeps exactly two redirect URIs, both custom-scheme, on hosted and self-hosted origins alike; mobile discovery and the backend client catalog stay as they are.
- Every authorization — first-party or third-party — keeps an explicit end-user interaction.
- The app-links vouchers and the Android intent filter stay scoped to `/ledger` deep links. `/oauth/callback` is not a dashboard route.
- Revisit only if a platform stops honoring custom-scheme redirects for OAuth.
