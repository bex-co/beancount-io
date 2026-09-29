# Graduate a CSV workflow into a reusable importer

Start with synthetic transactions already imported from a bank CSV, then use
`beancount-importer-author` to create a tested importer and repair a later
header rename. Keep the confirmed account, dates, signs, and source IDs. The
[fixture contract](examples/importer-graduation/README.md) gives the exact
rows and expected ledger effects independently of any generated golden files.

This walkthrough uses the installed customer suite, Git, Python 3.9+, uv,
published **bea 0.3.1**, and **Beangulp 0.2.0**. These are the tested versions;
check yours before proceeding. Beangulp also needs the system libmagic library
(`brew install libmagic` on macOS; `sudo apt-get install libmagic1` on
Debian/Ubuntu). Install that system prerequisite separately if it is absent.
This shell setup targets macOS/Linux; native Windows is not covered here.

## Two environments with different jobs

Keep your normal `bea` installation. `bea engine enable beangulp` enables its
supported optional profile; it does not install Beangulp into the frontend.
Use a separate authoring environment for upstream Beangulp's `generate` and
`test` commands. `bea ingest` exposes `identify`, `extract`, and `archive`, so
it cannot replace the golden-file harness. Do not install arbitrary importer
dependencies into the managed engine or configure private engine paths.

The public ingest runner calls `beangulp.Ingest(importers)()`. It is different
from a Python configuration exporting `CONFIG` for `bea import --config`.
This guide wires the actual `import.py` runner and uses the existing
`beancount-import` workflow for reviewed categorization and validated writes.

## Prepare a separate synthetic workspace

Follow [installation](installation.md) first. Adjust `SKILLS_SRC` to that
checkout, and choose a fresh run directory for each agent. The authoring
environment, input copies, and evidence live outside the inspected books.

```sh
export SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
export RUN="$(mktemp -d "${TMPDIR:-/tmp}/beancount-graduation.XXXXXX")"
export BOOKS="$RUN/books"
export GRADUATION_INPUTS="$RUN/inputs"
export VERIFY="$SKILLS_SRC/skills/scripts/verify-importer-graduation.py"
export BEA="$(command -v bea)"
export BEA_CONFIG_DIR="$RUN/bea-config"
export AUTHOR_PYTHON="$RUN/authoring/bin/python"
export PYTHONDONTWRITEBYTECODE=1
export GIT_OPTIONAL_LOCKS=0
export GIT_AUTHOR_NAME="Synthetic Ledger User" GIT_COMMITTER_NAME="Synthetic Ledger User"
export GIT_AUTHOR_EMAIL="synthetic@example.invalid" GIT_COMMITTER_EMAIL="synthetic@example.invalid"
mkdir -p "$BOOKS" "$GRADUATION_INPUTS" "$RUN/evidence"
cp "$SKILLS_SRC/skills/docs/examples/importer-graduation/"*.csv "$GRADUATION_INPUTS/"
cp "$SKILLS_SRC/skills/docs/examples/importer-graduation/prior-ledger.beancount" "$BOOKS/ledger.beancount"
cp "$SKILLS_SRC/skills/docs/examples/importer-graduation/import-rules.toml" "$BOOKS/"
cp "$SKILLS_SRC/skills/docs/examples/importer-graduation/seed-import.py" "$BOOKS/import.py"
uv venv "$RUN/authoring"
uv pip install --python "$AUTHOR_PYTHON" 'beangulp==0.2.0'
"$AUTHOR_PYTHON" -c 'from importlib.metadata import version; import beangulp; print(version("beangulp"))'
"$BEA" --version
"$BEA" engine enable beangulp
"$BEA" engine status
git -C "$BOOKS" init -q
python3 "$SKILLS_SRC/skills/scripts/beancount-skills.py" install "$BOOKS/.claude/skills" "$BOOKS/.agents/skills"
python3 "$SKILLS_SRC/skills/scripts/beancount-skills.py" verify "$BOOKS/.claude/skills" "$BOOKS/.agents/skills"
printf '.claude/\n.agents/\n__pycache__/\n' > "$BOOKS/.gitignore"
git -C "$BOOKS" add -- ledger.beancount import-rules.toml import.py .gitignore
git -C "$BOOKS" commit -q -m "Existing synthetic CSV workflow"
"$BEA" --file "$BOOKS/ledger.beancount" check
cd "$BOOKS"
```

`BEA_CONFIG_DIR` isolates remembered CSV settings. Optional engine provisioning
still uses bea's supported managed runtime. `PYTHONDONTWRITEBYTECODE` prevents
inspection and harness commands from creating bytecode in the books.

