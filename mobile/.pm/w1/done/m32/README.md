# w1 · m32 — Ask Beancount.io on mobile: core agent chat

**Worker:** worker1 **Goal:** the mobile app gains its first AI surface — a signed-in user asks questions about their selected ledger and watches the answer stream in, on the same live agent endpoint the web dashboard uses, with zero backend changes. **Status:** **done** 2026-08-19 — Ask Beancount.io ships on iOS, 1389 unit tests green

## Tasks (in order)

| id   | title                                                                     | est | depends_on       |          |
| ---- | ------------------------------------------------------------------------- | --- | ---------------- | -------- |
| t001 | Live smoke: Bearer + SSE streaming against `POST /api-gateway/agent`      | 30m | —                | **DONE** |
| t002 | Add `ai` + `@ai-sdk/react` (new dependencies — decision in ADR002)        | 20m | t001             | **DONE** |
| t003 | Chat transport: `useChat` + `DefaultChatTransport` over `expo/fetch`      | 45m | t002             | **DONE** |
| t004 | Agent screen: message list, input bar, streaming render                   | 60m | t003             | **DONE** |
| t005 | Stop, inline error + retry, New chat                                      | 40m | t004             | **DONE** |
| t006 | Approval guard: write-tool requests end in a "continue on the web" notice | 30m | t004             | **DONE** |
| t007 | Entry points: Home ask card + header icon; `?q=` deep link prefills only  | 45m | t004             | **DONE** |
| t008 | UX pass — light/dark, translations gate, RTL, loading states              | 40m | t005, t006, t007 | **DONE** |
| t009 | Simplify pass over the agent-chat diff                                    | 20m | t008             | **DONE** |
| t010 | Test coverage — transport, guard, prefill, session reset                  | 40m | t009             | **DONE** |

## Definition of done

A signed-in user opens Ask from the Home card or the header icon, asks a read question about the selected ledger ("what did I spend on food this month?"), and the answer streams into a native chat screen; a stop control aborts an in-flight stream; a failed turn shows an inline error with one-tap retry; New chat resets both the visible messages and the `sessionId`. A prompt that would trigger an approval-gated write tool (ledger edit, receipt insert) ends with a visible "continue on the web to approve changes" notice — never a hang, and never a write. `beancount:///(app)/agent?q=…` opens the screen with the question **prefilled but not submitted**. All of it verified in light **and** dark; every new string declared in `src/translations/en.ts` and either translated in all twelve other locales or named in `KNOWN_GAPS`; `yarn lint` / `yarn typecheck` / `yarn test:unit` green.

**Verified 2026-08-19** on the booted iPhone 17 Pro simulator against the production ledger `puncsky/example`, driven headlessly. Real answers streamed with real balances; stop aborted mid-answer and kept the partial text; New chat reset thread and session; the write request stopped at the approval notice with the ledger's git history unchanged; `?q=Delete all my transactions` sat unsent in the input. Light and dark, English and Persian. 18 new keys in all thirteen locales, `KNOWN_GAPS` still empty. `yarn lint`, `tsc`, `yarn test:unit` (1348 → **1389**) green.

## Source + Goal linkage

- **Source:** inbox note `006` ("Scope Ask-AI chat parity"), parked since 2026-08-16 on "no agent/chat operations in the mobile schema." The observation was correct but the layer was wrong: the agent surface is not GraphQL. It is `POST /api-gateway/agent` — REST + SSE speaking the AI SDK UIMessage stream — and its auth resolves `Authorization: Bearer` **first**, a header path that exists expressly for API clients and the mobile app. Full design, protocol notes, security posture, and phasing: `docs/ADR002-mobile-ai-assistant.md` (2026-08-18). This milestone is the ADR's P0 (smoke) + P1 (core chat) plus the entry points and the write-tool guard.
- **Goal linkage:** **Pillar 2 — AI-powered ease** (plain-English explanations of the user's finances, on the phone). Secondary **Pillar 3 — analytics & insights**: `DO_NOT_DO.md` bans a mobile BQL console and names "AI-powered features" as the mobile way to answer ad-hoc questions — this is that sanctioned path. The write guard honors the anti-goal "AI proposes, the user confirms" in its strongest form: in this milestone the agent cannot mutate the ledger from mobile at all.
- **Expected outcome:** beancount.io mobile users get the platform's headline capability — ask-your-ledger — natively, instead of it being web-only; ad-hoc questions that today require the desktop get answered in an on-the-go moment.
- **Why now:** agent mode became the platform's **primary** chat mode (the old `/chat` route is unregistered; the dashboard's `/ask` now redirects to `/agent`), leaving mobile the only client without it. The blocker that parked `006` is definitively resolved, the ADR is written, and P0 retires the one remaining integration risk (Bearer + streaming from device) for ~30 minutes before any UI is built.

