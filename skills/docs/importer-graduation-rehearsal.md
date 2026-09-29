# Installed importer graduation rehearsal

This records actual Claude Code and Codex sessions following the
[importer graduation guide](importer-graduation.md) on synthetic local books.
It is separate from the deterministic reference importer and verifier tests.
No real financial data or hosted ledger was used.

## Environment and reproduction

- Run date: 2026-09-29. Platform: macOS 26.5.1, arm64.
- Claude baseline: `0898d484`. Codex baseline: `f357f338`, which adds the
  Claude evidence record and retains the same guide, fixtures, and verifier.
  Both full runs used setup without the cache directory setting described below.
- Published `beancount-io==0.3.1`, installed in an isolated frontend
  environment; no source-built CLI. Every command used the inherited absolute
  `BEA` executable because a different, older `bea` was also on PATH.
- Authoring environment: Python 3.13.3, Beangulp 0.2.0, Beancount 3.2.3.
  The managed engine's supported Beangulp profile was enabled and its
  Beangulp 0.2.0 version was checked through a public `bea ingest` runner.
  No frontend environment or private engine path was modified.
- Clients: Claude Code 2.1.284, reporting `claude-opus-5-5` in its event stream;
  Codex CLI 0.158.0, with its default model. Codex JSON events did not report
  a model name, and no model override was supplied.
- Each fresh, independent Git workspace used the guide's setup, existing runner,
  prior ledger, rules, and installed customer skills. All eight customer
  skills were discovered, through `.claude/skills` and `.agents/skills`
  respectively. Both clients used `beancount-importer-author` and
  `beancount-import`; each authored its importer from those instructions without
  copying the supplied reference importer.
- The 14 guide prompt blocks were sent verbatim in order, one headless call
  per block, resuming one session per client. The supervising repository agent
  inspected each reply and independently checked the golden rows before
  sending acceptance or write approvals. These were scripted user decisions
  under agent supervision, **not live human approval**.

Claude's headless invocation used project settings only, no MCP servers, and these
explicit tools and access directories. The first call omitted `--resume`:

```sh
claude -p "$PROMPT" --resume "$SESSION" --output-format stream-json --verbose \
  --tools Skill,Read,Bash,Write,Edit,Glob,Grep \
  --allowedTools Skill Read Bash Write Edit Glob Grep \
  --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  --setting-sources project \
  --add-dir "$RUN" "$SKILLS_SRC/skills/.claude/skills"
```

Codex ignored user configuration and rules, used the normal `workspace-write`
sandbox, and added only the run and its configuration directory to writable
access. No sandbox bypass or escalation was used. Subsequent calls inserted
`resume "$SESSION"` immediately before the final `-`:

```sh
printf '%s' "$PROMPT" | codex exec --ignore-user-config --ignore-rules \
  --sandbox workspace-write --json \
  --add-dir "$RUN" --add-dir "$BEA_CONFIG_DIR" -
```

Extraction artifacts, scratch ledger checks, transcripts, timings, and
snapshots stayed outside the inspected books. Raw artifacts remain in the
gitignored `skills/tmp/m12/claude-run/` and `skills/tmp/m12/codex-run/`;
only this synthetic summary is published.

## Full-journey results

| Checkpoint | Claude Code | Codex | Observed effect in both runs |
| --- | --- | --- | --- |
| `prior` | PASS | PASS | opening plus two imported transactions; 926.80 USD |
| `authored` | PASS | PASS | all six original golden rows match independently reviewed source amounts and IDs; existing ledger and runner unchanged |
| `declined_wiring` | PASS | PASS | all workspace files, Git index, and HEAD unchanged |
| `wired` | PASS | PASS | exactly the proposed runner diff applied; ledger unchanged; original harness and public extraction pass |
| `prior_overlap` | PASS | PASS | two exact duplicates, zero additions; workspace and Git unchanged |
| `imported_new` | PASS | PASS | exactly two approved balanced transactions added; 3398.05 USD |
| `reimported_activity` | PASS | PASS | four exact duplicates, zero additions; workspace and Git unchanged |
| `unrepaired_headers` | PASS | PASS | original importer rejects the renamed-header export; workspace and Git unchanged |
| `repair_reviewed` | PASS | PASS | new golden has the correct two rows and IDs; original goldens unchanged |
| `repaired` | PASS | PASS | May 6 overlap skipped, exactly one approved May 19 transaction added; 3355.75 USD |
| `reimported_repair` | PASS | PASS | two exact duplicates, zero additions; workspace and Git unchanged |
| `unrelated` | PASS | PASS | importer returns `False` for the invoice CSV; workspace and Git unchanged |

| Measure | Claude Code | Codex |
| --- | --- | --- |
| First prompt through final checkpoint, UTC | 07:27:14–07:37:13 | 07:41:11–07:55:25 |
| Wall-clock, including supervisor review and verification | 9m 59s | 14m 14s |
| Summed client-call time | 6m 23s | 9m 29s |
| Guide calls | 14 | 14 |
| Corrective operator prompts | 0 | 0 |

