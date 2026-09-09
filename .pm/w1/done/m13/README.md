# w1 · m13 — Reads and reports: strict for automation, lenient for people

**Worker:** worker1 **Goal:** a person at a terminal always gets their numbers, with problems stated once in a banner; a script or agent keeps today's refuse-unless-`--allow-errors` contract, and converted amounts never show more decimals than the currency has **Status:** done

## Tasks (in order)

| id   | title                                                                                   | est | depends_on |
| ---- | --------------------------------------------------------------------------------------- | --- | ---------- |
| t001 | One strictness policy: lenient in a terminal, strict under `--json`, non-TTY, or `--strict` — **DONE** | 45m | —          |
| t002 | Reports convert what has a price and keep the rest in units, one line per commodity — **DONE**     | 60m | t001       |
| t003 | Quantize converted amounts to the currency's display precision in text output — **DONE**           | 30m | t002       |
| t004 | Document the policy in USAGE, README, and a PRFAQ amendment — **DONE**                              | 30m | t003       |
| t005 | Adoption surface — **DONE**                                                                        | 20m | t004       |
| t006 | Simplify — **DONE**                                                                                | 30m | t005       |
| t007 | Test coverage — **DONE**                                                                           | 45m | t005       |
| t008 | Closeout — **DONE**                                                                                | 15m | t007       |

## Definition of done

- On a ledger with one failed balance assertion, `bea list transaction`, `bea query "…"`, and every `bea report` in a terminal print the data with the errors in a banner on stderr and exit 0; the same commands with `--json`, with stdout piped, or with `--strict` exit 1 unless `--allow-errors` is passed. `bea check` is unchanged.
- The stock `bean-example` ledger renders `bea report overview`, `balance-sheet`, and `income-statement` in a terminal with unpriced commodities shown in their own units and a summary of at most one line per missing commodity, not one line per interval date.
- A ledger with a EUR posting and a single later EUR→USD quote produces `4.91 USD`, not `4.9050 USD`, in text reports; JSON keeps the full-precision string.
- `cli/docs/USAGE.md` and `cli/README.md` describe the policy in one place each, and `cli/docs/PRFAQ.md` carries a dated amendment.
- `make check-all` passes from `cli/`.

## Source + Goal linkage

- **Source:** CLI UX review 2026-09-08 — a developer and beancount-user walkthrough of `cli/README.md`, `cli/docs/`, and `bea 0.1.0`. Findings: one stale balance assertion blocks every read until `--allow-errors`; the stock `bean-example` ledger fails all converted reports with a 40-line wall of "No VACHR → USD price"; converted amounts leak four decimals.
- **Goal linkage:** **A2 — Frictionless onboarding:** the first report a newcomer runs on a realistic ledger must succeed. **A1 — Agent-native accounting:** the automation contract (`--json` refuses partial answers) is preserved verbatim, so agents keep their guarantees.
- **Expected outcome:** a newcomer with vacation hours or a sporadic price history sees a balance sheet on the first try; reconciliation stays usable while an assertion is red; no user reports "the CLI shows 4.9050 USD".
- **Why now:** these are the two behaviors most likely to make a first-week user conclude the CLI is broken, and both fixes are small because the partial-valuation and error-rendering paths already exist behind flags. Sequenced before the first-month tutorial (m17) so the tutorial does not have to teach `--allow-errors`. Adoption surface included: the change is visible in every read command's output and docs.