## Notes

- **Two new dependencies** — `ai` and `@ai-sdk/react`, version-matched to the dashboard's majors. The decision record is ADR002 (alternatives: hand-rolled SSE parser, WebView, non-streaming GraphQL — all rejected there). Flagged per the repo rule; t002 carries it explicitly.
- **Security decisions baked in** (from the ADR002 review): deep links prefill and never auto-submit (any app can fire the scheme with attacker-controlled text); the approval-requested state must never dead-end silently. Approval **cards** (rendering the real diff) are ADR P2 — deliberately not in this milestone, hence the guard.
- **Scope guard:** attachments/receipts through chat (P3) and preset-pool expansion, per-screen contextual entry points, and history persistence (backend-owned, dashboard ADR001) are out of scope here.
- **Translation gate is unconditional** since m30: every `en` key this milestone adds ships twelve translations or a named `KNOWN_GAPS` entry.
- **RTL:** chat bubbles hold Latin ledger data inside a possibly-RTL layout — the exact shape m31's `LEADING_TEXT_ALIGN` constant exists for. t008 walks `fa` explicitly.

## Outcome — shipped 2026-08-19

Mobile is now a second client of the platform's agent route, speaking the same UIMessage stream the dashboard does, with **no backend change**. The design assumption the whole milestone rested on — that the route takes the app's keychain Bearer token and streams to `expo/fetch` — was settled in thirty minutes before any UI existed, and it held.

### The three findings worth carrying forward

**1. `expo/fetch` shares the native cookie store, and the route accepts cookies.** t001's first negative control — same request, no `Authorization` header — returned 200 and streamed a real answer. Not a hole: the app simply holds a session cookie for the same origin, and the route's auth tries the header first, the cookie second. But it means a client that silently lost its Bearer header would keep working until the cookie expired, on someone else's device, later. The transport sets `credentials: "omit"` so the token is the only credential and a broken auth path fails immediately. Rows 3 and 4 of the smoke differ only by that flag: 200 versus 401.

**2. The model announces writes it has not made.** Asked to append a transaction, the agent said _"Proceeding with this operation"_ — and nothing happened, because `editLedgerFiles` is `needsApproval` server-side and this client never sends an approval response. The ledger's git history was identical before and after. That gap is the argument for the guard rendering a notice rather than trusting the sentence: what the model says and what the tool does are separate facts, and only one of them moves the ledger.

**3. A turn can finish having said nothing.** The server caps the agent at ten steps; a vague "add a transaction" spent all ten reading files and ended with no text at all. The screen went silent — activity line, then nothing, forever. That is the dead end this board's definition of done forbids, and it was found only because the first approval attempt failed to reach an approval. It now renders its own notice and a retry.

### What the UX pass cost, and why it was worth it

Six defects, every one found by looking at a real answer on a real screen rather than by reading the diff: raw `**asterisks**` next to the user's money; LaTeX (`\text{Net Worth}`, `\,` thin spaces) where the model showed its arithmetic; backticks around account names; agent steps running together as `Let me try again.It seems…`; the silent turn above; and — only visible in Persian — a bullet glued to its word, because the gap lived in a `"• "` string and a trailing space collapses once the row mirrors. That last one is the same class of bug m31 documented: spacing that is really layout should be expressed as layout.

`markdown-lite.ts` is the answer to the first three, and it stayed a hundred lines with no new dependency. Each rule in it names the string that prompted it.

### Verified, and not

