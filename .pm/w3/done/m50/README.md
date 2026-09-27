# w3 · m50 — Make the `ask` consent surface honest and its session survivable

**Worker:** worker3 **Goal:** what `bea ask` shows before an AI-proposed write is
exactly what the write will do — the right file, the right bytes, on a panel its
own contents cannot repaint — and one interrupt, one failed turn or one looping
model costs that turn rather than the conversation. **Status:** done

## Tasks (in order)

| id   | title                                                                      | est | depends_on |
| ---- | -------------------------------------------------------------------------- | --- | ---------- |
| t001 | Refuse control characters in raw appended directive text                   | 30m | —          | — **DONE**
| t002 | Neutralize the `ask` render paths: approval panel and both answer prints    | 30m | t001       | — **DONE**
| t003 | Name the destination the dry run resolved, where it cannot be trimmed      | 30m | t002       | — **DONE**
| t004 | Let a Ctrl-C or a failed turn cost the turn, not the session               | 40m | —          | — **DONE**
| t005 | Give one question an explicit budget, and retell the SDK's failures        | 35m | t004       | — **DONE**
| t006 | Document the consent and session contract in `docs/USAGE.md`               | 20m | t003, t005 | — **DONE**
| t007 | Simplify                                                                   | 20m | t006       | — **DONE**
| t008 | Test coverage                                                              | 50m | t006       | — **DONE**
| t009 | Closeout                                                                   | 10m | t008       | — **DONE**

## Definition of done

- Raw directive text carrying a C0/C1 control character (except tab, LF and CR)
  is refused by the engine append path with `Write rejected: … nothing was
  written`, so no `ask`-approved write can leave a control byte in a `.bean`
  file, and a clean directive still appends (`w3/451`).
- The approval panel and the answer render — in both `--print` and session mode —
  escape every control character to a visible `\xNN`, so no model-controlled byte
  can move the cursor on the surface that asks for consent (`w3/451`).
- The panel names the append destination the engine's own dry run resolved: with
  `--into side.bean` it says `side.bean`, not the root ledger, and prints the
  path in the panel body where Rich cannot trim it away (`w3/452`).
- In a session, Ctrl-C at the prompt clears the line and Ctrl-C during a turn
  abandons that turn; a failed turn prints the failure and returns to the prompt
  with the earlier history intact; Ctrl-D still exits 0; a rejected credential is
  the one deliberate exception and ends the session with exit 3 (`w3/449`).
- `ask` sets its own per-question ceiling instead of inheriting the AI SDK's 50
  requests, and every SDK run failure is retold in the CLI's own words: no
  third-party limit name, no knob the CLI does not expose, no `ai.pydantic.dev`
  URL, and a statement that nothing was written (`w3/449`, `w3/454`).
- `cli/docs/USAGE.md` states the consent rules and the per-turn failure contract,
  and each statement is true as written.
- `make check-all` passes, with regression coverage per bug: unit tests for the
  refusal, the panel and the translation, and real-PTY tests asserting emitted
  bytes for the rendering and the session's survival.

## Source + Goal linkage

- **Source:** inbox notes [451](../451.md), [452](../452.md), [449](../449.md)
  (which absorbed the dropped `453`) and [454](../454.md) — the `bea ask`
  consent-and-session cluster from the continuous CLI QA rounds of 2026-09-26.
  All four live in the same two files, so they were fixed in one pass.
- **Goal linkage:** A1 — the write-approval panel is the only gate between an
  AI-proposed directive and a user's books, and the multi-turn session is the
  flagship agent-facing surface. A consent dialog that can be repainted by the
  text it is asking about, or that names the wrong file, is worse than no gate;
  a session that dies on its own error costs the conversation and the tokens
  already spent on it.
- **Expected outcome:** a user or agent running `bea ask` can trust the
  confirmation — right file, right bytes — and can work through a conversation
  without a stray Ctrl-C, a transient server error or a model's bad query
  throwing the session away; when a question cannot be answered, the CLI says so
  in its own words and confirms nothing was written.
- **Why now:** `w3/done/392` established the "no control character reaches a
  ledger file or a terminal" invariant everywhere except `ask`, which is the one
  surface where the text is model-controlled; and the session-lifetime defect was
  observed live on roughly one in two ordinary questions, so the interactive
  surface was effectively unusable for a multi-turn conversation.
- **Adoption surface task included** (t006): the consent behavior and the session
  contract are documented promises in `cli/docs/USAGE.md` that users and agents
  rely on literally.
