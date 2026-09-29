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