## Verify the supported runtime separately

The reference importer is a small, working example for checking the two
environments. It supports the original headers only. Run it outside your
books; it is not an agent's completed authoring exercise or an approved
bank integration.

```sh
mkdir -p "$RUN/reference/tests"
cp "$SKILLS_SRC/skills/docs/examples/importer-graduation/reference_importer.py" "$RUN/reference/"
cp "$SKILLS_SRC/skills/docs/examples/importer-graduation/reference_runner.py" "$RUN/reference/"
cp "$GRADUATION_INPUTS/prior-history.csv" "$GRADUATION_INPUTS/activity.csv" "$RUN/reference/tests/"
"$AUTHOR_PYTHON" "$RUN/reference/reference_importer.py" generate "$RUN/reference/tests"
```

Review the generated files beside the two CSVs before accepting them. Compare
every date, signed amount, source account, and `import-id` with the independent
[row table](examples/importer-graduation/README.md#independently-reviewed-rows).
They must contain exactly two and four transactions respectively, each with
one source posting. Generated output records behavior; it is not its own
proof of correctness. After that review:

```sh
"$AUTHOR_PYTHON" "$RUN/reference/reference_importer.py" test "$RUN/reference/tests"
"$BEA" --file "$BOOKS/ledger.beancount" ingest identify --config "$RUN/reference/reference_runner.py" "$GRADUATION_INPUTS/activity.csv"
"$BEA" --file "$BOOKS/ledger.beancount" ingest extract --config "$RUN/reference/reference_runner.py" "$GRADUATION_INPUTS/activity.csv" -o "$RUN/evidence/reference-extracted.bean"
"$BEA" --file "$BOOKS/ledger.beancount" check
```

Extraction deliberately has only the source-account posting. Do not append it
to the ledger or describe it as a balanced import. Review duplicate identities
against the existing ledger, select the already confirmed categories, and
write only the approved new **balanced** transactions with
`bea --file "$BOOKS/ledger.beancount" add transactions --from <reviewed.json> --into ledger.beancount`.
Use the batch schema in beancount-init's `references/bea-cli.md`, then run
`bea check`. Batch writes do not deduplicate themselves: repeating a successful
batch without rereading the ledger would duplicate it. The original
`prior-history.csv` contributes zero new entries; `activity.csv` contributes
only the May 6 purchase and May 15 payroll.

## Author through the installed agent

Start Claude Code or Codex from `BOOKS` so it inherits the variables above.
Use a new workspace for the other client. Keep transcripts in `RUN/evidence`.
Tool access does not approve a ledger write or runner change. Send each prompt
separately and inspect the response before advancing. The authoring exercise
creates `importers/chase.py`; keep the supplied reference implementation out of
the books.

Send this at the beginning of every new session:

<!-- prompt: runtime -->
```text
Use the inherited BEA absolute executable for every bea command; a login shell may otherwise find an older installation. Verify "$BEA" --version and use AUTHOR_PYTHON for the separate Beangulp golden harness. Keep PYTHONDONTWRITEBYTECODE=1. BOOKS is this synthetic Git workspace; GRADUATION_INPUTS holds the synthetic CSVs; RUN/evidence is the destination for extracted output and temporary evidence. Discover the installed customer skills. Never stage, commit, or push in this exercise.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint prior --bea "$BEA"
python3 "$VERIFY" snapshot --workspace "$BOOKS" --output "$RUN/evidence/before-author.json"
```

<!-- prompt: author -->
```text
Use beancount-importer-author to graduate this existing CSV workflow. Read ledger.beancount's confirmed import config and import-rules.toml; reuse the account, MDY dates and sign convention without re-asking. Create importers/chase.py for GRADUATION_INPUTS/prior-history.csv and activity.csv using the installed Beangulp 0.2.0 API. The importer must narrowly identify the original header and extract only source legs with canonical import-id metadata compatible with prior ledger history. Copy just these two samples to importers/tests/chase/. Author the implementation from the installed skill; do not copy the supplied reference implementation. Run generate with AUTHOR_PYTHON, then show every golden row against its source (date, signed amount, account and exact ID) for my review. Stop before accepting the goldens or changing import.py. Leave ledger.beancount and the existing runner byte-identical. Do not add categories to extraction or write any ledger transactions.
```

Review all six extracted rows against the fixture table: two in the prior
sample and four in the activity sample. The same two historical rows must
have the same IDs in both. Check independent expectations before approving:

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint authored --before "$RUN/evidence/before-author.json" --bea "$BEA"
```

<!-- prompt: accept-goldens -->
```text
I reviewed the six source rows and their golden output: the exact dates, source amounts, account and import IDs match the independent fixture table. Accept those two goldens. Run the upstream test harness with AUTHOR_PYTHON. If green, show the proposed minimal diff wiring the importer into the existing import.py, preserving its existing content. Wait for my wiring decision. No runner or ledger changes yet.
```

## Decline wiring, then approve the same reviewed change

```sh
python3 "$VERIFY" snapshot --workspace "$BOOKS" --output "$RUN/evidence/before-wiring.json"
```

<!-- prompt: decline-wiring -->
```text
No. Decline the runner wiring. Leave all workspace files, including import.py and ledger.beancount, the Git index, and HEAD unchanged.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint declined_wiring --before "$RUN/evidence/before-wiring.json" --bea "$BEA"
```

<!-- prompt: wire -->
```text
Yes, now apply only the exact runner diff you previously showed, preserving the existing runner content. Run the original golden tests and verify identify/extract through "$BEA" ingest with --config pointing at this workspace's actual import.py. Put extraction output under RUN/evidence. Keep ledger.beancount unchanged. If the proposed diff needs to change materially, ask again before writing it.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint wired --before "$RUN/evidence/before-author.json" --bea "$BEA"
"$AUTHOR_PYTHON" "$BOOKS/importers/chase.py" test "$BOOKS/importers/tests/chase"
"$BEA" --file "$BOOKS/ledger.beancount" ingest extract --config "$BOOKS/import.py" "$GRADUATION_INPUTS/activity.csv" -o "$RUN/evidence/wired-activity.bean"
python3 "$VERIFY" extraction --file "$RUN/evidence/wired-activity.bean" --source activity.csv --bea "$BEA"
```

The extraction check permits validation errors **only while reading source-only
extraction**. The ledger checkpoint always requires an ordinary passing
`bea check`; it never permits accounting errors.

## Preserve history and import new activity once

```sh
python3 "$VERIFY" snapshot --workspace "$BOOKS" --output "$RUN/evidence/before-overlap.json"
```

<!-- prompt: prior-overlap -->
```text
Use beancount-import for GRADUATION_INPUTS/prior-history.csv through the newly wired import.py, using bea ingest for extraction. Read the confirmed config and existing identities from ledger.beancount. Review source IDs and the usual duplicate window before categorization. There are no new rows: report both historical rows as duplicates and write nothing, including no config/rules changes. Keep extracted output outside BOOKS under RUN/evidence. Do not rerun the CSV mapper as a substitute for the new importer.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint prior_overlap --before "$RUN/evidence/before-overlap.json" --bea "$BEA"
```

<!-- prompt: activity-preview -->
```text
Use beancount-import on GRADUATION_INPUTS/activity.csv through the same bea ingest runner. Read current ledger IDs first, preserve source identities, and apply the existing confirmed categories only after duplicate review. Propose exactly the new balanced transactions, with IDs and destination ledger.beancount, then wait for my approval. Do not append source-only extraction. Do not use bea import --config on this Ingest runner or substitute the CSV mapper.
```

The preview must skip the two historical rows and propose only May 6 groceries
−28.75 USD (`csv:sha256:4bb21afcb4079451`) and May 15 payroll +2500.00 USD
(`csv:sha256:56e83e6ef0f8f1e7`). Counter-postings are
`Expenses:Food:Groceries` +28.75 and `Income:Salary` −2500.00.

<!-- prompt: activity-approve -->
```text
Yes. Write only those two reviewed balanced transactions to ledger.beancount with their original import IDs, through bea add transactions and the explicit root/destination. Validate with bea check. Re-read current IDs before any retry after a successful write; the batch command does not deduplicate. Do not stage, commit, or push.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint imported_new --bea "$BEA"
python3 "$VERIFY" snapshot --workspace "$BOOKS" --output "$RUN/evidence/before-repeat.json"
```

<!-- prompt: repeat-activity -->
```text
Repeat the activity.csv import review through the wired importer against the current ledger. All four source IDs are present: report zero additions and leave every workspace file, Git index, and HEAD unchanged. Keep extraction artifacts under RUN/evidence.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint reimported_activity --before "$RUN/evidence/before-repeat.json" --bea "$BEA"
```

## Reproduce format drift, then repair it narrowly

```sh
python3 "$VERIFY" snapshot --workspace "$BOOKS" --output "$RUN/evidence/before-repair.json"
```

<!-- prompt: reproduce-drift -->
```text
Use beancount-importer-author to diagnose GRADUATION_INPUTS/renamed-headers.csv. First reproduce identification against the current importer through the actual runner and compare the old and new headers. Do not edit any file yet. Report whether the existing importer claims the file and what changed. Amount signs and date semantics are still the confirmed ones; if any new ambiguity remains, ask before assuming it.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint unrepaired_headers --python "$AUTHOR_PYTHON" --before "$RUN/evidence/before-repair.json" --bea "$BEA"
```

The original header is `Date,Description,Amount`; the new one is
`Post Date,Details,Value`, in the same column order. No account, date convention,
sign meaning, or raw-description change is approved. Beangulp 0.2.0's
`Column("A", "B")` does not mean alternate headers; inspect the installed API
and map the two known signatures explicitly.

<!-- prompt: repair -->
```text
Yes, repair only this confirmed header rename. Preserve the original importer's identities and source-only behavior. Keep both existing CSVs and their golden files byte-identical. Add renamed-headers.csv to importers/tests/chase/, generate only its new golden, and show both rows against the source for review. Keep unrelated.csv unclaimed. Run the old golden tests without regenerating them. Do not wire a replacement runner or change the ledger. Stop before accepting the new golden or importing new activity.
```

The repaired extraction contains May 6's already imported −28.75 row with
the **same** ID, and May 19's −42.30 fuel row with
`csv:sha256:9625a767cf66bf6d`. Review those rows before acceptance:

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint repair_reviewed --goldens-before "$RUN/evidence/before-repair.json" --bea "$BEA"
```

<!-- prompt: repair-accept -->
```text
I reviewed both new golden rows: dates, signs, source account and import IDs match the independent fixture table. Accept the new golden, run the upstream tests on all three samples, and use beancount-import with the repaired bea ingest runner to preview the renamed-header export. Skip the May 6 overlap and propose only May 19 fuel -42.30 USD, categorized to the existing Expenses:Transport:Fuel account, preserving csv:sha256:9625a767cf66bf6d. Wait before writing the ledger.
```

<!-- prompt: repair-import-approve -->
```text
Yes. Write only the reviewed May 19 transaction: Assets:Bank:Checking -42.30 USD and Expenses:Transport:Fuel +42.30 USD, with csv:sha256:9625a767cf66bf6d, through bea add transactions into ledger.beancount. Run bea check. Do not stage, commit, or push.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint repaired --goldens-before "$RUN/evidence/before-repair.json" --bea "$BEA"
"$AUTHOR_PYTHON" "$BOOKS/importers/chase.py" test "$BOOKS/importers/tests/chase"
"$BEA" --file "$BOOKS/ledger.beancount" ingest extract --config "$BOOKS/import.py" "$GRADUATION_INPUTS/renamed-headers.csv" -o "$RUN/evidence/repaired-extracted.bean"
python3 "$VERIFY" extraction --file "$RUN/evidence/repaired-extracted.bean" --source renamed-headers.csv --bea "$BEA"
python3 "$VERIFY" snapshot --workspace "$BOOKS" --output "$RUN/evidence/before-final-repeat.json"
```

<!-- prompt: repeat-repair -->
```text
Repeat the renamed-header import review through the repaired importer. Both IDs are already present: report zero additions. Also check the new importer's identify on GRADUATION_INPUTS/unrelated.csv; it must remain unclaimed. Leave every workspace file, Git index and HEAD unchanged. Keep scratch output under RUN/evidence. Do not call the journey complete if either check fails.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint reimported_repair --before "$RUN/evidence/before-final-repeat.json" --goldens-before "$RUN/evidence/before-repair.json" --bea "$BEA"
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint unrelated --python "$AUTHOR_PYTHON" --before "$RUN/evidence/before-final-repeat.json" --goldens-before "$RUN/evidence/before-repair.json" --bea "$BEA"
```

## Evidence and limits

Record the suite revision, platform, executable paths, Python/Beangulp/agent/CLI
versions, discovered skills, approval decisions, elapsed time, interventions,
and checkpoint results. File checks establish ledger and golden effects;
transcript review must separately establish discovery, use of the actual
runner, the original rejection and final unrelated-file rejection, and review
before acceptance. A deterministic reference run is not a real-client rehearsal.

This example covers one synthetic, signed USD checking export. It does not
establish support for arbitrary importer dependencies, all bank formats,
native Windows, or unsupervised agent reliability. A changed sign convention
or ambiguous new date format requires clarification, not the header-only repair
permission shown here.
