# w3 · m48 — Refuse output destinations that would destroy files the command was not given

**Worker:** worker3 **Goal:** every `bea` command with an output destination
applies one rule before it writes — a destination that is the ledger under read
(root or any include, any spelling) or that would replace a file the command was
never given is refused with exit 2, naming the colliding path — so no `-o` /
`--output` can silently destroy a user's data. **Status:** done

## Tasks (in order)

| id   | title                                                              | est | depends_on |
| ---- | ------------------------------------------------------------------ | --- | ---------- |
| t001 | Apply the ledger-alias guard to forwarded `-o` (`ingest`, `treeify`) | 45m | —          | — **DONE**
| t002 | Refuse a `price export --output` that would overwrite foreign files  | 40m | —          | — **DONE**
| t003 | Document one output-destination rule across the commands that have one | 25m | t001, t002 | — **DONE**
| t004 | Simplify                                                           | 20m | t003       | — **DONE**
| t005 | Test coverage                                                      | 40m | t003       | — **DONE**
| t006 | Closeout                                                           | 10m | t005       | — **DONE**

## Definition of done

- `bea ingest extract -o <path>` is refused with exit 2, before anything is
  written, when `<path>` aliases the resolved ledger closure (root or any
  include) or the `-e/--existing` ledger's closure — for every spelling
  (`-o X`, `-oX`, `--output X`, `--output=X`) and through symlinks and hard
  links. `bea treeify -o <path>` is refused on the same basis, and at minimum
  refuses an existing `.bean`/`.beancount` file without `--force`, matching
  `bea example -o`.
- `bea ingest extract -o <new file>` still works, and `ingest archive -o DIR`
  (a document move, not a ledger write) is unaffected.
- `bea price export --output DIR` refuses before writing when any file it would
  create already exists in `DIR` and did not come from the export, naming the
  colliding path and offering the same `--force` opt-in `bea example -o` has.
  Verified with the `w3/436` repro, which needs no account: signed out with
  `--allow-errors`, a pre-existing unrelated `DIR/main.bean` must survive
  unchanged instead of being replaced at exit 0.
- The default `<ledger>-export/` destination gets the same check when it already
  exists.
- After every refusal, the destination tree is byte-identical, including its file
  list, and the exit code is 2 (`example`'s existing-destination code 4 stays as
  documented for `example`).

## Source + Goal linkage

- **Source:** inbox notes [431](../431.md) (`ingest extract -o` / `treeify -o`
  replace the root ledger or an included file, exit 0) and [436](../436.md)
  (`price export --output DIR` replaces whatever already lives in `DIR`,
  including another ledger's `main.bean`, exit 0), both filed and re-verified by
  continuous CLI QA on 2026-09-26. One cause family: the guard exists
  (`output.refuse_ledger_alias`, `cli/src/cli/output.py:235`, used by `query.py`
  and `format.py`, and the export's own "choose an empty or dedicated directory"
  refusal) but is not applied to the forwarded-`-o` commands or to collisions
  outside the ledger's own directory. Adjacent and deliberately not bundled:
  [422](../422.md) (`query -o` file modes and symlinked destinations) and
  [437](../437.md) (a preview creating its `--into` destination).
- **Goal linkage:** A1 — an agent composing `bea` commands chooses output paths
  programmatically. "Extract into my ledger" and "snapshot into this folder" are
  natural phrasings, and today both destroy data while reporting success, which
  makes every write path untrustworthy to automate.
- **Expected outcome:** one predictable rule an agent can rely on — a `bea`
  command never replaces a file it was not given; it refuses with exit 2 and
  names the path — so output destinations can be generated without a
  pre-flight check of the user's directory.
- **Why now:** two of the reproduced silent data-loss paths in the 2026-09-26
  CLI QA rounds are exactly this, the guard is already written and used
  elsewhere, and the `treeify`/`ingest` forwarding gap keeps widening as more
  native commands are forwarded.
- **Adoption surface task included** (t003): the output-destination rule is a
  documented promise (`cli/docs/USAGE.md` ~l.358–362 already makes it for
  `ingest extract`) that users and agents rely on, so the docs must state the
  single rule and be true.
