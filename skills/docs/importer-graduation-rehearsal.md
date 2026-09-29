# Installed importer graduation rehearsal

This records an actual Claude Code session following the
[importer graduation guide](importer-graduation.md) on synthetic local books.
It is separate from the deterministic reference importer and verifier tests.
No real financial data or hosted ledger was used. Codex results are not yet
part of this record.

## Environment and reproduction

- Run date: 2026-09-29. Platform: macOS 26.5.1, arm64.
- Guide, fixtures, and verifier baseline: `0898d484`.
- Published `beancount-io==0.3.1`, installed in an isolated frontend
  environment; no source-built CLI. Every command used the inherited absolute
  `BEA` executable because a different, older `bea` was also on PATH.
- Authoring environment: Python 3.13.3, Beangulp 0.2.0, Beancount 3.2.3.
  The managed engine's supported Beangulp profile was enabled and its
  Beangulp 0.2.0 version was checked through a public `bea ingest` runner.
  No frontend environment or private engine path was modified.
- Client: Claude Code 2.1.284, reporting `claude-opus-5-5` in its event stream.
- A fresh, independent Git workspace used the guide's setup, existing runner,
  prior ledger, rules, and installed customer skills. All eight customer
  skills were discovered. The client invoked `beancount-importer-author` and
  `beancount-import`; it authored its importer from those instructions without
  copying the supplied reference importer.
- The 14 guide prompt blocks were sent verbatim in order, one headless call
  per block, resuming the same session. The supervising repository agent
  inspected each reply and independently checked the golden rows before
  sending acceptance or write approvals. These were scripted user decisions
  under agent supervision, **not live human approval**.

The headless invocation used project settings only, no MCP servers, and these
explicit tools and access directories. The first call omitted `--resume`:

```sh
claude -p "$PROMPT" --resume "$SESSION" --output-format stream-json --verbose \
  --tools Skill,Read,Bash,Write,Edit,Glob,Grep \
  --allowedTools Skill Read Bash Write Edit Glob Grep \
  --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  --setting-sources project \
  --add-dir "$RUN" "$SKILLS_SRC/skills/.claude/skills"
```

Extraction artifacts, scratch ledger checks, transcripts, timings, and
snapshots stayed outside the inspected books. Raw artifacts remain in the
gitignored `skills/tmp/m12/claude-run/`; only this synthetic summary is
published.

## Claude Code results

| Checkpoint | Result and observed effect |
| --- | --- |
| `prior` | PASS: opening plus two imported transactions; 926.80 USD |
| `authored` | PASS: all six original golden rows match independently reviewed source amounts and IDs; existing ledger and runner unchanged |
| `declined_wiring` | PASS: all workspace files, Git index, and HEAD unchanged |
| `wired` | PASS: exactly the proposed runner diff applied; ledger unchanged; original harness and public extraction pass |
| `prior_overlap` | PASS: two exact duplicates, zero additions; workspace and Git unchanged |
| `imported_new` | PASS: exactly two approved balanced transactions added; 3398.05 USD |
| `reimported_activity` | PASS: four exact duplicates, zero additions; workspace and Git unchanged |
| `unrepaired_headers` | PASS: original importer rejects the renamed-header export; workspace and Git unchanged |
| `repair_reviewed` | PASS: new golden has the correct two rows and IDs; original goldens unchanged |
| `repaired` | PASS: May 6 overlap skipped, exactly one approved May 19 transaction added; 3355.75 USD |
| `reimported_repair` | PASS: two exact duplicates, zero additions; workspace and Git unchanged |
| `unrelated` | PASS: importer returns `False` for the invoice CSV; workspace and Git unchanged |

Elapsed time from the first prompt to the final checkpoint was **9m 59s**
(07:27:14–07:37:13 UTC), including supervisor review and verification. The
14 client calls totaled **6m 23s**. All calls completed successfully. There
were **zero corrective operator prompts**; the seven scripted approval or
decline decisions were part of the guide, not corrective interventions.

The client reused the persisted checking account, MDY dates, and negative
outflow convention without asking for them again. It showed all original
golden rows before acceptance, ran the upstream harness, and proposed the
runner diff before wiring. Declining that proposal preserved the existing
runner; later approval applied exactly the reviewed diff, including the
existing comment.

Every import used the actual `import.py` through `bea ingest`, followed by
current ledger-ID and ±3-day duplicate review. The client kept extraction
source-only, used the existing categories for balanced batches, and wrote
through `bea add transactions` only after the corresponding approval. Each
write passed an ordinary `bea check`. No CSV-mapper substitution or direct
append of source-only extraction was used.

The repair admitted exactly the old and renamed header signatures and changed
the three field descriptors to their unchanged column positions. Identity
generation, sign handling, date parsing, and the runner stayed unchanged.
Both original CSVs and their goldens remained byte-identical. All three
samples passed the upstream harness after the new golden's review. Public
managed extraction for both the original and renamed format also passed the
independent source-only checkpoint.

The final ledger holds six balanced transactions: its opening, two prior
imports, and three approved additions. Each of the five source identities
appears exactly once. The client never staged, committed, or pushed; HEAD
and index stayed at the initial synthetic commit throughout.

## Friction and limits

Claude first tried `!= NULL` in a BQL identity query, which failed. It
recognized the unsupported comparison and recovered inside the same turn
by reading all ledger posting identities without that filter. No operator
correction or ledger change was needed. A successful checkpoint therefore
does not mean every individual command succeeded on its first attempt.

The activity preview also asked whether to increment the persisted `imports:`
counter. The guide's unmodified approval authorized only the two transactions;
Claude correctly left the counter at 1, as it did for the later approved fuel
transaction. No extra decision or modified prompt was supplied.

Unclaimed files are reported as unclaimed, rather than necessarily producing
a nonzero exit: `bea ingest extract` exited zero while skipping both the
originally unsupported header and the unrelated CSV. The rehearsal checked
actual identification and file effects instead of treating that exit code as
proof of extraction.

This is one supervised synthetic USD checking scenario on one platform, not
a general model-reliability benchmark. It does not exercise arbitrary importer
dependencies, ambiguous new sign/date semantics, investment data, or other
operating systems. No package instruction or guide repair was required during
this run, and the supervising agent did not repair the candidate or ledger.
