# w2 · m30 — AI reliability hardening (ADR 0011 follow-ups)

**Worker:** worker2 **Goal:** every ADR 0011 follow-up closed — the AI ingestion path cannot crash the process, the vendor fallback genuinely works, models are config not code, failures surface with their real cause on every client, and a dead credential is detected before a user finds it **Status:** in progress (t001–t005, t007–t009 done; t006 blocked on an operator ANTHROPIC_API_KEY; t010 pending t006)

## Tasks (in order)

| id   | title                                                                 | est | depends_on |
| ---- | --------------------------------------------------------------------- | --- | ---------- |
| t001 | Contain the parseFile process crash + survival regression test         | 90m | — — **DONE** |
| t002 | Make the OpenAI fallback real: schema fixes + strict-compat gate       | 60m | — — **DONE** |
| t003 | Move model pins into config (LLM_MODEL / LLM_FALLBACK_MODEL)           | 45m | t002 — **DONE** |
| t004 | Mobile receipt errors: classify by code, split messages, Sentry        | 60m | — — **DONE** |
| t005 | Path B synthetic LLM probe (startup + scheduled)                       | 30m | — — **DONE** |
| t006 | Haiku downgrade evaluation for extraction workloads                    | 45m | t003 — **BLOCKED (needs ANTHROPIC_API_KEY)** |
| t007 | Adoption surface: env-var docs + mobile strings + agent-facing checks  | 30m | t001, t004, t005 — **DONE** |
| t008 | Simplify: run /simplify over the changed code                          | 30m | t007 — **DONE** |
| t009 | Test coverage: meaningful tests for shipped behavior                   | 45m | t007 — **DONE** |
| t010 | Closeout                                                               | 15m | t009, t006 |

## Definition of done

- A `parseFile` request whose LLM upstream fails returns a 500 and the process stays up (regression-tested).
- `parseReceipt` succeeds end-to-end with only `OPENAI_API_KEY` set (fallback leg proven), and a static schema test rejects any `Output.object` schema that violates OpenAI strict `response_format` rules.
- Backend model ids come from config with documented env vars; no dated-snapshot literals in `src/`.
- The mobile receipt screen shows distinct messages for upload, parse, and quota failures, and reports the raw error to Sentry.
- An unconfigured or dead LLM credential is visible in logs within minutes of boot, not on first user contact.
- A Haiku-vs-Sonnet eval result for receipt/file extraction is recorded with a documented keep/switch decision.

## Source + Goal linkage

- **Source:** the 2026-09-07 receipt-parse production outage and its diagnosis, documented in `docs/adrs/ADR011-backend-v2-ai-api-usage.md` (Follow-up list + tier-3 discussion, user-approved 2026-09-09); user routed to w2 as one milestone.
- **Goal linkage:** A1 — receipt/file parsing, AI categorization, and the agent chat are the assisted-accounting surfaces both humans and coding agents rely on; they must fail rarely, fail loudly, and never take the platform down. Secondary A3: a platform whose AI features 500 silently (or crash prod on one request) loses community credibility faster than any launch can build it.
- **Expected outcome:** an operator can run the stack with zero, one, or two LLM vendors and always get honest behavior — clear per-call errors when unconfigured, working failover when both keys are set, a probe that catches dead credentials, and mobile error messages a user can act on. Extraction cost is either cut ~3-5× (Haiku) or the Sonnet choice is backed by eval data.
- **Why now:** the outage proved each gap in this milestone with a production incident or a dead code path; ADR 0011's decisions (D5, D6) are written but two remain unimplemented, and the tier-1/2 cleanups just shipped — this closes the remaining distance while the context is fresh. Adoption surface task included: env-var documentation and mobile-visible strings ship to users and operators.