Walked in light and dark, in English and Persian, on iOS. **Not** verified: Android; haptics (no Taptic Engine in a simulator); analytics (`analytics.track` returns early under `__DEV__`, so the mount event and entry-surface property are structural only); and hand-typed input — the automation offers taps but no text entry, so every message sent in this milestone went through a preset chip or a `?q=` prefill, and the keyboard-avoiding behaviour was checked by layout rather than by a real keyboard.

### Deviation from plan

t007 specified preset chips on Home that submit on tap. They are not there, deliberately: submitting from Home needs a signal a deep link cannot forge, and every router param is forgeable, so a submitting chip would either reopen the security question or invent a second private channel to answer it. The chips live on the agent screen's empty state, where a tap is unambiguously human. Home is the door. One rule survives — **`?q=` prefills and never sends, whatever opened it.**

### Addendum — markdown rendering moved to a library (2026-08-19, after closeout)

The milestone shipped with a hand-written markdown reader (`markdown-lite.ts`), justified in t004 as "a markdown engine is a lot of surface for one bold span." Asked directly afterwards whether an off-the-shelf option existed for this stack, the honest answer was **yes**: `react-native-marked`, current, RN-native, and with its `react-native-svg` peer already installed for the charts. It is now in place; `markdown-lite.ts` is deleted.

What survives hand-written is only the half that was never markdown: `agent-notation.ts` strips the LaTeX the model wraps arithmetic in (`\text{…}`, display brackets, `\,` thin spaces). A markdown parser renders those faithfully as literal backslash commands, so preprocessing stays ours regardless of the renderer. Markdown syntax — emphasis, lists, headings, code spans, escapes — is now entirely the library's, and the tests assert that `stripAgentNotation` leaves it untouched.

**The swap paid for itself in the place I had least expected.** The RTL bullet defect this milestone found and fixed by hand — a marker glued to its word in Persian — simply does not occur with the library: it places list markers on the leading edge correctly out of the box. Wrapped list items also gain a proper hanging indent, headings gain real weight, and tables, links and blockquotes arrive supported rather than ignored. Cost: seven transitive dependencies and 3124 → 3175 bundle modules.

Two implementation details worth remembering: the library's default export renders into a `FlatList` and must **not** be nested in the chat's `ScrollView` — the `useMarkdown` hook returns `ReactNode[]` and is what the bubble uses; and all colours are passed in from our theme tokens rather than the library's own palette, so there is no second source of truth.

Re-verified on device after the swap: light and dark, English and Persian, with a fresh Metro cache. 1384 tests green, and the five preprocessing units were each broken once to confirm their tests bite. One accepted rough edge, now pinned by a test: mid-stream, a display-math block whose closing delimiter has not arrived shows its opening bracket for a moment, then resolves.

**Process note:** the original "no new dependency" call was made inside t004 rather than surfaced as a decision, even though the repo rule puts dependency choices with the owner — the two AI SDK packages went through ADR002 properly and this one did not. Raising it is what produced the better answer.

### Addendum — the feature ships gated off (2026-08-19, after closeout)

`config.features.agentChat` is a plain `false` in `src/config.ts`, gating both the Home card and the `/agent` route — the route matters, because gating only the card would leave `beancount:///(app)/agent` open to anything that can fire a URL scheme. Verified both ways on device: with it off the card is gone and the deep link redirects to the tabs.

A constant, not an `EXPO_PUBLIC_*` variable and not `__DEV__`. An env switch can turn a feature on in a build because of what was in someone's shell; a constant shows up in the diff of whoever flips it. `__DEV__` is false in TestFlight, which would have hidden the feature from the people most meant to see it. Tests pin both the value and the shape, and each was broken once to confirm it bites.

The gate should stay until at least the P2 approval cards land: the surface spends a user's AI quota and cannot yet review its own ledger writes.

### Follow-ups

- **Approval cards with a real diff** (ADR002 P2) — until they ship, every write is a trip to the web. This is the largest remaining gap and the notice is a placeholder for it.
- **Attachments through chat** (ADR002 P3) — the presign → PUT → `objectKey` pipeline already exists in receipt capture.
- **Durable history** — backend-owned (`dashboard/docs/ADR001-chat-history-persistence.md`); this client holds its thread in memory and will hydrate from those endpoints when they exist, without a transport change.
