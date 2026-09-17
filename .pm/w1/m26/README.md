# w1 · m26 — Ledgers survive Windows editors and Unicode

**Worker:** worker1 **Goal:** a ledger written by a Windows editor or containing non-ASCII account names behaves exactly like an LF-only ASCII one: it loads, it appends cleanly, and equivalent Unicode spellings are one account **Status:** todo (t001, t002, t003, t004 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Load ledgers saved with a UTF-8 BOM — **DONE** | 30m | — |
| t002 | Match the file's line endings and repair a missing final newline — **DONE** | 45m | — |
| t003 | Report undecodable inputs with the path and the byte offset — **DONE** | 30m | — |
| t004 | Normalize account names and search to NFC — **DONE** | 60m | — |
| t005 | Handle embedded CR/LF in note, event, and custom string fields | 30m | — |
| t006 | Adoption surface | 25m | t001, t002, t003, t004, t005 |
| t007 | Simplify | 30m | t006 |
| t008 | Test coverage | 45m | t006, t007 |
| t009 | Closeout | 15m | t008 |

## Definition of done

- A ledger saved as UTF-8 with BOM and CRLF line endings — the Windows Notepad default — round-trips through `bea check`, `bea add`, `bea import --apply`, and `bea format -i`: every command succeeds, the file never ends up with mixed line endings, and `bea format -i` removes the BOM.
- A ledger with no final newline accepts an append instead of failing, and the append stays atomic.
- An account spelled NFD in one file and NFC in another resolves to a single account with a single balance and no false unknown-account error; `--search` and BQL `~` match a narration regardless of its normalization; the writer emits NFC.
- An undecodable ledger or JSON input fails with its path, byte offset, and attempted encoding named, as a structured error under `--json`; BOM-prefixed JSON input is accepted, matching BOM CSV.
- `bea add note`, `add event`, and `add custom` treat embedded CR/LF exactly as `add transaction` does, and any successful write leaves a ledger `bea check` accepts.
- `cli/docs/USAGE.md` documents these file conventions, the tutorial completes on a BOM plus CRLF ledger, and `cd cli && make check-all` passes.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w1` 2026-09-16, item 4. Absorbs continuous CLI QA inbox notes w3/248, 251, 252, 257, 258, 266, 275, 278 (major), 283.
- **Goal linkage:** **A2 — Frictionless onboarding**, with **A1** for agent writes: a first-contact failure on the first file a Windows editor produces is the steepest possible onboarding cliff, and an agent writing through an editor that emits CRLF hits the same wall.
- **Expected outcome:** A Windows user installs `bea`, creates a ledger in whatever editor they already use, and every command works — instead of `Invalid token: '\ufeffoption'` on the first `bea check`.
- **Why now:** w1/m22 put Windows wheel and sdist installs into CI, so `bea` installs cleanly on Windows today; the first ledger a Windows editor saves then fails to load. Shipping the install path without the file-convention fixes leaves that audience one step from working. The Unicode half is the same class of defect and shares the reader and writer code paths.
- **Adoption surface:** included — file conventions, the tutorial's first steps, and the scaffolding skills are all customer- and agent-facing.
