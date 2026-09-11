# ADR 013: Verified https redirect URIs for the native mobile client

- Status: Proposed — written recommendation from inbox note `w1/001`; becomes a milestone when promoted
- Date: 2026-09-11
- Decision owners: Mobile (`mobile/`), Backend (`backend-cluster/backend-v2`), Dashboard (`dashboard/`)
- Scope: whether `beancount-mobile` should redirect OAuth authorization responses to a claimed `https://` URL (iOS Universal Links, Android App Links) instead of the custom schemes `io.beancount.ios:/oauth/callback` and `io.beancount.android:/oauth/callback`, what that changes on hosted and self-hosted origins, and what it would let the dashboard drop.

## Context

The native client is registered with two custom-scheme redirect URIs (`backend-v2/src/features/oauth/data/config.ts`, mirrored in `mobile/src/common/oauth/discovery.ts`). Any app on the device can claim a custom scheme, so RFC 8252 §8.6 asks the authorization server to obtain end-user interaction before redirecting to one. That is why w1/m7 kept exactly one **Continue as <email>** tap on the dashboard's mobile interaction page for a browser that already holds a session (`dashboard/src/features/oauth/funcs/mobile-consent-state.ts`), even though every other consent UI was removed.

RFC 8252 §7.2 recommends claimed https redirects instead: the platform verifies the app's identity against a file the site publishes, so only the genuine app can receive the response and the interaction requirement no longer applies. The question is whether the stack can adopt them, and for whom.

## Findings

### The platform side already exists for deep links

- `mobile/app.json` declares `associatedDomains: ["applinks:beancount.io"]` for iOS and an `autoVerify` intent filter for `https://beancount.io/ledger*` on Android.
- backend-v2 serves `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` (`features/well-known/api/well-known-route.ts`, indexed in [ADR009](./ADR009-backend-v2-well-known-paths.md)) whenever `APP_LINKS_APPLE_TEAM_ID` / `APP_LINKS_ANDROID_SHA256` are set. Both vouchers currently cover `/ledger/*` only.
- The mobile app already classifies an https URL ending in `/oauth/callback` as an OAuth callback (`mobile/src/common/app-links/oauth-callback-url.ts`), so link routing needs no new branch.

Adding the redirect therefore means widening two path lists (AASA `paths`, the Android intent filter) and adding one path to the backend voucher, not building a verification chain from scratch.

### iOS return path: solved by the library on iOS 17.4+

`expo-web-browser` 57 (`ios/WebAuthSession.swift`) constructs `ASWebAuthenticationSession` with `callback: .https(host:path:)` when `preferUniversalLinks` is passed and the redirect is https on iOS 17.4 or later; the session then completes exactly as it does for a custom scheme, so `openAuthSessionAsync` still resolves with the callback URL and `createAuthorizationLauncher` is unchanged. Below iOS 17.4 the library falls back to `callbackURLScheme`, which cannot intercept an https redirect: the Universal Link would open the app through `Linking` while the session sheet stays up. The app must therefore keep choosing the custom-scheme redirect on iOS < 17.4 (a runtime check next to `currentOAuthRedirectUri`), or raise the deployment target.

### Android return path: works as-is

Chrome Custom Tabs honor verified App Links on the authorization server's final redirect, so `https://beancount.io/oauth/callback?code=…` launches the app and `openAuthSessionAsync` resolves with that URL. The intent filter must cover `/oauth/callback` (today it covers only `/ledger`), and the release-signing SHA-256 must be in `assetlinks.json` — the `APP_LINKS_ANDROID_SHA256` variable already exists for that.

### Self-hosted origins cannot be verified by the store build

Universal Links and App Links bind a specific host into the app binary: `applinks:beancount.io` is an entitlement signed at build time, and the Android intent filter's host is compiled into the manifest. A self-hoster's origin is not in either list, so no voucher they publish can make the store build receive an https redirect for their domain. Their only options are to keep the custom-scheme redirect or to build and sign their own app with their host in `app.json` (and then publish the vouchers below). This is the decisive constraint: verified https redirects are a hosted-origin feature; the custom-scheme path must remain a first-class client configuration, and the one-tap **Continue as** step must remain for it.

