# Deploy the hard-coded app-link files so AASA stops 404ing

After w4/m5, backend-v2 serves `/.well-known/apple-app-site-association` only when `APP_LINKS_APPLE_TEAM_ID` is set. Production still returns 404 (checked 2026-09-09), so https Universal Links cannot verify on device/simulator until ops sets `APP_LINKS_APPLE_TEAM_ID=PTLM7BZQMM` (and later `APP_LINKS_ANDROID_SHA256` for Play App Signing) on the hosted backend-v2. Public values; no secret.

## Blocked

**Blocked 2026-09-14 by `/loop-worker w4` triage.** Still reproduces: `https://beancount.io/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` both return HTTP 404 on 2026-09-14. The repository side shipped with w4/m5. What remains is an operations change on the hosted backend (set `APP_LINKS_APPLE_TEAM_ID`, and later `APP_LINKS_ANDROID_SHA256` for Play App Signing), which this worker cannot make from the repository.

**Unblock:** set the variables on the hosted backend-v2 deployment, confirm both well-known files return 200 with the expected JSON, then move this note back to `.pm/w4/001.md` or close it as done. The related device check is `w4/018`.

## Extended by w4/018

Folded in on 2026-09-14 from `w4/018`, which reported the same missing hosted configuration as a residual of `w4/done/m5` and was dropped as a duplicate. It adds:

- **Observed impact** (2026-09-13, iPhone 17e / iOS 26.5): with the app warm, `xcrun simctl openurl … 'https://beancount.io/ledger/open_ledger/minimax'` opens Safari on the web dashboard. With the app cold, the previously selected ledger stays selected. The custom-scheme link `beancount:///ledger/open_ledger/minimax` switches ledgers correctly, so in-app routing works and only the https association is missing. The in-app Share and Copy link actions produce https URLs, which currently open in the browser.
- **The 404 is deliberate while unset:** `backend-cluster/backend-v2/src/features/well-known/api/well-known-route.ts` returns 404 without `APP_LINKS_APPLE_TEAM_ID`, so a self-hosted deployment without a native build does not advertise an association it cannot honour. Do not change that.
- **Extended acceptance:** after the variables are set, both well-known URLs return 200 with `application/json` (they currently return `text/plain` 404s), and `xcrun simctl openurl` with the https minimax URL opens the app on minimax. A private ledger the account cannot read should fall back to the browser with the current selection intact. Apple's and Google's association validators should pass. Because the entitlement needs a native rebuild, the physical-device Universal Link check that `w4/done/m5` deferred is recorded after the next store build.

## No configuration needed anymore (2026-10-27)

User decision: the app-link identity is not deployment configuration. Customers rarely ship their own store build, the bundle id and package were already hard-coded, and both values are public. `406bd8d15` hard-codes Apple team `PTLM7BZQMM` and the Play App Signing certificate SHA-256 `3C:7A:97:CF:EA:DE:C4:36:2C:65:DC:A8:09:36:03:7C:CF:3D:63:1F:D7:E7:EA:87:6F:41:6E:98:96:66:71:51` <!-- gitleaks:allow --> (as Play Console's Deep links page generates it for `io.beancount.android`) in backend-v2's well-known route, served unconditionally. `2210d9877` removes the `APP_LINKS_*` passthrough from the deploy targets. The apps only claim `beancount.io` (`mobile/app.json`), so a self-hosted domain serving the same files associates nothing. The earlier "unset → 404" policy is retired. Play Console still lists beancount.io as an unverified domain until the files are live.

**Unblock (updated):** deploy backend-v2 at or after `406bd8d15` to beancount.io. Then confirm both `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` return 200 with `application/json`, and that Play Console's Deep links page verifies beancount.io. Then run the simulator `openurl` check above and close this note. **Who:** whoever deploys production backend-v2. The physical-device check still follows the next store build.

---

**Resolved 2026-10-27** — After the production backend-v2 deploy of `406bd8d15`, `https://beancount.io/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` both return 200 `application/json` with the hard-coded team `PTLM7BZQMM.io.beancount.ios` on `/ledger/*` and the `io.beancount.android` Play App Signing fingerprint. Google's Digital Asset Links API (`statements:list` for `https://beancount.io`) returns that `handle_all_urls` statement, and Apple's AASA CDN (`app-site-association.cdn-apple.com/a/v1/beancount.io`) serves the same file. Simulator check (iPhone 17e, iOS 26.5): the previously installed build `1.20260906.47` predates the `applinks:beancount.io` entitlement (`2a464bbc8`), so it correctly opened Safari. A fresh local debug build `1.20261002.50` carrying the entitlement opened `https://beancount.io/ledger/open_ledger/minimax` cold in the app, not Safari, and landed on the MiniMax ledger (net worth 1,346.683 MUSD, matching the web page). The local build needed `SENTRY_DISABLE_AUTO_UPLOAD=true` because the ignored, generated `ios/` project still runs the removed Sentry upload phase. Physical-device Universal Links still follow the next store build. Shipped in `406bd8d15` (`backend-v2`) and `2210d9877` (`deploy`).
