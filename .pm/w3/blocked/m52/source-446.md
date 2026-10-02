# `bea ask` dies of "quota exceeded" with 88% of the account's AI quota unused, because it asks for no output cap

**Severity:** major (the command becomes unusable for hours; the only quota the
product exposes says there is plenty left). **Owner:** backend (AI proxy quota
semantics) + cli (request settings and quota visibility). **Estimate:** 45–60
minutes across the two sides. **A1:** `bea ask` is the agent-facing entry point
to a local ledger; fourteen short questions on a seven-account synthetic ledger
retired it for the rest of a five-hour window on a paid tier.

Found 2026-09-26 by CLI QA (`qa-find-bugs-cli`) against `main` HEAD `8cd9732b`,
`uv run bea` 0.3.0, Darwin 26.5.1 arm64, isolated `BEA_CONFIG_DIR`, synthetic
ledger, authorized QA account (tier `GROWTH`).

## Observed

After ~14 `bea ask --print` questions, every further question failed:

```sh
bea --file main.bean ask --print "what is 1+1?"
# Error: {"success":false,"error":{"code":"QUOTA_EXCEEDED","message":"API usage quota
#   exceeded",...,"exhaustedWindows":["FIVE_HOUR"],"blockedUntil":"…T13:06:15Z"},…}
# exit 1
```

At that same moment the only quota surface the product exposes disagreed:

```sh
GET /api-gateway/v1/account/ai-cfo-usage
# {"aiCfoTokensUsed": 242553, "aiCfoTokensMax": 2000000}      # 12% used
GET /api-gateway/v1/tier-quotas                               # GROWTH: aiCfoTokensMax 2000000
```

The refusal is not a flat window block — it depends on how many **output**
tokens the request reserves. Identical minimal chat-completions requests to
`/api-gateway/ai/openai/chat/completions`, issued seconds apart with the same
credential, same model, same 5-token prompt:

| `max_tokens` | result |
| --- | --- |
| 5 / 100 / 400 / 800 | `200` |
| 2000 | `402` `QUOTA_EXCEEDED` |
| omitted | `402` `QUOTA_EXCEEDED` |

`bea ask` never sets an output cap (`make_agent` in
`cli/src/cli/ask/agent.py` builds the `Agent` with no `model_settings`), so it
reserves the model default and is refused first — a client that sets a modest
cap keeps working against the same account.

## Expected

1. A quota refusal arrives as `429` with the product's own code and a message
   naming **which** quota was hit and when it resets — not `402` with
   `code: "INTERNAL_SERVER_ERROR"` and the upstream provider's JSON (including
   that provider's pricing and chat links) stringified into `error.message`.
2. The enforced limit and the quota the product reports to the user are the same
   quota. Either `ai-cfo-usage` reports the window that is actually enforced, or
   the enforced window is raised to match the tier allowance it advertises.
3. Reserving the model's default maximum output, rather than what a request is
   likely to use, must not be what refuses a request.

## Fix

- backend/AI proxy: translate the upstream quota rejection into the v1 error
  shape (`429`, own code, reset time), stop passing a third party's message and
  links through to customers, and reserve against expected rather than
  worst-case output when a request sets no cap.
- cli: give `ask` an explicit output cap through pydantic-ai's model settings
  (large enough for a full answer, small enough to fit a window), and surface
  remaining AI quota — `bea cloud status` already has the account context and
  `GET /api-gateway/v1/account/ai-cfo-usage` already exists, so a
  `AI quota: 242,553 / 2,000,000 tokens` line, plus that figure in the refusal
  remedy, would make the state legible.
- Regression coverage: proxy test asserting the mapped status/code/message for a
  quota rejection; CLI test asserting the outbound request carries an output cap.

## Dedupe

No `.pm` item mentions `max_tokens`, `QUOTA_EXCEEDED`, `402`, quota reservation,
or `ai-cfo-usage` for the CLI (`w3/done/195`, `w3/done/132`, `w3/done/110`,
`w4/done/m12` are dashboard/mobile AI-usage and subscription-tier items).
`git log --oneline --all -S"max_tokens" -- cli` is empty. `w3/445` is the
separate rendering defect that makes this refusal unreadable; fixing one does
not fix the other.

---

## Re-verified 2026-09-26 (run12) — core claim confirmed, the `max_tokens` table **corrected**