### What the backend needs

- Register a third redirect URI for the `beancount-mobile` client: `https://beancount.io/oauth/callback` on the hosted deployment. Because self-hosted issuers keep the custom schemes, the https entry should be derived from the deployment's dashboard origin and only added when the app-links environment variables are set, matching how the vouchers themselves appear.
- Serve `/oauth/callback` on the dashboard origin as a plain page. Universal Links open the app only when the link is followed from another app or a redirect; a user who lands on the URL in Safari itself sees the page, which should say "Return to the Beancount app" and offer the custom-scheme URL as a manual fallback.
- Let the provider skip the interaction requirement only when the request's `redirect_uri` is the claimed https one. The `native_client_prompt` policy noted in w1/m7 keys on the client being native; the check has to move to the redirect URI, so a custom-scheme request from the same client still gets the tap.

### What a self-hoster would have to publish (only if they build their own app)

- `https://<their-origin>/.well-known/apple-app-site-association` listing `<their-team-id>.<their-bundle-id>` with `/oauth/callback` (and `/ledger/*`) in `paths`, served as `application/json` without redirects.
- `https://<their-origin>/.well-known/assetlinks.json` with their package name and signing-certificate SHA-256 fingerprints.
- Both are already generated by backend-v2 from `APP_LINKS_APPLE_TEAM_ID` and `APP_LINKS_ANDROID_SHA256`; the bundle identifier and package name would additionally have to become configurable, since `well-known-route.ts` hardcodes `io.beancount.ios` / `io.beancount.android`.
- Their `app.json` must name their origin in `associatedDomains` and the intent filter, and their build must be signed with the key whose fingerprint they published.

The `deploy/docker/.env.example` and `deploy/docker-mac/.env.example` comments already describe the two variables; they would gain the bundle/package variables and a note that these only matter for a self-built app.

## Recommendation

**Yes, for the hosted origin; keep custom schemes for everyone else.** Adopt `https://beancount.io/oauth/callback` as the redirect for store builds talking to `https://beancount.io` on iOS 17.4+ and Android, and drop the **Continue as** tap for requests that arrive with that redirect URI. Keep `io.beancount.ios:/oauth/callback` and `io.beancount.android:/oauth/callback` registered and selected whenever the chosen server is not the hosted origin, the OS cannot intercept an https callback, or the user opened the link outside an auth session; those requests keep the one-tap interaction exactly as m7 built it.

The adoption payoff is one fewer tap on the most common path (a signed-in hosted user re-authenticating the app) plus a stronger security story to cite in the README. The cost is bounded because the vouchers, the app-links config, and the callback classification already exist. It is not worth restructuring the self-hosted contract for: self-hosters get nothing from it unless they ship their own binary.

### Milestone outline (when promoted)

1. Backend: add the https redirect URI to the mobile client on hosted deployments; widen the AASA/asset-links vouchers to `/oauth/callback`; move the interaction requirement from "native client" to "custom-scheme redirect"; update ADR009's path table.
2. Dashboard: serve `/oauth/callback` as the app-return page with a manual custom-scheme fallback; skip the **Continue as** step only for https redirects.
3. Mobile: choose the redirect per server and OS (`currentOAuthRedirectUri`), pass `preferUniversalLinks` to `openAuthSessionAsync`, extend the Android intent filter, and keep the custom-scheme path tested.
4. Deploy: document `APP_LINKS_*` for the callback and the self-built-app caveat; verify end to end on a signed iOS build (Universal Links do not verify in the simulator) and a Play-signed Android build.
5. Standing closing tasks per `.agents/skills/pm/SKILL.md`.

## Consequences

- Two redirect flavors stay supported indefinitely; tests must cover both, and the interaction-page copy must not claim the tap is gone universally.
- Universal Link verification depends on Apple's CDN fetching the AASA file; a broken voucher silently degrades to the custom-scheme path only if the app falls back on failure, so the launcher needs a timeout-and-retry-with-custom-scheme branch rather than assuming the https callback will arrive.
- Raising the iOS deployment target to 17.4 would remove the runtime branch; that is a product decision outside this ADR.
