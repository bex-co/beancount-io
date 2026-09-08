---
name: qa-find-bugs-mobile
description: >-
  Hunt bugs in the running Beancount mobile app using local Expo MCP on the
  iPhone 17e simulator, sign in with QA_EMAIL and QA_PASSWORD, reproduce failures,
  trace root causes, and deduplicate findings. Use for native mobile QA. Skip
  browser-only dashboard QA, ordinary code review, and store releases.
---

# Mobile QA bug hunt

Read [the shared QA contract](../qa-shared/contract.md) first, then
`mobile/CLAUDE.md`, especially its production-write and simulator instructions.
Use **Expo MCP on iPhone 17e** unless the user names another device. A mobile
viewport in Playwright is not a substitute for exercising the native app.

Arguments: optional server URL, journey names, device name, `wN`, `SHIP=1`,
`DRY_RUN=1`. Default to the app's selected server and report mode; inspect the
selected server before signing in or writing anything.

## Boot the exact device and client

1. Record `xcrun simctl list devices available -j`, identify the **iPhone 17e**
   UDID, and record its runtime, appearance, and initial boot state. Do not use
   the first booted device as a proxy for the requested one.
2. Work inside `mobile/`. Install existing deps with
   `yarn install --frozen-lockfile` if needed. Reuse a matching Metro server or
   start plain `npx expo start --localhost`. Do not set
   `EXPO_UNSTABLE_MCP_SERVER=1`; the local binary needs no remote MCP tunnel.
3. Use the native development build `io.beancount.ios`. Check it is installed on
   the target UDID and launch it with `xcrun simctl launch <udid> io.beancount.ios`.
   If necessary, build for that device with
   `SENTRY_DISABLE_AUTO_UPLOAD=true npx expo run:ios --device <udid>`.
   Do not count Expo Go or an old native binary's missing module/permission as a
   product regression. Reusing a compatible build does not authorize copying
   credentials or another simulator's data container.
4. Start the local MCP server:

   ```sh
   node node_modules/expo-mcp/bin/expo-mcp.mjs \
     --dev-server-url http://localhost:8081 --root /absolute/path/to/mobile
   ```

   Connect through an MCP client or JSON-RPC stdio: `initialize`,
   `notifications/initialized`, `tools/list`, then `tools/call`. If the tools are
   absent from the agent's tool list, use this installed local server; no new
   dependency or hosted Expo authentication is needed. Discover its actual
   schemas rather than inventing a device argument.

5. The currently pinned Expo MCP chooses the sole booted iOS simulator and
   rejects multiple devices. Record other booted simulators, temporarily shut
   them down when appropriate for this QA session, and restore them afterward.
   If another session needs one running, report the conflict instead of silently
   tapping it. Verify the screenshot is from iPhone 17e before the first action.

## Drive and authenticate

- Use `automation_tap` with `{projectRoot, platform:"ios", testID}` or `{x,y}`,
  `automation_find_view`, `automation_take_screenshot`, and `collect_app_logs`.
  Keep screenshots under `mobile/tmp/qa-<date>/`; decode image content to a file,
  not a base64 dump in the transcript. Bound individual log captures to 10s.
- Prefer `testID` and inspected view bounds. Taps use logical points. Expo MCP
  resizes screenshots, so **do not blindly divide its image coordinates by 3**.
  Determine the native dimensions and capture scale, or use view bounds.
- Load `QA_EMAIL` / `QA_PASSWORD` from **`mobile/.env`**, unless the user supplies
  another path. Pass `--env-file mobile/.env` to the shared helper from the repo
  root (or `--env-file .env` when working inside `mobile/`). Do not reuse the
  dashboard file implicitly; the two packages may use different QA accounts.
  Keep the values inside the credential helper. Tap the native
  Sign In action, complete its browser OAuth/PKCE authorization, and verify that
  control returns to the app and survives a relaunch. Never inject a fabricated
  token/session into reactive variables to bypass the flow.
- The pinned MCP has no typing or scrolling tool. For ordinary text, the local
  Simulator hardware keyboard can be driven through `osascript` when macOS
  Accessibility access is available. Credential typing must stay in a helper
  and target a verified field. Do not assume an automation text tool exists.
- Reach otherwise inaccessible screens with inspected Expo Router deep links:
  `xcrun simctl openurl <udid> 'beancount:///(app)/<route>?param=value'`.
  Record that this proves the destination, not the navigation/scroll journey.
  Do not use malformed or fabricated ledger/transaction IDs as a valid control.
- A development warning banner is not shipped UI. Inspect its underlying log,
  dismiss it if needed, and recheck. Keep genuine runtime errors distinct from
  instrumentation limits. Simulator haptics, camera hardware and Android remain
  unverified unless separately exercised.

## Sweep whole journeys

| Journey        | Observable promise                                                                                                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| auth/server    | Server validation and connection test, sign-in/cancel/retry, browser callback, relaunch persistence, and explicit expired-session recovery work. Restore any local server setting changed during the run.       |
| discovery      | Owned/starred/discover lists, search and ledger selection land on the chosen ledger; switching clears prior ledger data. Star/unstar only when authorized and restore the initial state.                        |
| home           | Period and account controls change summaries; recent activity opens the correct transaction; empty/loading states do not flash misleading values.                                                               |
| transactions   | Search/date/type/payee/account filters compose, clear restores results, paging/refresh does not duplicate rows, detail/postings agree.                                                                          |
| entry          | On authorized disposable data: add/edit balanced postings, date, payee and narration; cancel preserves data; saving persists once after relaunch. Check keyboard and validation on iPhone 17e.                  |
| accounts       | Account hierarchy/search, picker, detail entries and balance charts agree; account creation requires authorized synthetic data.                                                                                 |
| reports/budget | Date/interval changes affect displayed reports, chart selections and budget progress. Multi-currency and no-budget states remain honest. Budget writes require the scoped permission.                           |
| merchants      | Grouped payees, exact-payee drill-down, search and totals match their transaction sets; shared chart tooltips clear on period changes.                                                                          |
| files          | Browse text files, branches, commits and diffs; navigate back; edit/save/cancel only disposable files when authorized.                                                                                          |
| settings       | Theme, locale, local server settings and supported screens work; restore initial preferences. Inspect billing, referral, notifications and account deletion without submitting external or destructive actions. |
| accessibility  | Primary controls have meaningful labels; safe areas, keyboard, dialogs and tab navigation remain usable in light/dark at this device size.                                                                      |

Wait for each journey to settle, capture evidence and relevant logs, and relaunch
before retaining a failure. Do not flip `config.features.agentChat`; its disabled
state is deliberate. Investigate source under `mobile/app/` (thin routes),
`mobile/src/screens/` (behavior), `src/common/` (Apollo, OAuth, vars, selectors),
and `src/components/`. Generated GraphQL code is evidence, not an edit target.
Trace server failures under the relevant backend package's guidance.

Apply the shared triage, root-cause, dedupe and handoff contract. State which
native journeys actually ran on iPhone 17e, which were only deep-linked, and
which need credentials, write authorization, physical hardware, or another OS.
