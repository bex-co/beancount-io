# w3 · m47 — Make `bea format --in-place` a locked, atomic write

**Worker:** worker3 **Goal:** `bea format --in-place` writes the way every other
`bea` write already does — serialized on the ledger lock and staged into a
temporary file that atomically replaces the target — so it can neither discard a
concurrent `bea add` that reported success nor leave a 0-byte ledger behind when
it is interrupted. **Status:** done

## Tasks (in order)

| id   | title                                                        | est | depends_on |
| ---- | ------------------------------------------------------------ | --- | ---------- |
| t001 | Serialize `format --in-place` on the engine's ledger lock     | 40m | — | — **DONE**
| t002 | Stage the formatted bytes and replace each file atomically     | 50m | t001 | — **DONE**
| t003 | Document the write guarantee for `format` in `USAGE.md`       | 20m | t002 | — **DONE**
| t004 | Simplify                                                      | 20m | t003 | — **DONE**
| t005 | Test coverage                                                 | 45m | t003 | — **DONE**
| t006 | Closeout                                                      | 10m | t005 | — **DONE**

## Definition of done

- With a `bea add` in flight against the same ledger, `bea format --in-place`
  can no longer produce the outcome "`add` exit 0 + `format` exit 0 + the added
  directive absent": every run either keeps the appended directive or fails
  `add` with the existing exit-4 "the ledger changed during the operation"
  error. Verified by the offset sweep from `w3/434` (a 40 000-transaction
  fixture, `format -i` started at offsets across `add`'s duration).
- Sampling a target file's size for the whole duration of an uninterrupted
  `bea format --in-place` run never observes 0 bytes, and no intermediate
  half-formatted state is visible — today the file passes through 0 bytes twice
  per run (`w3/435`).
- SIGINT delivered at any point of a `format --in-place` run leaves every target
  file either byte-identical to its input or completely formatted, with exit
  130 and no `.bea-*` staging file left behind — the same contract `bea add`
  already satisfies. Verified by the `w3/435` harness, including the case that
  fires the signal the instant the target reads 0 bytes (5/5 zero-byte ledgers
  before the fix).
- `format --in-place` is idempotent and converges in one pass: running it twice
  produces no second change, so `--check` on the result exits 0.
- `cli/docs/USAGE.md` states the same "either the old file or the new file,
  never a partial one" guarantee for `format` that it states for the other
  writers, and the statement is true as written.

## Source + Goal linkage

- **Source:** inbox notes [434](../434.md) (concurrent `add` silently
  discarded) and [435](../435.md) (SIGINT leaves a 0-byte ledger), both filed
  and re-verified by continuous CLI QA on 2026-09-26. They are one defect with
  two symptoms: `cli/src/cli/commands/format.py` `_format_in_place` is the only
  writer in the CLI that neither takes the lock (`grep -rn lock_file src/`
  finds exactly one caller, `bea_engine/ledger/write.py`) nor stages its output
  — it lets upstream `bean-format --in-place` truncate the file and then does
  its own `file.write_bytes(...)` on top.
- **Goal linkage:** A1 — agent-native accounting depends on a ledger that never
  silently loses a write. An agent, a pre-commit hook or a file watcher running
  `bea format -i` alongside an append is an ordinary setup, and today it can
  destroy the append or the whole file while both commands report success.
- **Expected outcome:** every `bea` command that writes a ledger file offers the
  same guarantee, so an agent can run `format -i` in a hook or a loop without a
  data-loss risk and without coordinating with other `bea` processes.
- **Why now:** this is the only *silent* data-loss path reproduced in the
  2026-09-26 CLI QA rounds — exit 0 on both sides with the data gone — and it
  needs no new design, only the lock and staging helpers the engine already has.
- **Adoption surface task included** (t003): the write guarantee is a documented
  promise users and agents rely on, and `USAGE.md` currently describes it only
  for the other writers.
