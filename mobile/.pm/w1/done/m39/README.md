# w1 · m39 — Beancount highlighting and quick actions in Edit Transaction

**Worker:** worker1 **Goal:** A user correcting a transaction on a phone gets the ledger file editor's Beancount highlighting and keyboard shortcuts while preserving the transaction's exact source and checksum-protected save. **Status:** done

## Verification evidence (2026-09-07, iPhone 17 Pro simulator, iOS 26.5, dev build `io.beancount.ios`)

| Scenario                                      | Result                                                                                                                                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edit Transaction loads the exact source slice | OK — CodeMirror editor renders the slice unmodified, Beancount highlighting on (date/flag/strings/accounts distinct)                                                                                |
| Quick actions above the keyboard              | OK — date, `*`, `!`, `""`, `:`, ledger operating currency `USD`, indent, `-` all present; `""` places the caret inside the quotes                                                                   |
| Typing + undo                                 | OK — hardware-keyboard input lands; Cmd+Z steps back through every insert to the pristine slice, and the Save button disables again (dirty tracking correct)                                        |
| Live theme change                             | OK — with theme=System, flipping the device light↔dark re-themes the open editor in place; document and selection survive (compartment reconfigure)                                                 |
| Dark theme                                    | OK — editor chrome is the Charcoal surface, seamless with the app; syntax hues from `colorTheme.editor`                                                                                             |
| Dirty-draft discard                           | OK — Cancel with edits raises "Unsaved Changes / Discard your changes?"; Discard leaves without a mutation; the transaction behind is unchanged                                                     |
| Persian (RTL) UI with LTR source              | OK — `fa` chrome is fully RTL; the editor keeps source LTR with intact highlighting and the mirrored accessory bar                                                                                  |
| File editor regression (main.bean)            | OK — highlighting correct, currencies (`USD`, `VMMXX`, …) now tokenized as currency, not account; accessory bar, gutter, pristine Save-disabled state all intact                                    |
| Chinese IME composition                       | Covered by unit tests for non-ASCII token rules (`Assets:银行:活期`); live IME composition is not driveable from the CLI and stays open                                                             |
| Android                                       | **Open** — no Android SDK/emulator on the verification machine; tracked as w1 inbox follow-up                                                                                                       |
| Production save path                          | **Open** — writing to the connected production ledger was not authorized; save/checksum races are covered by `revision-tracker` unit tests and the m15-verified `updateLedgerEntrySourceSlice` flow |

Unit side: `beancount-language` tests drive the production tokenizer (currency vs account, non-ASCII accounts, escaped quotes, multiline strings); `revision-tracker` tests cover edits-during-save, repeated saves, stale epochs, and out-of-order revisions. `yarn format:check`, `yarn lint`, `yarn typecheck`, `yarn test:unit` all pass (1492 tests).

Post-archive correction (2026-09-07): the first authorized save attempt exposed that an entry's identity is content-derived (beancount `hash_entry`), so a content edit invalidates `entryHash` and the mutation's response merely echoes the request's — an in-place second save can never resolve. The screen now loads entry context `network-only` (a stale persisted checksum cannot target a dead identity), refetches `GetLedgerEntryContextDocument` plus the `entries` scope after saving, and dismisses back to the journal on success: the detail screen behind holds the old hash, so landing there leaves its context query erroring on an identity that no longer exists. Reopening the entry from the refreshed journal starts a fresh detail with the new hash.

## Tasks (in order)

| id   | title                                                       | est | depends_on       |
| ---- | ----------------------------------------------------------- | --- | ---------------- |
| t001 | Harden shared Beancount highlighting and use theme tokens   | 45m | —                | — **DONE** |
| t002 | Use CodeEditor for transaction source and save snapshots    | 45m | t001             | — **DONE** |
| t003 | Add the existing keyboard quick actions to Edit Transaction | 45m | t002             | — **DONE** |
| t004 | Verify transaction and file editing on iOS and Android      | 45m | t003             | — **DONE** |
| t005 | Adoption surface                                            | 30m | t004             | — **DONE** |
| t006 | Simplify                                                    | 20m | t004, t005       | — **DONE** |
| t007 | Test coverage                                               | 40m | t004, t005, t006 | — **DONE** |
| t008 | Closeout                                                    | 10m | t007             | — **DONE** |

Estimated effort: 4h40m. This is a milestone because editor integration, keyboard behavior, save correctness, and shared-component regressions need separate implementation and verification work.

## Definition of done

