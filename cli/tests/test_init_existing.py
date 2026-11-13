"""`bea init --existing` (w1/m42): agent files for a ledger bea did not create.

The ledger is read, never written: every test that runs the command compares
the ledger files' bytes before and after. The `AGENTS.md` it writes states the
ledger's own root, includes, currencies, accounts, plugins and check command.
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

import pytest

from cli.agent_guidance import EXISTING_TEMPLATE
from tests.report_helpers import CLI_ROOT, bea, run_env

SKILL_TEMPLATE = CLI_ROOT.parent / "skills" / "beancount-init" / "references" / "agents-template.md"

ROOT = """\
option "title" "Household"
option "operating_currency" "EUR"
include "2025.bean"
include "accounts.bean"
"""
ACCOUNTS = """\
2025-01-01 open Assets:Bank:Checking EUR
2025-01-01 open Expenses:Food
2025-01-01 open Equity:Opening
2025-06-01 close Expenses:Food
"""
YEAR = """\
2025-01-02 * "Bakery"
  Expenses:Food  4.50 EUR
  Assets:Bank:Checking
"""
PLUGIN = '__plugins__ = ["mark"]\n\n\ndef mark(entries, options):\n    return entries, []\n'


def _books(tmp_path: Path, *, root: str = ROOT) -> Path:
    books = tmp_path / "books"
    books.mkdir()
    (books / "household.beancount").write_text(root)
    (books / "accounts.bean").write_text(ACCOUNTS)
    (books / "2025.bean").write_text(YEAR)
    return books


def _digests(folder: Path) -> dict[str, str]:
    """Every file under `folder` except the agent files, by content."""
    return {
        str(path.relative_to(folder)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(folder.rglob("*"))
        if path.is_file() and path.name not in {"AGENTS.md", "CLAUDE.md"}
    }


def test_a_multi_file_ledger_is_described_as_it_is_and_left_unchanged(tmp_path: Path) -> None:
    books = _books(tmp_path)
    before = _digests(books)
    run = bea(["--no-input", "init", "--existing", str(books / "household.beancount")], tmp_path)
    assert run.returncode == 0, run.stderr
    assert _digests(books) == before
    agents = (books / "AGENTS.md").read_text()
    assert "The root file is\n`household.beancount`; it includes 2 other files: `2025.bean`, `accounts.bean`." in agents
    assert "unless a write names an included file with `--into` (for example `--into 2025.bean`)" in agents
    assert "Operating currency: EUR. Open accounts: Assets:Bank:Checking, Equity:Opening." in agents
    assert "Plugins: none." in agents
    assert "run `bea --file household.beancount check` from this folder. The root check must pass" in agents
    assert (books / "CLAUDE.md").read_text() == "@AGENTS.md\n"
    assert "Read household.beancount: 3 files, 2 open accounts, EUR. No ledger file was changed." in run.stdout
    # Exactly the two agent files were added: no cache, bytecode or Git state.
    assert sorted(p.name for p in books.iterdir()) == [
        "2025.bean",
        "AGENTS.md",
        "CLAUDE.md",
        "accounts.bean",
        "household.beancount",
    ]


def test_a_folder_resolves_to_the_one_file_nothing_else_includes(tmp_path: Path) -> None:
    books = _books(tmp_path)
    run = bea(["--no-input", "init", "--existing", str(books)], tmp_path)
    assert run.returncode == 0, run.stderr
    assert "`household.beancount`" in (books / "AGENTS.md").read_text()


def test_a_folder_with_two_roots_is_refused_and_nothing_is_written(tmp_path: Path) -> None:
    books = _books(tmp_path)
    (books / "other.beancount").write_text('option "title" "Other"\n')
    before = sorted(p.name for p in books.iterdir())
    run = bea(["--no-input", "init", "--existing", str(books)], tmp_path)
    assert run.returncode == 2
    assert "household.beancount, other.beancount" in run.stderr and "Name the root" in run.stderr
    assert sorted(p.name for p in books.iterdir()) == before


def test_bea_default_names_win_in_a_folder(tmp_path: Path) -> None:
    books = _books(tmp_path)
    (books / "main.bean").write_text('option "operating_currency" "USD"\n')
    run = bea(["--no-input", "init", "--existing", str(books)], tmp_path)
    assert run.returncode == 0, run.stderr
    assert (
        "The root file is\n`main.bean`, which includes no other files. Put new entries in `main.bean`."
        in (books / "AGENTS.md").read_text()
    )


def test_file_and_directory_targets_are_refused_by_name(tmp_path: Path) -> None:
    books = _books(tmp_path)
    run = bea(["--no-input", "--file", str(books), "init", "--existing"], tmp_path)
    assert run.returncode == 2 and "is not a regular file" in run.stderr
    run = bea(["--no-input", "init", "--existing", str(books / "missing.bean")], tmp_path)
    assert run.returncode == 2 and "No ledger file at" in run.stderr
    empty = tmp_path / "empty"
    empty.mkdir()
    run = bea(["--no-input", "init", "--existing", str(empty)], tmp_path)
    assert run.returncode == 2 and "No .bean or .beancount ledger" in run.stderr
    assert not (books / "AGENTS.md").exists() and not list(empty.iterdir())


@pytest.mark.parametrize(
    "option",
    [["--currency", "USD"], ["--date", "2026-01-01"], ["--preset", "personal@1"], ["--opening-balance", "X 1"]],
)
def test_new_ledger_options_are_refused(tmp_path: Path, option: list[str]) -> None:
    books = _books(tmp_path)
    run = bea(["--no-input", "init", "--existing", str(books / "household.beancount"), *option], tmp_path)
    assert run.returncode == 2
    assert f"{option[0]} only applies to a new ledger" in run.stderr
    assert not (books / "AGENTS.md").exists()


def test_existing_agent_files_are_kept_byte_for_byte(tmp_path: Path) -> None:
    books = _books(tmp_path)
    (books / "CLAUDE.md").write_bytes(b"my claude rules\r\n")
    run = bea(["--no-input", "init", "--existing", str(books)], tmp_path)
    assert run.returncode == 0, run.stderr
    assert (books / "CLAUDE.md").read_bytes() == b"my claude rules\r\n"
    assert (books / "AGENTS.md").is_file()
    assert "CLAUDE.md already exists; left unchanged." in run.stderr
    written = (books / "AGENTS.md").read_bytes()
    again = bea(["--no-input", "--json", "init", "--existing", str(books)], tmp_path)
    assert again.returncode == 0, again.stderr
    assert json.loads(again.stdout)["data"]["agent_files"] == {"AGENTS.md": "kept", "CLAUDE.md": "skipped"}
    assert (books / "AGENTS.md").read_bytes() == written


def test_a_ledger_with_errors_gets_its_files_and_a_count(tmp_path: Path) -> None:
    books = _books(tmp_path, root=ROOT + '\n2025-02-01 * "Unknown"\n  Expenses:Nope  1 EUR\n  Assets:Bank:Checking\n')
    before = _digests(books)
    run = bea(["--no-input", "init", "--existing", str(books / "household.beancount")], tmp_path)
    assert run.returncode == 0, run.stderr
    assert _digests(books) == before
    assert "loads with 1 error today; AGENTS.md asks agents to add none" in run.stderr
    agents = (books / "AGENTS.md").read_text()
    assert re.search(r"On \d{4}-\d\d-\d\d it reported 1 error; a change must not add any\.", agents)


def _bea_with_pythonpath(tmp_path: Path, cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = run_env(tmp_path)
    env["PYTHONPATH"] = f"{env['PYTHONPATH']}:."
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args], env=env, cwd=cwd, capture_output=True, text=True, timeout=300
    )


def test_a_plugin_kept_beside_the_ledger_puts_pythonpath_in_the_check(tmp_path: Path) -> None:
    books = _books(tmp_path, root='plugin "localplug"\n' + ROOT)
    (books / "localplug.py").write_text(PLUGIN)
    before = _digests(books)
    run = bea(["--no-input", "--json", "init", "--existing", str(books)], tmp_path)
    assert run.returncode == 0, run.stderr
    assert _digests(books) == before
    assert not (books / "__pycache__").exists()
    data = json.loads(run.stdout)["data"]
    assert [(p["name"], p["loaded"], p["source"]) for p in data["plugins"]] == [("localplug", False, "beside-ledger")]
    agents = (books / "AGENTS.md").read_text()
    assert "`localplug` is a module in this folder, loaded through `PYTHONPATH=.`" in agents
    assert "run `PYTHONPATH=. bea --file household.beancount check` from this folder" in agents
    # It never loaded here, so what the PYTHONPATH check reports was never measured.
    assert "Run it before the first change; afterwards it must report no error it did not report then." in agents
    (books / "AGENTS.md").unlink()
    (books / "CLAUDE.md").unlink()
    loaded = _bea_with_pythonpath(tmp_path, books, "--no-input", "--json", "init", "--existing")
    assert loaded.returncode == 0, loaded.stderr
    plugin = json.loads(loaded.stdout)["data"]["plugins"][0]
    assert (plugin["loaded"], plugin["source"]) == (True, "beside-ledger")
    assert "The root check must pass" in (books / "AGENTS.md").read_text()
    # The check command AGENTS.md gives passes as written.
    check = _bea_with_pythonpath(tmp_path, books, "--file", "household.beancount", "check")
    assert check.returncode == 0, check.stderr


def test_an_unloaded_plugin_beside_the_ledger_is_not_counted_as_the_ledger_s_errors(tmp_path: Path) -> None:
    books = _books(tmp_path, root='plugin "localplug"\n' + ROOT)
    (books / "localplug.py").write_text(PLUGIN)
    run = bea(["--no-input", "init", "--existing", str(books)], tmp_path)
    assert run.returncode == 0, run.stderr
    # The report gives the PYTHONPATH command; no error count is claimed for a
    # ledger that loads clean under it.
    assert "loads with" not in run.stderr
    assert "Plugin `localplug` is the module `localplug` in this folder" in run.stdout


def test_json_names_the_ledger_and_what_happened_to_each_file(tmp_path: Path) -> None:
    books = _books(tmp_path)
    run = bea(["--no-input", "--json", "init", "--existing", str(books)], tmp_path)
    assert run.returncode == 0, run.stderr
    envelope = json.loads(run.stdout)
    data = envelope["data"]
    assert envelope["target"]["file"] == str(books / "household.beancount")
    assert data["files"] == ["2025.bean", "accounts.bean"]
    assert data["operating_currencies"] == ["EUR"]
    assert data["open_accounts"] == ["Assets:Bank:Checking", "Equity:Opening"]
    assert data["plugins"] == [] and data["errors"] == []
    assert data["agent_files"] == {"AGENTS.md": "created", "CLAUDE.md": "created"}


def test_init_on_an_existing_ledger_points_at_existing(tmp_path: Path) -> None:
    books = _books(tmp_path)
    (books / "main.bean").write_text("")
    run = bea(["--no-input", "init", str(books), "--currency", "USD"], tmp_path)
    assert run.returncode != 0
    assert "init never overwrites a ledger" in run.stderr
    assert f"bea init --existing {books / 'main.bean'}" in run.stderr


@pytest.mark.skipif(not SKILL_TEMPLATE.is_file(), reason="needs the repository checkout's skills/")
def test_the_existing_template_is_the_skills_template() -> None:
    heading = r"## Existing-ledger `AGENTS.md`\n.*?```markdown\n(.*?)```"
    fenced = re.search(heading, SKILL_TEMPLATE.read_text(), re.DOTALL)
    assert fenced is not None
    skill_text = re.sub(r"\{\{([A-Z]+)\}\}", lambda m: "{" + m[1].lower() + "}", fenced.group(1))
    assert skill_text == EXISTING_TEMPLATE


# --- The report (w1/m42/t003) -------------------------------------------------

V2_ROOT = """\
option "operating_currency" "USD"
option "booking_algorithm" "FIFO"
plugin "beancount.plugins.unrealized" "Unrealized"
plugin "localplug"
plugin "no_such_package.plugin"
2025-01-01 open Assets:Cash USD
2025-01-02 * "Unopened"
  Expenses:Nope  1 USD
  Assets:Cash
