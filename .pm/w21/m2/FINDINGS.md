# Readable-width caps for the screens with bespoke scrollers (follow-up to w21/1005)

w21/1005 added the shared `contentColumn` (640 pt) and `sheetColumn` (560 pt)
styles and applied them to the `DashboardScrollView` scaffold (Home, Reports),
the Picker and valuation sheets, and the Add Budget, Open Account, and
transaction forms. Screens with their own scrollers are still uncapped on iPad
— among others Transactions, Accounts, Merchants and merchant detail, Budget,
Notifications, the ledger file browser, transaction detail, and the remaining
form and settings screens.

## Fix

Apply `...contentColumn` to each bespoke screen's scroll content (or card), one
screen at a time, checking for full-bleed children (sticky headers, horizontal
scrollers, edge-to-edge rows) that must stay full width. Extend
`content-column.test.ts` with a consumer check per screen.

**Acceptance:** on a 1024 pt window every screen's content column is at most
640 pt wide; phones render pixel-identical (the caps do not bind below 640 pt).
If the screen count makes this exceed ~1h, promote to a milestone instead.
