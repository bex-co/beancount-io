# w3 · m51 — Answer from bounded, unambiguous query results

**Worker:** worker3 **Goal:** when `bea ask` states a number about a local
ledger, that number is right: a total of zero reads as a zero rather than as
missing data, a row count says what was counted, the queries the prompt
documents are the ones the question needs, and no result is large enough to be
refused by the gateway instead of answered. **Status:** done

## Tasks (in order)

| id   | title                                                                     | est | depends_on |
| ---- | ------------------------------------------------------------------------- | --- | ---------- |
| t001 | Give the model rows, a row count and the relation instead of a text table | 40m | —          | — **DONE**
| t002 | Render a zero as `0`, and say what a zero means                           | 25m | t001       | — **DONE**
| t003 | Bound the tool result in rows and characters, with a disclosure line      | 30m | t001       | — **DONE**
| t004 | Teach the prompt the query shapes that came back wrong                    | 35m | t002       | — **DONE**
| t005 | Cap the output, and translate connection and quota refusals               | 30m | —          | — **DONE**
| t006 | Document the result and failure contract in `docs/USAGE.md`               | 20m | t004, t005 | — **DONE**
| t007 | Simplify                                                                  | 15m | t006       | — **DONE**
| t008 | Test coverage                                                             | 45m | t006       | — **DONE**
| t009 | Closeout                                                                  | 10m | t008       | — **DONE**

## Definition of done

- A query whose only row is an empty Inventory comes back to the model as
  `1 row(s) …` with a cell reading `0` and a sentence saying the matched postings
  cancelled out; no whitespace-only cell reaches the model, and "no rows" is
  reported as `0 row(s)` and distinguished from a zero (`w3/447`).
- Every tool result states how many rows it has and which relation they came
  from, and a postings result says a row is a posting — so `SELECT count(*)`
  returning 22 cannot be read as 22 transactions (`w3/455`).
- `_SYSTEM_PROMPT` carries worked examples for counting entries
  (`FROM #entries WHERE type = 'transaction'`), top-N ranking (`ORDER BY … DESC
  LIMIT`), a balance as of a date, and single-currency holdings; the false claim
  that `FROM` is never a table name is gone; every documented example runs
  against the engine (`w3/455`, `w3/447`).
- A tool result is truncated at a documented budget (200 rows / ~12,000
  characters) with a `… truncated: showing the first N of M rows` line that tells
  the model to disclose it, so enumerating a 15,000-transaction ledger returns a
  truncated answer instead of `request entity too large` (`w3/448`).
- A connection-level failure from the AI SDK reads the same as everywhere else in
  the CLI — `Could not reach the server (…)`, never the SDK's bare
  `Connection error.` (`w3/448`).
- Every request carries an explicit output cap instead of reserving the model's
  default allowance, and a quota refusal names the quota and when it resets
  (`w3/446`, CLI half).
- Live answers on the notes' own fixtures are correct: net worth as of a date,
  EUR holdings, transaction count, largest expense — and the balance and
  period-total questions that were already right stay right.
- `make check-all` passes, with regression coverage per bug.

## Source + Goal linkage

- **Source:** inbox notes [447](../447.md), [455](../455.md), [448](../448.md)
  and the CLI half of [446](../../blocked/m52/source-446.md) — the `bea ask` answer-correctness and
  request-budget cluster from the continuous CLI QA rounds of 2026-09-26. All
  four live in `cli/src/cli/ask/agent.py`'s query-result and prompt layer, so
  they were fixed in one pass.
- **Goal linkage:** A1 — `ask` is the agent-facing read surface over a local
  ledger. A wrong number stated as fact at exit 0 is worse than a refusal,
  because the whole value of the surface is that nobody has to check it.
- **Expected outcome:** a user or agent asking `bea ask` for a balance, a count,
  a ranking or a currency holding gets the right number, and a question whose
  result is too large gets a truncated answer that says so rather than a
  transport error.
- **Why now:** three of the four notes are confidently wrong financial answers,
  reproduced live 2/2 and 2/4; they share one function (`run_bql_query`) and one
  prompt, so fixing them separately would have meant rewriting the same result
  shape three times.
- **Adoption surface task included** (t006): the result contract, the truncation
  budget and the network sentence are promises `cli/docs/USAGE.md` makes.

## Verification

- **Live** (hosted `gpt-4o` through the beancount.io proxy, isolated
  `BEA_CONFIG_DIR`, synthetic fixtures from the notes), 2026-09-27: net worth as
  of 2024-03-01 → `4,500.00 USD`; EUR holdings → `800.00 EUR`; transaction count
  → `11` twice; largest expense → `1200.00`, Landlord, February rent, twice;
  checking balance → `2,414.75 USD` and February expenses → `1,510.00 USD`
  unchanged. Seven of the eight pre-fix failures answered right, and the
  correct-before shapes did not regress.
- **Simulated** (local stub model server over `BEA_API_URL`): the output cap on
  the wire, the truncated tool result inside the request body, the network
  sentence against a closed port, and the quota refusal's wording.
- The eighth live question — enumerating the 15,000-transaction ledger — was
  refused by the account's AI quota (`blockedUntil 2026-10-02T23:12:31Z`, after
  ~8 short questions on a 2,000,000-token allowance reading 12% used), so the
  truncation path's live confirmation is outstanding and the quota-accounting
  defect stays on [446](../../blocked/m52/source-446.md) as backend work.
