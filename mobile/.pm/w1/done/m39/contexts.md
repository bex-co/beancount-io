# m39 — working context dump (2026-09-07)

Everything learned while implementing and debugging this milestone, kept for whoever picks up the follow-ups (`w1/033.md` — Android verification; a possible backend `entryHash` change).

## What m39 shipped

- Edit Transaction uses the shared `CodeEditor` (CodeMirror 6 via Expo `use dom`) with Beancount highlighting, quick-action bar, dirty guard, checksum save.
- Token rules live in one import-free module: `src/components/code-editor/beancount-language.ts` (used by both the StreamLanguage and the jest-lite tests; account rule requires a colon so `USD` is a currency, non-ASCII accounts work, escaped quotes + multiline strings covered).
- Editor colors are theme tokens: `ColorTheme.editor` in `src/types/theme-props.ts` + `src/common/theme/palette.ts`; screens pass `colorTheme.editor` over the DOM bridge; compartment reconfigure keeps document/selection/history across theme flips.
- Shared helpers: `src/components/code-editor/revision-tracker.ts` (dirty/save revision tracking for both editor screens), `src/components/keyboard-accessory-bar/use-keyboard-height.ts`, `getKeyboardOverlap` moved to `keyboard-accessory-bar/utils.ts`.
- New i18n keys `editTransactionLoadFailed`, `keyboardAccessoryInsert` in all 13 locales.

## The save-identity saga (the important part)

Symptom chain observed live on the simulator (iPhone 17 Pro, production-connected dev build):

1. First save from a fresh edit session: **works**. Second save in place: **"Failed to save transaction"** toast + inline "Internal server error".
2. Root cause: an entry's `entryHash` is **content-derived** — beancount `hash_entry` (`exclude_meta`), see `backend-cluster/ledger/src/foundation/rustledger/source-slice.ts` ("Hash identity" section). Any content edit changes the identity.
3. The `updateLedgerEntrySourceSlice` response's `entryHash` field **just echoes the request** (`backend-cluster/ledger/src/features/ledger/service/ledger-journal-service.ts` — `return { message, entryHash, newSha256sum: sliceSha256(newContent) }`). It is NOT the new identity. `newSha256sum` IS correct for the new content.
4. A chained save with the echoed old hash → `resolveSourceEntryId` finds nothing → `locateSlice` throws → ledger API returns `success: false` → backend-v2 wraps as `InternalServerError` (`ledger-journal-service.ts` in backend-v2, `updateSourceSlice`). Every identity failure surfaces as a bare 500, not a clean conflict.

Corollary that bites on the read side: **any screen mounted before a save holds a dead identity.** The transaction detail's `entryHash` is a route param; after an edit its `getLedgerEntryContext` refetch can only 500, which rendered as "Error: Internal server error" in the Entry Context card (`src/screens/transactions-screen/entry-context/index.tsx` — `contextError` wins over stale data). Opening Edit from such a stale detail shows "Failed to load transaction" (deliberate, honest; cache-first would instead serve a stale slice and fail the checksum at save time).

## Final save-flow behavior (post-archive fixes, in the working tree)

`src/screens/edit-transaction-screen/edit-transaction-screen.tsx`:

- Entry context query is `network-only` — never edit from the persisted cache.
- Mutation keeps `refetchQueries: [GetLedgerEntryContextDocument]` + `afterSuccess: invalidateLedgerData(client, "entries")` (the pre-m39 contract; the entries scope covers journal/balances/reports/meta/commits/`queryShell`).
- On success: `markRevisionsSaved` for the covered snapshot; if the user typed during the flight, stay on screen dirty; otherwise `router.dismiss(2)` — landing on the refreshed **journal**, not the dead-identity detail screen. `savedOutRef` keeps the `beforeRemove` guard from treating that as a discard.
- `openEditTransaction` is only called from the detail screen, so the stack is always list → detail → edit; `dismiss(2)` is safe.

## Why "just add refresh" was rejected

The staleness is a dead _key_ in navigation state, not stale cache data — refetching re-fails with the same old hash. The only identity-refresh source is the journal (already refetched via the entries scope). A real fix that preserves the detail view: **backend returns the new `entryHash`** from `updateSourceSlice` (parse `newContent`, `hashEntry` it — mind `hashWithActiveTags` for pushtag state), letting the app `dismissTo` a fresh detail screen.

## Environment/verification notes (cost time; don't rediscover)

- Taps: `expo-mcp` JSON-RPC over stdin (helper pattern in the deleted `tmp/m39/mcp-call.sh`): initialize → notifications/initialized → tools/call. No text-entry/scroll tool.
- Typing ASCII: osascript System Events keystroke with Simulator frontmost — **requires the Simulator window to exist**; the device keeps running headless (simctl screenshots still work) when the window is closed, and all keystroke injection silently dies. `open -a Simulator` failed to recreate the window in this session.
- The wheel pickers (theme/language in Settings) only select on scroll; drive them with CoreGraphics mouse drags (a small `CGEvent` leftMouseDown/Dragged/Up script works; ~45 window px per item at 90% zoom, momentum is erratic — verify by screenshot before confirming).
- iOS IME: hardware `keystroke "x"` with a Chinese keyboard active opens the candidate bar with marked text that is NOT committed until Enter — typing during verification needs a commit keypress.
- The persisted Apollo cache (m34) makes stale reads survive relaunches; `network-only` on the file editor and (now) edit screen is the authoritative-source pattern.
- One stray write happened during debugging and was reverted: Cafe Modagor had `Expenses:Food:Restaurantx` committed (visible as main.bean's "1 error" banner); the user's own re-save restored it.

## Open follow-ups

- `w1/033.md` — Android verification, authorized production save, IME composition on a real device.
- Backend `updateSourceSlice` returning the new `entryHash` would allow routing to a fresh detail screen after save instead of `dismiss(2)`.

## Superseded (2026-09-08)

The "Why 'just add refresh' was rejected" analysis above led to the real fix, now shipped end to end: the ledger service's `updateSourceSlice` resolves and returns the entry's NEW `entryHash` from the committed content (`rustledger/updated-entry-id.ts`), backend-v2 maps ledger 404/409 to NotFound/Conflict via `unwrapFavaResponse`, and the edit screen uses the returned hash to `dismissTo` the re-keyed transaction detail (`save-exit.ts`), falling back to `dismiss(2)` when an older server echoes the request hash. Response shape unchanged; no client breakage.
