# w4 · m5 — Ledger links open in the app

**Worker:** worker1 **Goal:** a `beancount.io/ledger/...` URL shared to a phone opens the native app on that ledger when the app is installed, and the app can share links that round-trip **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Serve the iOS and Android app-link files from the well-known route | 45m | — |
| t002 | Declare associated domains and Android app-link intent filters | 30m | — |
| t003 | Web path to app route resolver | 50m | — |
| t004 | Handle incoming links in the root layout, through sign-in | 45m | t002, t003 |
| t005 | Share and copy the canonical ledger link from the app | 35m | t003 |
| t006 | Smart App Banner on public ledger pages | 25m | t001 |
| t007 | Adoption surface | 25m | t004, t005, t006 |
| t008 | Simplify | 25m | t007 |
| t009 | Test coverage | 45m | t007 |
| t010 | Closeout | 15m | t008, t009 |

## Definition of done

- On a rebuilt development client, `xcrun simctl openurl` with an https ledger URL opens the native ledger view; every path in the resolver table lands on its screen, and a private ledger the account cannot read falls back to the browser with the current selection intact.
- A signed-out user who taps a ledger link lands on it after signing in.
- **Share link** and **Copy link** from the drawer and from an entry produce canonical https URLs that the resolver maps back to the same screen.
- `apple-app-site-association` and `assetlinks.json` are served with `application/json` on the local stack and on the hosted deployment and validate with Apple's and Google's checkers; public ledger pages carry the Smart App Banner tag.
- Mobile, dashboard, and backend-v2 check gates pass. A physical-device universal-link check is recorded after the next store build, since the entitlement requires a native rebuild.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w4`, 2026-09-08 (user approved all four milestones with `/pm for them all for w4`)
- **Goal linkage:** **A3 — Community & distribution**: every README, gallery, and Telegram link becomes an entry point into the native app, and every native share sends a link that comes back. **A2** spillover: a newcomer who installed the app first reaches a shared example ledger in one tap.
- **Expected outcome:** app sessions start from shared links, and public ledger pages on mobile Safari surface the App Store install banner. Both were impossible before.
- **Why now:** w4/m4 just shipped the safe-open path for public ledgers, which is the exact landing this needs; backend-v2 already has a well-known route to extend; the next `/mobile-release` is the natural carrier for the entitlement.
- **Adoption surface:** included because this ships a user-facing capability across mobile, dashboard, and self-host docs.
