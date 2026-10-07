# ADR 002: Mobile AI Assistant

- Status: Accepted — P0/P1 implemented (`mobile/.pm/w1/done/m32/`) and shipped gated off; P2–P4 (approval cards, attachments, polish) and un-gating are frozen by owner decision (`mobile/.pm/DO_NOT_DO.md`). See [Implementation notes](#implementation-notes)
- Date: 2026-08-18
- Decision owners: Mobile (client); Backend (no changes required)
- Scope: Adding the platform's agent chat — "Ask Beancount.io" — to the mobile app: which endpoint and protocol to use, which client mechanism to adopt, how attachments and tool approvals work, and what stays out of scope.

## Context

Before this decision the mobile app had **no AI chat surface**: its screens were ledger CRUD, reports, and capture flows, while agent mode had become the platform's **primary** chat mode. The dashboard's `/agent` page is the mature reference client; the old `/api-gateway/chat` route is gone, and the dashboard's `/ask` path now redirects to `/agent` unless it carries `?mode=sandbox|agent`, which selects the separate sandbox surface (`/api-gateway/sandbox-agent`) that this record does not cover.

What already exists, on each side of the wire:

- **Backend (`backend-cluster/backend-v2`):** `POST /api-gateway/agent` (`backend-cluster/backend-v2/src/features/ai-agent/api/agent-route.ts`) accepts `{ messages: UIMessage[], ledgerId, sessionId? }` and replies with the **AI SDK UIMessage SSE stream** (`pipeUIMessageStreamToResponse`). Auth resolves the token **`Authorization: Bearer` header first, cookie second** — the header path exists explicitly for API clients and the mobile app. The route enforces the AI-CFO monthly quota (a rate-limit error carrying current/max usage) and per-ledger access before streaming. The handler is **stateless per request**: the client sends the full message history each turn; `sessionId` is accepted but not currently used for server-side memory.
- **Agent capabilities (visible in the stream):** BQL queries, listing/reading ledger files, editing ledger files, and receipt parse + insert — running in a bounded tool loop. Ledger edits and receipt inserts are declared `needsApproval`, so the stream pauses with a tool part in `approval-requested` state until the client sends an approval response.
- **Dashboard reference client** (`dashboard/src/features/ai-agent/pages/agent/page.tsx`): `useChat` + `DefaultChatTransport` from the AI SDK, `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses` for the approval round-trip, `addToolApprovalResponse` wired to approval cards (file-edit diff, receipt insert), attachments staged through the temp-asset upload hook and sent as `file` + `data-file-upload` parts.
- **Mobile already has most of the plumbing:** an OAuth access token issued by `oauthTokenManager.getAccessToken()` (`mobile/src/common/oauth/oauth-token-manager.ts`), which refreshes it as needed over a session persisted in the keychain (`mobile/src/common/apollo/secure-session-storage.ts`) and which the Apollo client already sends as `Authorization: Bearer`; an endpoint helper (`getEndpoint` in `mobile/src/common/request.ts`) pointing at the same `api-gateway/` base; and — in the receipt-capture screen — the attachment pipeline the agent would need: `generateTempAssetUploadUrl` → presigned PUT → `objectKey` (`mobile/src/screens/receipt-capture-screen/use-receipt-workflow.ts`).
- **Streaming on device:** the app is on Expo SDK 57; `expo/fetch` provides a WinterCG-compliant `fetch` with streaming response bodies, which the AI SDK accepts as a custom `fetch` (this is the AI SDK's documented Expo setup).

## Decision Drivers

- **One backend surface, zero backend changes.** Mobile should be a second client of the exact route and protocol the dashboard uses, so the two clients stay behaviorally identical and the backend team is not in the critical path.
- **Reuse a maintained protocol client.** The UIMessage stream is rich (text deltas, streamed tool inputs, tool states including approvals, typed data parts) and evolves with the AI SDK; a bespoke parser is protocol maintenance we would carry forever.
- **Approval-gated writes must be first-class.** The agent can edit ledger files; mobile users must see and approve diffs with the same clarity the dashboard gives them, or trust evaporates.
- **New dependencies need an explicit decision** (repo rule) — this ADR is that decision record.
- **Mobile conventions apply:** theme tokens in light and dark, skeleton loading states, `useTranslations()` across 13 locales (including RTL Persian), Expo Router file-based routes. The app ships no analytics, so the screen emits no events.
- **Clear degradation:** quota exhaustion and offline states must render as understandable UI, not spinners or raw errors.

## Decision

Build the assistant as a **native screen that is a protocol-faithful sibling of the dashboard client**, on the existing `POST /api-gateway/agent` route.

- **Adopt the AI SDK on mobile**: `ai` and `@ai-sdk/react` are dependencies of the app. They were added matched to the dashboard's majors; the dashboard has since moved ahead (`ai` 7 / `@ai-sdk/react` 4 against mobile's 6 / 3), so the two clients are no longer major-matched. Use `useChat` + `DefaultChatTransport` with:
  - `api: getEndpoint("api-gateway/agent")`
  - `fetch: expo/fetch` (streaming-capable)
  - `credentials: "omit"`, so the Bearer token is the only credential (see [Implementation notes](#implementation-notes))
  - `headers`: `Authorization: Bearer <token from oauthTokenManager.getAccessToken()>`, resolved per request, and `Accept-Language` from the active locale (as the dashboard sends)
  - `body: { ledgerId, sessionId }` with `ledgerId` from the selected-ledger reactive var
- **New screen + route**: `mobile/src/screens/agent-screen/` mounted from `mobile/app/(app)/agent.tsx`. Message list rendering agent answers as markdown (via `react-native-marked` — see [Rendering markdown](#rendering-markdown-react-native-marked)), input bar, streaming indicator, stop, inline error + retry. Entry points: a Home-screen "Ask" card and the deep link `beancount:///(app)/agent?q=…`, which **prefills the input and never submits** — deliberately unlike the dashboard's `?q=`, because any app can open a URL scheme with text it chose (see [Implementation notes](#implementation-notes)). Both are gated by `config.features.agentChat`, which is `false`.
- **Tool approvals** (designed, not built — frozen): port the dashboard's approval-card pattern to React Native — a file-edit card showing the change description and diff, and a receipt-insert card showing the proposed transaction — wired to `addToolApprovalResponse` with `sendAutomaticallyWhen` completing the round-trip. What exists instead is a refusal: the screen never answers an approval request and shows an "Approve this on the web" notice, so the agent cannot write to a ledger from mobile.
- **Attachments** (designed, not built — frozen): reuse the receipt-capture upload leg (`generateTempAssetUploadUrl` → presigned PUT), then send `file` parts plus `data-file-upload` parts `{ objectKey, filename }`, exactly as the dashboard does. Camera capture could feed the same staging path. The agent screen sends text only.
- **Conversation state is client-held** (the server is stateless per request): keep the `UIMessage[]` in memory for the app session with a New-chat reset. **Durable, cross-device history is explicitly deferred** to the backend-owned persistence design (see `docs/adrs/ADR001-dashboard-chat-history-persistence.md`); when its history endpoints exist, this screen hydrates from them without a transport change.
- **Quota exhaustion** renders a neutral notice — the monthly allowance is used and resets next month — with no retry button, no upgrade prompt, and no link out. The app has no subscription surface: it is consumption-only and mobile billing is deferred (see `docs/adrs/ADR001-mobile-billing.md`), so this deliberately does not mirror the dashboard's upgrade panel.
- **Frozen scope.** By owner decision recorded in `mobile/.pm/DO_NOT_DO.md`, no further work happens on this surface: no P2 approval cards, no P3 attachments, no P4 polish, and no un-gating. Lifting the freeze is an owner decision, not a backlog item.

## Architecture

### Components — mobile as a second client of the same agent route

```mermaid
flowchart TB
  user@{ shape: tri, label: "user" }

  subgraph mobile["mobile app (Expo / React Native)"]
    screen["agent screen (new)<br/>src/screens/agent-screen"]
    chat["useChat + DefaultChatTransport<br/>fetch = expo/fetch · Bearer from keychain"]
    upload["temp-asset upload (P3 — not built)<br/>presign via GraphQL, then PUT"]
  end

  dash["dashboard /agent page<br/>(existing sibling client, same protocol)"]

  subgraph be["backend-v2 — owns auth · quota · ledger access (unchanged)"]
    route["POST /api-gateway/agent<br/>Bearer-first auth · quota · ledger access"]
    agent["agent tool loop (per-request, stateless)<br/>BQL · read/edit ledger files · receipt parse/insert"]
  end

  s3[("temp asset store (S3, short-lived)")]
  ledger["ledger service (files + git)"]

  user --> screen
  screen --> chat
  screen --> upload
  chat -->|"full UIMessage[] · SSE UIMessage stream back"| route
  dash --> route
  upload -->|"presign (GraphQL)"| be
  upload -->|"PUT file"| s3
  route --> agent
  agent --> ledger
  agent -->|"read objectKey"| s3
```

### Turn sequence — including the approval round-trip

The attachment leg (P3) and the approval round-trip (P2) are the designed flow and are not built. Today the sequence stops at the `approval-requested` tool part: mobile shows the web notice and sends nothing back.

```mermaid
sequenceDiagram
  participant U as user
  participant M as mobile agent screen (useChat)
  participant B as backend-v2 POST /api-gateway/agent
  participant S as temp asset store (S3)
  participant L as ledger service

  opt attachment (receipt / statement)
    M->>B: generateTempAssetUploadUrl (GraphQL, Bearer)
    M->>S: PUT file to presigned URL
    Note over M: keep objectKey, attach file + data-file-upload parts
  end

  U->>M: question
  M->>B: POST full UIMessage[] + ledgerId (Authorization Bearer)
  Note over B: resolve user · quota check · ledger access
  B-->>M: UIMessage SSE stream (text deltas, tool parts)

  alt tool needs approval (ledger edit / receipt insert)
    B-->>M: tool part in approval-requested state, stream ends
    U->>M: approve or reject on approval card
    M->>B: re-send with approval response (sendAutomaticallyWhen)
    B->>S: read objectKey (receipt flow)
    B->>L: apply edit / insert transaction (on approve)
    B-->>M: stream tool result + final answer
  end
```

## Rollout Plan

Phased, each phase shippable on its own (OTA-updatable; releases cut via `yarn bump`). P0 and P1 are implemented; everything after them is frozen (`mobile/.pm/DO_NOT_DO.md`).

1. **P0 — live smoke (before any UI) — done:** a read-only question against the production route with a real device token, proving Bearer auth and `expo/fetch` streaming end to end. This was the only integration risk and was retired first.
2. **P1 — core chat — done, gated off:** screen + route, text-only turns, streaming render, stop, inline error + retry, New chat. Both themes.
3. **P2 — approvals — not built, frozen:** file-edit and receipt-insert approval cards. In their absence, prompts that trigger approval-gated tools end with an "Approve this on the web" notice rather than a silently hung stream.
4. **P3 — attachments — not built, frozen:** stage files/photos through the temp-asset pipeline; receipt flow parity with the dashboard.
5. **P4 — surface polish — partly built with P1, remainder frozen:** the Home entry card, the prefill-only `?q=` deep link, the preset first-question chips on the screen's empty state, and agent strings in all 13 locales (RTL included) exist. Analytics events are dropped from the plan because the app ships no analytics. The App Store screenshot refresh was not done, and Android was not verified.

## Alternatives Considered

### Hand-rolled SSE + UIMessage parser (no new dependencies) — rejected

Avoids adding `ai`/`@ai-sdk/react`, but re-implements a rich, versioned protocol — streamed tool inputs, tool states, approval semantics, data parts — that the platform will keep evolving with the SDK. The approval round-trip (`addToolApprovalResponse`, `sendAutomaticallyWhen`) alone is subtle state-machine work the SDK provides and tests. A bespoke parser is permanent protocol-maintenance debt against upstream.

### WebView embedding the dashboard `/agent` page — rejected

Fast to ship but wrong on every axis that matters here: the dashboard page authenticates with cookies (mobile holds a Bearer token in the keychain), the UI would ignore the app's theme/i18n/RTL conventions, native capture and haptics are unavailable, analytics go dark, and store review treats thin web wrappers poorly.

### Non-streaming Q&A over GraphQL mutations — rejected

Mobile already calls `parseReceipt` via GraphQL, so a request/response "ask" is tempting — but it forfeits streaming, the tool loop, and approvals, producing a second, lesser chat that diverges from the platform's primary mode. The platform's direction is the agent route.

### Wait for chat-history persistence before shipping — rejected

The backend-owned history design (dashboard ADR 001) is orthogonal: this client works today with client-held history and gains hydration when the history endpoints land. Sequencing mobile behind a backend roadmap item adds delay without reducing any risk in this decision.

## Consequences

### Positive

- Mobile becomes a full citizen of the platform's primary AI mode with **zero backend changes**, and the two clients speak one protocol — fixes and capabilities land on both.
- Ledger-write safety is preserved: every edit is user-approved on device, same as the web.
- The attachment pipeline and auth plumbing already exist on mobile; the genuinely new work is UI.
- Deferring history keeps this ADR small and consistent with the backend-owned persistence direction.

### Negative

- Two new dependencies (`ai`, `@ai-sdk/react`) in a Yarn 1 workspace, which need version coordination with the dashboard's copies during protocol upgrades. That coordination has already lapsed — mobile is one major behind on both — and nothing exercises the gated-off screen against the current route.
- Client-held history means a killed app forgets the conversation until backend persistence lands — accepted interim state.
- The approval cards are real RN UI work (diff rendering on small screens). They are frozen, so every ledger write the agent proposes on mobile is a trip to the web.
- A complete screen sits in the app unreachable behind a constant, with its dependencies and translations carried by every build.
- `expo/fetch` streaming behavior differs from browser fetch in edge cases (backgrounding, connection loss); needs explicit testing on both platforms.

## Implementation notes

P0 and P1 shipped as milestone m32 on the mobile app's own board (`mobile/.pm/w1/done/m32/`). The decision held; four things it did not anticipate are recorded here because they change what a reader should do next.

### `credentials: "omit"` is required, not hygiene

The P0 smoke ran four cases from inside the app. Bearer with cookies suppressed → **200**, streaming. A deliberately invalid Bearer → **401** (so the header is read and preferred, as `getTokenFromCtx` promises). **No header with cookies allowed → 200**: `expo/fetch` shares the native cookie store, the app holds a session cookie for the same origin, and the route falls back to it. No header with `credentials: "omit"` → 401.

That third case is the one to remember. Without `credentials: "omit"`, a client whose `Authorization` header broke would go on working — until the cookie expired, on a fresh install, or on someone else's device. The transport therefore omits cookies so the Bearer token is the only credential and an auth defect fails loudly and immediately.

### The error envelope is JSON, not a stream frame

Failures arrive as `application/json` with `{"ok":false,"error":{"code":"…","message":"…"}}` — `UNAUTHENTICATED` (401) and `RATE_LIMITED` (429, the AI-CFO quota). Clients should classify on `code` and treat quota as terminal for that turn: retrying a refusal earns a second refusal, so the quota case shows a neutral notice instead of a retry button (`mobile/src/screens/agent-screen/agent-errors.ts`).

### A turn can end without an answer

The server caps the agent at ten steps. A vague write request ("add a $5 coffee expense") spent all ten on `listLedgerFiles` + `readLedgerFiles` and finished with no text at all. Any client rendering this stream needs a state for _finished, ran tools, said nothing_ — otherwise the screen simply falls silent. This is separate from the error and approval states and easy to miss, because it only appears on questions that send the agent exploring.

### The approval refusal works, and the model's narration does not track it

Reaching `approval-requested` took a request naming the target file; vaguer phrasing exhausted the step budget first. When it was reached, the agent's own text said _"Proceeding with this operation"_ while the tool sat unexecuted, and the ledger's git history was identical before and after. The refusal is structural — `sendAutomaticallyWhen` is never passed to `useChat` and `addToolApprovalResponse` is never called — and it is what makes it safe to leave P2 unbuilt. It also means **a client must not infer that a write happened from what the model says about it.**

### Rendering markdown: `react-native-marked`

Agent answers are markdown, and the app renders them with **`react-native-marked`** (v8.1.1) rather than a hand-written reader. Adopted 2026-08-19, after the first implementation shipped a bespoke parser and the question "is there an off-the-shelf option for this stack?" was asked directly.

**Why this one.** `react-markdown` — what the dashboard uses — emits DOM and cannot cross to React Native, which is why mobile could not simply copy the web client. Of the RN options, `react-native-markdown-display` has been untouched since 2023 and its maintained fork carries the usual fork risk; `react-native-marked` is current, is built on `marked`, renders to real RN components, and its `react-native-svg` peer was **already installed** for the d3 charts.

**How it is wired.** The default export renders into a `FlatList`, which must not nest inside the chat's `ScrollView`; the library's `useMarkdown(value, { styles })` hook returns `ReactNode[]` instead and is what the message bubble uses. All colours are passed in from our theme tokens rather than using the library's own light/dark palette, so there is one source of truth for colour.

**What it bought, measured on device.** Correct hanging indents on wrapped list items, real heading weight, and — the one that matters — **correct list-marker placement under RTL for free**. The hand-rolled version had a Persian defect there that took a device walk to find and a layout fix to close; the library simply gets it right. It also brings tables, links and blockquotes, none of which the bespoke reader supported and all of which a BQL result could plausibly want.

**What it costs.** Seven transitive dependencies, and the bundle went from 3124 to 3175 modules.

**One accepted rough edge.** LaTeX preprocessing needs matched delimiters, so mid-stream a display block whose closing `\]` has not arrived yet shows its opening bracket as an escaped character for a moment. It resolves on the next delta; a test pins the behaviour so it reads as understood rather than missed.

### The feature ships gated off

`config.features.agentChat` in `mobile/src/config.ts` is a plain `false`. It gates **both** the Home entry card and the `/agent` route, so with it off the screen is unreachable even through a `beancount:///(app)/agent` deep link — gating only the card would leave the route open to anything that can fire a URL scheme.

Deliberately a constant rather than an `EXPO_PUBLIC_*` variable: the switch is then visible in the diff of whoever changes it, and no build can end up shipping the feature because of what happened to be in someone's shell. Turning it on is a code change, reviewed like one. (`__DEV__` was also rejected — it is false in TestFlight, which would hide the feature from exactly the people meant to try it.)

The gate stays off. With P2 frozen the surface can spend a user's AI quota and cannot review its own ledger writes, and un-gating is itself covered by the freeze in `mobile/.pm/DO_NOT_DO.md`.

### Amendments to the plan above

- **Deep links prefill and never submit, whatever opened them.** The P4 sketch had Home chips submitting on tap; that needs a signal a deep link cannot forge, and every Expo Router param is forgeable. The submitting chips live on the agent screen's empty state instead, where a tap is unambiguously human, and Home is a door. One rule, no second channel. (A related bug: reading `?q=` only in a `useState` initializer drops the question when the screen is already on the stack — it needs an effect, still prefill-only.)
- **Markdown is not optional, and it is not ours to write.** "Render text parts plainly" produced `**Cash/Assets**: 906.58 USD` on screen. That was first answered with a hand-rolled ~100-line reader; it has since been **replaced by `react-native-marked`** — see [Rendering markdown](#rendering-markdown-react-native-marked) above. What stays hand-written is only the part that is _not_ markdown: the LaTeX the model wraps arithmetic in.
- **Multiple text parts mean multiple steps** and must be joined as paragraphs, or the answer reads as `Let me try again.It seems…`.
- **Metro caches resolution across installs.** The first bundle after adding the SDK failed on a transitive `@opentelemetry/api` path that exists on disk; `npx expo start --clear` fixed it. Do not debug that error as a packaging problem.

## Open Questions

- `sessionId` is currently unused server-side; mobile will send it for forward compatibility — confirm its intended semantics before any server-side memory returns.
- Hydration shape once the backend history endpoints (dashboard ADR 001) exist: per-ledger chat list on mobile, or most-recent-chat restore only?
- Should `Accept-Language` steer the agent's answer language on mobile the way the dashboard sends it, given mobile's 13 locales?
- Tablet/iPad layout and whether the agent screen joins the tab bar or stays reachable from Home only.
- If the freeze is lifted: whether P2 approval cards should reuse a shared diff-rendering component with the ledger-file screens, and whether mobile's AI SDK majors must first be brought level with the dashboard's.

## References

Internal:

- `dashboard/src/features/ai-agent/pages/agent/page.tsx` — reference client: `useChat`, transport, approvals
- `dashboard/src/features/ai-agent/pages/agent/file-edit-approval.tsx`, `receipt-insert-approval.tsx` — approval-card UX to port
- `mobile/src/screens/receipt-capture-screen/use-receipt-workflow.ts` — existing presign → PUT → `objectKey` pipeline
- `mobile/src/screens/agent-screen/` (client: `use-agent-chat.ts`), `mobile/app/(app)/agent.tsx`, `mobile/src/config.ts` — the implemented screen, its route, and the gate
- `mobile/src/common/oauth/oauth-token-manager.ts`, `mobile/src/common/apollo/secure-session-storage.ts`, `mobile/src/common/request.ts` — Bearer token source, session custody, and endpoint base
- `mobile/.pm/DO_NOT_DO.md`, `mobile/.pm/w1/done/m32/` — the freeze on further work, and the milestone that shipped P0/P1
- `docs/adrs/ADR001-dashboard-chat-history-persistence.md` — backend-owned durable history (deferred dependency)
- `docs/adrs/ADR001-mobile-billing.md` — deferred; why the quota notice has no upgrade path
- `backend-cluster/backend-v2/src/features/ai-agent/api/agent-route.ts` — `POST /api-gateway/agent`: body shape, guards, UIMessage stream response
- `backend-cluster/backend-v2/src/features/auth/utils/auth.ts` — Bearer-header-first token resolution (the mobile auth path)
- `backend-cluster/backend-v2/src/features/ai-agent/tools/` — tool set; `needsApproval` on ledger-edit and receipt-insert tools

AI SDK:

- https://ai-sdk.dev/docs/getting-started/expo — Expo setup, `expo/fetch` streaming
- https://ai-sdk.dev/docs/ai-sdk-ui/chatbot — `useChat`, transports
- https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol — the UIMessage stream this client consumes
