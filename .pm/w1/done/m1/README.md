# w1 · m1 — Ask-page quick wins: focus, preset questions, stop & retry

**Worker:** worker1 **Goal:** make the Ask Beancount.io chat page (`/ledger/:owner/:name/ask`) immediately usable: keyboard-first, self-explaining empty state, no stuck or dead-end states **Status:** done

## Tasks (in order)

| id   | title                                          | est | depends_on                         |        |
| ---- | ---------------------------------------------- | --- | ---------------------------------- | ------ |
| t001 | Autofocus + keyboard polish                    | 30m | —                                  | **DONE** |
| t002 | Preset question pool + i18n keys               | 45m | —                                  | **DONE** |
| t003 | Empty-state suggestion chips wired to `?q=`    | 45m | w1/m1/t002                         | **DONE** |
| t004 | Stop/cancel button during streaming            | 45m | —                                  | **DONE** |
| t005 | Retry button on error states                   | 30m | —                                  | **DONE** |
| t006 | Adoption surface                               | 20m | w1/m1/t001, t002, t003, t004, t005 | **DONE** |
| t007 | Simplify                                       | 20m | w1/m1/t006                         | **DONE** |
| t008 | Test coverage                                  | 45m | w1/m1/t006                         | **DONE** |
| t009 | Closeout                                       | 10m | w1/m1/t007, w1/m1/t008             | **DONE** |

## Definition of done

On `/ledger/:owner/:name/ask`: the input is focused on page load (desktop; not on touch devices), `Esc` clears the input and focus returns after each answer; the empty state shows 3–4 rotating preset question chips in the active locale that submit on click and disappear once the conversation starts; a stop button aborts an in-flight stream; every error state offers one-click retry of the last question.

**Verified:** behavior asserted by 12 new/updated tests in `dashboard/src/features/ai-agent/pages/ask-ai/__tests__/` (focus, coarse-pointer skip, Esc, chips render/submit/hide, stop-abort, retry resubmission, no-retry-on-limit); full dashboard suite (3140 tests), `yarn lint`, `tsc`, and `yarn build` all green (2026-07-31).

## Source + Goal linkage

- **Source:** AI-chat UX review captured via `/pm` invocation (2026-07-31); code-grounded findings in `dashboard/src/features/ai-agent/pages/ask-ai/` (notably the existing `?q=` auto-submit mechanism at `index.tsx`, which preset chips reuse).
- **Goal linkage:** **A2 — Frictionless onboarding.** Preset questions teach a newcomer what the AI can do with *their* ledger data in one click; autofocus/keyboard flow, stop, and retry remove the three most common dead-ends in the first chat session. Secondarily **A1 — Agent-native accounting**: the chat is the dashboard's agent surface and this raises its floor.
- **Expected outcome:** a new dashboard user lands on Ask and fires a meaningful first question in one click; power users complete a Q&A loop without touching the mouse; no session ends stuck on a typing indicator or a dead error message.
- **Why now:** cheap, frontend-only fixes (no backend dependency) that should land before the larger P1 investments (conversation persistence, suggested follow-ups). Adoption surface closing task is included because this ships user-facing changes.

## Closeout notes

- t007: `/simplify` is not defined in this repo's `.claude/commands/` — performed a manual behavior-preserving simplification pass instead (removed a redundant double `preventDefault` wrapper and the now-dead `initialQuestion` initial input state).
- t006: updated one stale code pointer in `dashboard/docs/product-analytics-review.md` (`handleSubmit` → `submitQuestion`); no other docs described pre-milestone behavior. New keys resolve through the locale aggregation layer (proven by tests rendering via `@/i18n/locales`).
- Scope note: the chips component submits directly through `submitQuestion` rather than a literal `?q=` navigation — same submission path the `?q=` deep link now also uses.
