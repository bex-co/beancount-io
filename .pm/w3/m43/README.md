# w3 · m43 — Open shared native transaction links in a browser

**Worker:** worker3 **Goal:** a recipient can open the entry URL copied by mobile in a browser and see the same authorized transaction. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Add the canonical entry destination to the dashboard | 45m | — |
| t002 | Preserve ledger authorization and honest entry failure states | 25m | t001 |
| t003 | Verify the shared-link adoption surface | 15m | t002 |
| t004 | Simplify the entry destination change | 10m | t003 |
| t005 | Cover direct entry URLs and native/browser controls | 25m | t003 |
| t006 | Close out verified entry-link support | 10m | t004, t005 |

## Definition of done

- A direct browser load/reload of `/ledger/open_ledger/real-estate-example/entry/2f4431f658f3553e73512ea3ebc1a2d4` shows the Nov15,2025 Sale entry, including its source context or equivalent complete detail; it does not fall through to Page Not Found.
- The existing native Share/Copy URL remains valid in the app and the browser. No silent replacement with an unrelated ledger overview or first journal page.
- The new route inherits ledger authorization; missing/denied entries, unauthenticated private access, loading and network failures retain distinct honest outcomes. It does not enable anonymous mutations or expose private metadata in a preview.
- Journal's existing row-to-Entry-Context flow and native ordinary-entry resolution still work. No generated-source content is fabricated.
- Dashboard package checks and meaningful route/state regression tests pass. Observable browser and native destination checks are recorded; changes are shipped before final closeout.

## Source + Goal linkage

- **Source:** `$qa-find-bugs-mobile for w3`, continued Sep13,2026; native outbound Share/Copy on a real public transaction, followed through its browser destination.
- **Severity:** major — the app exports entry URLs which fail for browser recipients even though the entry is publicly readable.
- **A3 — Community & distribution:** a shared public transaction is a working product entry point for recipients without the native app. A2 also benefits from avoiding a dead end on first contact.
- **Expected outcome:** a browser recipient opens the exact transaction sent by a mobile user.
- **Why now:** native sharing was recently fixed to present the iOS sheet, exposing the missing dashboard destination and its Page Not Found preview. This is over an hour of route integration, authorization/error handling and regression work; implementation is confined to dashboard, with native code serving as the existing URL contract.
- **Adoption surface included:** this changes a public recipient journey. Check dashboard documentation and the existing mobile link contract; flag unrelated documentation drift separately.

## Reproduced finding

Environment: main `84231f9c`, 2026-09-13, native build1.20260906.47/47 on iPhone17e/iOS26.5, English/light/standard text, native authenticated QA session reading public Real Estate. Production browser control is anonymous (Log In / Sign Up visible), using Playwright. Deployed dashboard SHA unverified. No production writes or messages sent.

1. Open the real Sale entry in native mobile: Nov15,2025, narration `Dispose property — recognize gain`, six postings. The inspected app link opens it successfully from a fresh process.
2. Open Transaction ellipsis → Share link. The iOS sheet now opens (completed137 control), but its title is Page Not Found.
3. Relaunch native app (PID55857), reopen the same entry, then ellipsis → Copy link. A guarded simulator clipboard read confirms the exact URL is `https://beancount.io/ledger/open_ledger/real-estate-example/entry/2f4431f658f3553e73512ea3ebc1a2d4`.
4. Open that URL in the browser: Page Not Found, heading404, explanatory missing-page text. Repeat after a working Journal visit: same result. A direct HTTP fetch also returns Page Not Found HTML (HTTP200; status-code defect already belongs to198).
5. Working browser control: `/ledger/open_ledger/real-estate-example/journal` renders 91 entries anonymously. Click the Nov15 Sale row: Entry Context opens with `transactions/sale.bean:49` and source beginning `2025-11-15 * "Sale" "Dispose property — recognize gain"`, including the property and capital-improvement postings. Fresh public API journal data independently contains that hash and six postings. The missing destination is not an absent ledger, entry, or permission.

Root: `mobile/src/common/app-links/build-ledger-url.ts:57` emits `/entry/<hash>` and `resolve-app-link.ts` handles that shape natively. `transaction-detail-screen.tsx:355` supplies it to both Share/Copy. The dashboard route tree and generated registry have no `/ledger/$ledgerOwner/$ledgerName/entry/$entryHash` route; `routes/$.tsx` renders NotFoundPage. Existing `routes/ledger.$ledgerOwner.$ledgerName.journal.tsx` renders Journal, whose selected entry/dialog state is local at `features/journal/pages/journal-page.tsx:167` and :362. Its search schema contains no entry hash; merely sending a new query argument does not open an entry. `EntryContextDialog` already reads GetLedgerEntryContext at `components/entry-context-dialog.tsx:425`, so reuse the owning journal feature's presentation/query behavior behind a thin entry route rather than duplicating a viewer or fetching every journal page.

Fix direction: add the missing dashboard destination for the already-distributed canonical URL, retaining the entry hash and authorized ledger identity. Reuse/extract the journal feature's context/detail presentation and existing query. Show clear loading, missing/error and return-to-journal behavior. Preserve existing permission-gated actions; read-only recipients must stay read-only. Ensure metadata describes a valid destination and does not expose private entry contents. No REST/GraphQL/MCP API behavior change is necessary.

Blast radius: all native ordinary-entry Share/Copy callers funnel through TransactionDetailScreen (Home, Journal, Accounts, Reports, Merchants). Native app link resolution remains a working control. Public Sale native detail, Share sheet, copied URL and browser failure/control were exercised; other callers, Android, private/expired/offline cases and actual receiving-device universal-link dispatch remain unverified. No external share activity was selected. One earlier dismissal attempt hit existing worklet error191; that contaminated sequence was discarded, the process relaunched, and Copy verified independently.

Dedupe/history: searched all queues including done for entry permalink, browser fallback, sharing and entry routes; scanned open milestone titles. Completed w4/m5/t005 promises a canonical dashboard path and native round trip but its test checks only the mobile builder/resolver, not browser route existence. Completed140 hides generated-entry exports; this source-backed Sale entry resolves natively. Completed137's share-sheet presentation passes here. Open198 covers soft404 status, not adding this valid destination. Openm31 covers keyboard interaction with the existing EntryContext dialog. No existing item supplies the browser entry route; the mobile producer dates to2a464bbc and current dashboard still lacks the route.

Evidence, verified local files under `mobile/tmp/qa-2026-09-13/`: `sale-detail-current.jpg`, `sale-menu.jpg`, `sale-share-sheet.jpg`, `sale-copied-url.txt`, `sale-public-response.html`, `sale-web-failure.txt`, `sale-web-control.txt`, `realestate-journal.json`. Public text reproducer above stands independently of ignored artifacts. No fixes or shipping by this QA run.