All client calls ultimately completed successfully. Each run's seven scripted
approval or decline decisions were part of the guide, not corrective
interventions. Individual command failures and recovery are recorded below.

Both clients reused the persisted checking account, MDY dates, and negative
outflow convention without asking for them again. Each showed all original
golden rows before acceptance, ran the upstream harness, and proposed the
runner diff before wiring. Declining that proposal preserved the existing
runner; later approval applied exactly the reviewed diff, including the
existing comment.

Every import used the actual `import.py` through `bea ingest`, followed by
current ledger-ID and ±3-day duplicate review. Both clients kept extraction
source-only, used the existing categories for balanced batches, and wrote
through `bea add transactions` only after the corresponding approval. Each
write passed an ordinary `bea check`. No CSV-mapper substitution or direct
append of source-only extraction was used.

Each repair admitted exactly the old and renamed header signatures and changed
the three field descriptors to their unchanged column positions. Identity
generation, sign handling, date parsing, and the runner stayed unchanged.
Both original CSVs and their goldens remained byte-identical. All three
samples passed the upstream harness after the new golden's review. Public
managed extraction for both the original and renamed format also passed the
independent source-only checkpoint.

Each final ledger holds six balanced transactions: its opening, two prior
imports, and three approved additions. Each of the five source identities
appears exactly once. Neither client staged, committed, or pushed; HEAD
and index stayed at each initial synthetic commit throughout.

## Friction

Claude first tried `!= NULL` in a BQL identity query, which failed. It
recognized the unsupported comparison and recovered inside the same turn
by reading all ledger posting identities without that filter. No operator
correction or ledger change was needed. A successful checkpoint therefore
does not mean every individual command succeeded on its first attempt.

Codex initially supplied `--json` to `bea ingest`, which has only native
output. It recovered in the same turn by removing that flag and successfully
repeating identification and extraction. No operator correction was needed.

Claude's activity preview also asked whether to increment the persisted `imports:`
counter. The guide's unmodified approval authorized only the two transactions;
Claude correctly left the counter at 1, as it did for the later approved fuel
transaction. No extra decision or modified prompt was supplied.

Unclaimed files are reported as unclaimed, rather than necessarily producing
a nonzero exit: `bea ingest extract` exited zero while skipping both the
originally unsupported header and the unrelated CSV. The rehearsal checked
actual identification and file effects instead of treating that exit code as
proof of extraction.

## Cache setup correction and targeted rerun

The first approved Codex batch failed before writing because bea could not
create a ledger lock under the default cache directory outside the
`workspace-write` sandbox. Codex inspected the published frontend's cache
configuration, verified the ledger was byte-identical to its pre-write copy,
and retried with `XDG_CACHE_HOME="$RUN/evidence/cache"`. That write succeeded;
the later fuel write used the same local cache without another failure.
No sandbox bypass or corrective operator prompt was used. This recovery is
included in the original full-run timings above.

The guide now exports `XDG_CACHE_HOME="$RUN/cache"` and creates that directory
inside the writable run. This is a supported public setting and applies to
both clients; it does not alter an engine path. Claude's original rehearsal
remains evidence for its earlier setup, not a claimed rerun of this change.

A fresh Codex session then tested the correction using the updated guide
setup, published bea 0.3.1, and the same `workspace-write` sandbox without
extra writable directories or a model override. The new books started with
the original prior-history ledger plus the already-authored Codex importer,
runner, and golden artifacts. This was a targeted write regression, not a
second full authoring journey or a copy of the reference importer.

The guide's unmodified `runtime`, `activity-preview`, and `activity-approve`
prompts were sent in order, with review before the final approval. The
approved batch succeeded on its **first write attempt**, and `bea check` and
the `imported_new` checkpoint passed. Exactly the approved two transactions
were added: the balance became 3398.05 USD. Before/after snapshots showed
that only `ledger.beancount` changed, its original bytes remained as a prefix,
and every other file, Git index, and HEAD were unchanged. A lock file was
created under the configured run cache.

The targeted rerun took **3m 47s** (07:56:12–07:59:59 UTC), including review
and checkpoint capture; its three client calls totaled **1m 35s**. There were
zero corrective prompts and no lock failure or retry. An initial discovery
`rg` returned no matches (exit 1); normal skill-directory inspection then
found all eight skills. This unrelated search result is not concealed by the
successful write result. Its raw evidence and both snapshots remain under
the gitignored `skills/tmp/m12/codex-cache-rerun/`, separately from the full run.

## Limits

These are supervised runs of one synthetic USD checking scenario on one
platform, not a general model-reliability benchmark. They do not exercise arbitrary importer
dependencies, ambiguous new sign/date semantics, investment data, or other
operating systems. Claude required no package instruction or guide correction.
Codex exposed the cache setup gap described above. Neither candidate importer nor ledger was
repaired by the supervising agent.