Re-checked after the `FIVE_HOUR` window in the original capture had reopened
(`blockedUntil` was `13:06:15Z`; these probes ran from `13:06:17Z`). Same HEAD
`8cd9732b`, `bea` 0.3.0, macOS 26.5.1 arm64, isolated `BEA_CONFIG_DIR`, same
authorized QA account (tier `GROWTH`).

### Corrected: the output cap is a near-exhaustion boundary, not a standing rule

Repeating the identical probe matrix against
`/api-gateway/ai/openai/chat/completions` with the window open:

| `max_tokens` | result (window open) | result (as originally filed, window exhausted) |
| --- | --- | --- |
| 5 | `200` | `200` |
| 400 | `200` | `200` |
| 800 | `200` | `200` |
| 2000 | **`200`** | `402` `QUOTA_EXCEEDED` |
| omitted | **`200`** | `402` `QUOTA_EXCEEDED` |

So the asymmetry is **not** a permanent property of the proxy: when there is
room in the window, an uncapped request is accepted. What the original capture
shows is the behaviour **at the edge** — as the window fills, the request that
reserves the model's default maximum output is refused first, while a request
with a small explicit cap still fits. That is still worth fixing (expected‑value
rather than worst‑case reservation, fix bullet 3), but this note previously read
as though an uncapped request were always refused. It is not. Anyone re-testing
this must first drive the account close to the enforced window or they will see
five `200`s and conclude the note is stale.

### Confirmed, with fresh numbers: the enforced window is not the advertised quota

Still true, and now quantified. `GET /api-gateway/v1/account/ai-cfo-usage`
read `242,601 / 2,000,000` (12.1%) at the moment the window reopened — i.e.
essentially unchanged from the `242,553` captured while the account was blocked.
Thirteen `bea ask` questions on small synthetic ledgers then moved it to
`270,065`: **+27,464 tokens, ~2,100 per question.** At that rate the advertised
`aiCfoTokensMax` of 2,000,000 is roughly 950 questions, while the account was
retired for a five-hour window after a small fraction of that. The counter does
move — it is simply not the counter being enforced, exactly as fix bullet 2 says.

### Confirmed: `ask` still sends no output cap

Verified from the wire rather than by reading the source. With `BEA_API_URL`
pointed at a local recording stub, the outbound body from
`bea ask --print` is:

```json
{"model": "gpt-4o", "stream": false, "messages": [...], "tools": [...], "tool_choice": "auto"}
```

No `max_tokens` key. `make_agent` (`cli/src/cli/ask/agent.py:120-133`) still
builds the `Agent` with no `model_settings`, so the CLI-side half of the fix is
untouched.

---

## CLI half shipped 2026-09-27 (`w3/done/m51`); the quota accounting remains backend work

Done in the CLI:

- every `ask` request now carries an explicit output cap
  (`MAX_OUTPUT_TOKENS`/`model_settings()` in `cli/src/cli/ask/agent.py`), read
  back from the outbound body in `cli/tests/test_ask_result_shape.py` — the body
  that used to name no cap now carries one;
- a quota refusal is retold in the CLI's own words: which quota, when it resets,
  and what to do meanwhile, with the proxy's `QUOTA_EXCEEDED` code found wherever
  the envelope nests it. Observed live:
  `Error: This account's hosted AI quota is used up, so the question was refused;
  nothing was written to your ledger. It resets at 2026-10-02T23:12:31Z. Run the
  query yourself with 'bea query' in the meantime.` (exit 1).

Still open, and **backend** (AI proxy quota semantics), with fresh evidence from
2026-09-27: eight short `bea ask` questions on small synthetic ledgers retired the
same `GROWTH` account again, and the block this time reads
`blockedUntil 2026-10-02T23:12:31Z` — **five days**, not five hours — while
`ai-cfo-usage` still reports on the order of 12% of a 2,000,000-token allowance.
The enforced window is not the quota the product reports, and the refusal still
arrives as `402` with the upstream provider's document stringified into
`error.message`. Fix bullets 1 and 2 (v1 error shape, `429`, own code, reset
time; and one quota that is both enforced and reported), plus expected- rather
than worst-case output reservation, belong in a backend milestone.

Remaining CLI follow-up, deliberately not done here: showing remaining AI quota
in `bea cloud status` from `GET /api-gateway/v1/account/ai-cfo-usage` — worth
doing once the reported counter is the enforced one, since a line quoting a
counter that does not govern the refusal would mislead. The nested-envelope
rendering defect is `w3/445`.