"""


def _v2_books(tmp_path: Path) -> Path:
    books = tmp_path / "old"
    books.mkdir()
    (books / "ledger.beancount").write_text(V2_ROOT)
    (books / "localplug.py").write_text(PLUGIN)
    return books


def test_each_problem_gets_its_location_and_one_next_step(tmp_path: Path) -> None:
    books = _v2_books(tmp_path)
    before = _digests(books)
    run = bea(["--no-input", "--json", "init", "--existing", str(books)], tmp_path)
    assert run.returncode == 0, run.stderr
    assert _digests(books) == before
    items = json.loads(run.stdout)["data"]["attention"]
    by_kind = {item["kind"]: item for item in items}
    assert [item["kind"] for item in items] == [
        "plugin-not-in-beancount",
        "plugin-beside-ledger",
        "plugin-package-missing",
        "option-unknown",
        "error",
    ]
    assert by_kind["plugin-not-in-beancount"]["location"] == "ledger.beancount:3"
    assert "Remove the plugin line" in by_kind["plugin-not-in-beancount"]["next"]
    beside = by_kind["plugin-beside-ledger"]
    assert beside["location"] == "ledger.beancount:4" and beside["subject"] == "localplug"
    assert beside["next"].endswith("&& PYTHONPATH=. bea --file ledger.beancount check")
    package = by_kind["plugin-package-missing"]
    assert package["location"] == "ledger.beancount:5" and "`no_such_package`" in package["message"]
    assert "No bea command installs third-party packages" in package["message"]
    option = by_kind["option-unknown"]
    assert (option["location"], option["subject"]) == ("ledger.beancount:2", "booking_algorithm")
    # The unknown option is reported once, as an option, not again as an error.
    assert "Expenses:Nope" in by_kind["error"]["message"] and by_kind["error"]["location"] == "ledger.beancount:7"
    # Nothing was installed: the package still cannot be imported by the engine.
    data = json.loads(run.stdout)["data"]
    assert not next(p for p in data["plugins"] if p["name"] == "no_such_package.plugin")["loaded"]


def test_the_text_report_lists_every_problem_with_its_next_step(tmp_path: Path) -> None:
    books = _v2_books(tmp_path)
    run = bea(["--no-input", "init", "--existing", str(books)], tmp_path)
    assert run.returncode == 0, run.stderr
    lines = run.stdout.splitlines()
    start = lines.index("Needs attention before an agent works on this ledger:")
    report = lines[start + 1 :]
    assert report[0].startswith(
        "  ledger.beancount:3: Plugin `beancount.plugins.unrealized` is not part of Beancount 3"
    )
    assert report[1].startswith("    Next: Remove the plugin line")
    assert sum(line.startswith("    Next: ") for line in report) == 5
    assert report[-1].startswith("    Next: see every error with cd ")


def test_a_clean_ledger_needs_no_attention(tmp_path: Path) -> None:
    books = _books(tmp_path)
    run = bea(["--no-input", "init", "--existing", str(books)], tmp_path)
    assert run.returncode == 0, run.stderr
    assert "Needs attention" not in run.stdout and "error" not in run.stderr
    run = bea(["--no-input", "--json", "init", "--existing", str(books)], tmp_path)
    assert json.loads(run.stdout)["data"]["attention"] == []


def test_a_plugin_that_raises_is_reported_as_failing_while_running(tmp_path: Path) -> None:
    books = tmp_path / "raising"
    books.mkdir()
    (books / "main.bean").write_text('plugin "boom"\n2025-01-01 open Assets:Cash\n')
    (books / "boom.py").write_text(
        '__plugins__ = ["boom"]\n\n\ndef boom(entries, options):\n    raise RuntimeError("x")\n'
    )
    env_run = _bea_with_pythonpath(tmp_path, books, "--no-input", "--json", "init", "--existing")
    assert env_run.returncode == 0, env_run.stderr
    items = json.loads(env_run.stdout)["data"]["attention"]
    assert [(item["kind"], item["subject"]) for item in items] == [("plugin-failed", "boom")]