- Edit Transaction loads the exact source slice into the existing CodeMirror editor with Beancount highlighting; comments, metadata, tags, links, costs, prices, whitespace, and non-ASCII text survive editing without automatic rewriting.
- The native keyboard bar provides the existing date, `*`, `!`, paired quotes, `:`, configured operating currencies, two-space indent, `-`, `#`, and `^` actions. Actions replace the active selection, restore the intended cursor, and remain usable without dismissing the keyboard.
- Save obtains the current editor document and uses `updateLedgerEntrySourceSlice` with the correct ledger, entry identity, and checksum. Failed saves preserve the draft; late loads/refetches do not overwrite typing; a save response cannot mark subsequent edits as saved. Repeated saves and concurrent-change errors behave correctly.
- Loading has a themed skeleton; unavailable context has an honest error state; editing respects ledger write access; leaving a dirty draft has an explicit discard path. The caret and last posting remain visible above the keyboard and accessory bar.
- Currency tokens are distinguishable from accounts. Production highlighting correctly handles supported non-ASCII account names, escaped quotes, and multiline strings, with tests exercising the runtime token rules. Both editor surfaces use theme tokens and retain selection/history across theme changes.
- iOS and Android verification covers both themes, Chinese input composition, selection, repeated toolbar actions, undo, keyboard dismissal, and reopening the editor. Evidence uses synthetic data; missing platform verification stays explicitly open.
- Existing ledger-file editing retains save, conflict, jump-to-line, and keyboard behavior. Mobile `yarn format:check`, `yarn lint`, `yarn typecheck`, and `yarn test:unit` pass.
- The user-facing edit flow is documented, and the standing closing tasks are complete before `/pm` archives the milestone.

## Source + Goal linkage

- **Source:** Owner request on 2026-09-06 to research syntax highlighting and a quick-action panel for mobile transaction editing, followed by an explicit handoff to `/pm` for `mobile/.pm/w1`. The research recommendation was to reuse `CodeEditor` and `KeyboardAccessoryBar`; this handoff records planned work only.
- **Goal linkage:** **A2 — Frictionless onboarding**: a newcomer can correct an initial transaction on their phone with recognizable syntax and one-tap insertion. Mobile `.pm/GOAL.md`: **Plain-text fidelity**, with **Effortless capture** as a secondary linkage.
- **Expected outcome:** From transaction detail, a user can open Edit Transaction, distinguish accounts/amounts/strings, insert the needed symbols, and save a correction without switching to the full file editor or a desktop. This is demonstrated through a synthetic transaction walkthrough, without adding analytics.
- **Why now:** Completed milestones [m9](../done/m9/README.md) and [m15](../done/m15/README.md) supply the two working foundations. The current transaction screen still uses a plain multiline `TextInput`; the file editor already has both requested capabilities. There is no dependency on m38 and no new package or backend dependency expected.
- **Adoption surface:** Included because this changes a user-facing correction flow and its documentation. Review shared package/agent guidance for drift without expanding implementation into other packages.

## Research handoff

Paths below are relative to `mobile/`:

- `src/screens/edit-transaction-screen/edit-transaction-screen.tsx` owns `getLedgerEntryContext`, source seeding, `useLedgerWrite`, `updateLedgerEntrySourceSlice`, inline errors, and ledger cache invalidation.
- `src/components/code-editor/code-editor.tsx` already bundles CodeMirror 6 through Expo's `use dom`, tracks document epochs/revisions, requests a save snapshot, inserts at the active selection, and reconfigures themes while preserving history.
- `src/components/keyboard-accessory-bar/` already supplies the requested shortcuts. `src/screens/ledger-file-editor-screen/index.tsx` shows native keyboard positioning and configured currencies from `useLedgerMeta`.
- The production account token rule currently accepts a name without any colon, so it captures `USD` before the currency rule. The classifier in `src/screens/ledger-file-editor-screen/utils.ts` requires a colon, so its existing tests do not prove the production tokenizer is correct. Reuse the production rules in meaningful tests.
- The current string-state handling and ASCII-only account pattern need verification against supported Beancount syntax. The editor also defines hard-coded light/dark palettes; move syntax colors into the existing theme system.
- [Expo DOM documentation](https://docs.expo.dev/guides/dom-components/#marshalled-props) documents the asynchronous native/DOM bridge. Keep document edits and selection inside CodeMirror; do not mirror every keystroke back as a replacement document prop.
- [CodeMirror](https://codemirror.net/) supports mobile selection and editing. [Monaco's FAQ](https://github.com/microsoft/monaco-editor#faq) lists mobile browsers/frameworks as unsupported. Continue with the already-installed CodeMirror implementation.

## Deferred scope

Account/payee autocomplete, dedicated Undo/Redo buttons, Add Posting, a More panel for metadata/cost/price actions, formatting, balancing, a language server, and custom native editor modules are follow-up candidates. This milestone supplies parity with the existing mobile file editor. It adds no analytics, dependencies, schema changes, store release, or cross-package imports.
