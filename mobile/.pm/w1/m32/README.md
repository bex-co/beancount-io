# w1 · m32 — Ask Beancount.io on mobile: core agent chat

**Worker:** worker1 **Goal:** the mobile app gains its first AI surface — a signed-in user asks questions about their selected ledger and watches the answer stream in, on the same live agent endpoint the web dashboard uses, with zero backend changes. **Status:** todo

## Tasks (in order)

| id   | title                                                                     | est | depends_on       |
| ---- | ------------------------------------------------------------------------- | --- | ---------------- |
| t001 | Live smoke: Bearer + SSE streaming against `POST /api-gateway/agent`      | 30m | —                |
| t002 | Add `ai` + `@ai-sdk/react` (new dependencies — decision in ADR002)        | 20m | t001             |
| t003 | Chat transport: `useChat` + `DefaultChatTransport` over `expo/fetch`      | 45m | t002             |
| t004 | Agent screen: message list, input bar, streaming render                   | 60m | t003             |
| t005 | Stop, inline error + retry, New chat                                      | 40m | t004             |
| t006 | Approval guard: write-tool requests end in a "continue on the web" notice | 30m | t004             |
| t007 | Entry points: Home ask card + header icon; `?q=` deep link prefills only  | 45m | t004             |
| t008 | UX pass — light/dark, translations gate, RTL, loading states              | 40m | t005, t006, t007 |
| t009 | Simplify pass over the agent-chat diff                                    | 20m | t008             |
| t010 | Test coverage — transport, guard, prefill, session reset                  | 40m | t009             |

## Definition of done

A signed-in user opens Ask from the Home card or the header icon, asks a read question about the selected ledger ("what did I spend on food this month?"), and the answer streams into a native chat screen; a stop control aborts an in-flight stream; a failed turn shows an inline error with one-tap retry; New chat resets both the visible messages and the `sessionId`. A prompt that would trigger an approval-gated write tool (ledger edit, receipt insert) ends with a visible "continue on the web to approve changes" notice — never a hang, and never a write. `beancount:///(app)/agent?q=…` opens the screen with the question **prefilled but not submitted**. All of it verified in light **and** dark; every new string declared in `src/translations/en.ts` and either translated in all twelve other locales or named in `KNOWN_GAPS`; `yarn lint` / `yarn typecheck` / `yarn test:unit` green.

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
