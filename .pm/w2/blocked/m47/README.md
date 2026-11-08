# w2 · m47 — Turn PDF statements and receipt photos into checked entries with documents attached

**Worker:** worker2 **Goal:** a user whose bank offers only PDF statements, or who has a photo or PDF of a receipt, gets the same reviewed, deduplicated entries a CSV export produces, with the source file attached to the ledger. Extracted rows never count as imported until a `balance` assertion ties them to the statement's closing balance. **Status:** todo (t001–t002 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| [t001](./done/t001.md) | Decide where a PDF statement imports, how its rows are identified, and how they dedup against a later CSV — **DONE** | 45m | w2/079 |
| [t002](./done/t002.md) | Import a PDF statement as checked entries, with the statement attached — **DONE** | 75m | t001 |
| t003 | Turn a receipt image or PDF into a proposed entry, with the receipt attached | 45m | t001, w2/m40/t010 |
| t004 | Write evals with synthetic PDF statements and receipts | 60m | t002, t003 |
| t005 | Run the evals and the routing set on Claude Code and Codex | 45m | t004 |
| t006 | Adoption surface | 30m | t005 |
| t007 | Simplify | 15m | t006 |
| t008 | Test coverage | 45m | t006, t007 |
| t009 | Closeout | 15m | t008 |

## Blocked

- **t003 onward (2026-10-19)** — t001 (placement, `pdf:sha256`, Layer 2c) and t002 (the PDF import path) are shipped. t003 depends on [m40](../../done/m40/README.md)'s closeout (t010), which waits for Codex usage or the owner's exception decision, so t003–t009 cannot proceed. **Unblock:** m40 closes; then t003 starts (t005 additionally needs Codex for its both-client runs, including the t001 probe rerun). **Who can clear it:** the operator (Codex usage) or the repository owner (m40 exception).

## Definition of done

- A PDF statement imports through the skill that t001 chose. The skill proposes entries only when opening balance + extracted movements = closing balance. It reports success only after a `balance` assertion dated the day after the statement period passes `bea check`. A statement that does not tie stops before any write, and the skill names the gap.
- Every written row carries an `import-id` in the form t001 adds to `beancount-import/references/dedup.md`. Re-importing the same PDF adds zero entries. A later CSV export covering the same period shows every overlapping row as a suspected duplicate instead of writing it again.
- A receipt image or PDF becomes a proposed `beancount-add` entry. After a yes, the transaction and its `document` directive share a link, and the file sits where the ledger keeps documents. `bea check` passes, and it fails when the file is missing.
- An instruction embedded in a statement or receipt is recorded or flagged, and never followed ([079](../../done/079.md)'s rule).
- The routing set includes PDF-statement and receipt-file prompts, and they route correctly on both clients. The new evals pass on Claude Code and Codex, recorded with versions and dates.

## Decisions

- **Placement (t001, 2026-10-19):** `beancount-import` owns "import this PDF statement". It reuses `beancount-reconcile`'s extraction reference (`references/statement-formats.md`, shared not copied — t002 adds the pointer) and finishes with reconcile's tie-out: propose only when opening + movements = closing, then the day-after `balance` assertion. `beancount-reconcile` keeps "compare my account to this statement". Routing evidence: two probe prompts ("Import my June statement PDF into my ledger — my bank has no CSV export", "Record the transactions in ./may-statement.pdf in my ledger") run through `run-routing.py` at `980bfd353` against the local suite — Claude Code 2.1.289 (`claude-opus-5-5[1m]`) opened `beancount-reconcile` for **both**, because today only reconcile's text mentions PDF statements; that is the gap t002 closes by widening import's triggers, not evidence that reconcile should own importing. Codex 0.163.0 (`gpt-6-luna`) returned its account usage-limit error for both prompts and has **not** routed them yet; t005 must rerun these prompts on Codex after t002, before this milestone's both-clients claim can be made.
- **PDF row identity (t001):** `pdf:sha256:<16-hex>` over the same normalized hash input as the CSV form, description = the statement line as printed (wraps joined, then the shared normalization), occurrence suffix within one statement in printed order. Normative text and a worked example are in `beancount-import/references/dedup.md` ("PDF statement rows"). Sharing the hash input means identically worded PDF/CSV rows exact-match across sources; `beancount-reconcile`'s PDF proposals use the `pdf:` form from now on (its text already defers to `dedup.md`).
- **Cross-source review (t001):** new Layer 2c in `dedup.md` — same amount to the source account within ±3 days across different `import-id` source kinds is a suspected-duplicate pair to present, no description similarity required. This confirms the Why-now inference: before Layer 2c, a later CSV could double-book PDF-recorded rows (Layer 1 misses on wording, Layer 2 skips id-bearing entries).
- **CLI (t001):** no `bea import` change is needed for the skill path — the CLI already indexes the bare digest of any `<prefix>:sha256:` id, and the skills run Layer 2c themselves like Layers 2/2b. Drafted follow-up for `/pm add` (not filed here): "`bea import` run directly on a CSV does not flag same-purchase rows recorded earlier from a PDF (different wording, ±3 days); consider widening its possible-duplicate report across source kinds, or document that mixed-source months should import through the skill."

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-10-18, item 7, from online research into published Beancount skills and user needs. Evidence: a user who has Claude [read a PDF when the PDF-to-beancount script breaks](https://alexcwatt.com/beancount/); [Beanhand](https://github.com/Rudd-O/beanhand) (receipts to transactions, receipts linked to entries); Fava's open request for [document upload from the transaction form](https://github.com/beancount/fava/issues/566); receipt and PDF stages in [cfo-stack](https://github.com/MikeChongCan/cfo-stack) and [auto-bean](https://github.com/SamArgt/auto-bean).
- **Goal linkage:** **A1 — Agent-native accounting:** an agent records what a statement or receipt shows, with the suite's proposal, dedup, and check rails, instead of the user retyping it. **A2 — Frictionless onboarding:** a newcomer whose bank has no CSV or OFX export can still start a ledger from the PDFs they already have.
- **Expected outcome:** an import or receipt request that names a PDF or an image produces entries tied out by a passing balance assertion, with the file linked from the ledger. Signals: routing-set recall for the new prompts, and invocations of `beancount-import` and `beancount-add` with file inputs.
- **Why now:** `beancount-reconcile` already reads PDF statements and writes missing transactions with generated `import-id`s. Those ids hash the PDF's wording, and `dedup.md`'s fuzzy layer only looks at entries without an `import-id`. So a later CSV of the same month can likely double-book every row, and t001 confirms or rules out this inference. Defining PDF row identity now fixes that path, and it gives the new import path a sound base. The milestone depends on [079](../../done/079.md), because statement and receipt text are an injection surface, and on [m40](../../done/m40/README.md), which ships `beancount-add`. Adoption surface is included because two customer skills gain a new input type.

## Out of scope

- OCR services, cloud extraction, or a new parsing dependency. The agent reads the file with its own client. When it cannot, the skill asks for the text or a CSV.
- Downloading statements by driving the user's logged-in browser, which was rejected in the brainstorm because it hands an agent a live banking session.
- The hosted `parseReceipt` MCP flow and hosted ledgers.
- Brokerage statements with holdings and lots (w2/m45), and statements that cover several accounts at once.
- Changing `bea import`'s duplicate detector. If t001 finds the CLI must change, file that as a follow-up note.
