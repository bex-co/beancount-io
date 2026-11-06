"""`bea init --agent-files` (w21/1021): AGENTS.md and CLAUDE.md beside a new ledger.

Opt-in, created exclusively (an existing file is never replaced), and the text
is the one the `beancount-init` skill's template holds.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from cli.agent_guidance import AGENTS_TEMPLATE, CLAUDE_BRIDGE
from tests.report_helpers import bea

SKILL_TEMPLATE = Path(__file__).resolve().parents[2] / "skills" / "beancount-init" / "references" / "agents-template.md"


def _init(tmp_path: Path, *extra: str, name: str = "books", globals_: tuple[str, ...] = ()) -> tuple[Path, object]:
    target = tmp_path / name
    run = bea(
        [*globals_, "--no-input", "init", str(target), "--currency", "EUR", "--date", "2026-01-01", *extra], tmp_path
    )
    return target, run


def test_nothing_is_written_unless_asked(tmp_path: Path) -> None:
    target, run = _init(tmp_path)
    assert run.returncode == 0, run.stderr
    assert sorted(p.name for p in target.iterdir()) == ["main.bean"]


def test_the_files_name_the_root_currency_and_the_accounts_opened(tmp_path: Path) -> None:
    target, run = _init(tmp_path, "--agent-files")
    assert run.returncode == 0, run.stderr
    agents = (target / "AGENTS.md").read_text()
    assert "The root file is `main.bean`" in agents
    assert "Operating currency: EUR." in agents
    assert "Assets:Checking" in agents and "Equity:OpeningBalances" in agents
    assert "bea --file main.bean check" in agents
    assert (target / "CLAUDE.md").read_text() == CLAUDE_BRIDGE == "@AGENTS.md\n"
    assert "Wrote AGENTS.md and CLAUDE.md" in run.stdout
    # The ledger the guidance describes is valid.
    assert bea(["--file", str(target / "main.bean"), "check"], tmp_path).returncode == 0


def test_a_custom_ledger_name_and_a_preset_are_described_truthfully(tmp_path: Path) -> None:
    target = tmp_path / "household.bean"
    run = bea(
        ["--no-input", "init", str(target), "--currency", "USD", "--preset", "personal@1", "--agent-files"], tmp_path
    )
    assert run.returncode == 0, run.stderr
    agents = (tmp_path / "AGENTS.md").read_text()
    assert "The root file is `household.bean`" in agents
    assert "bea --file household.bean check" in agents
    opened = set(re.findall(r"^\d{4}-\d\d-\d\d open (\S+)", target.read_text(), re.MULTILINE))
    listed = set(re.search(r"Accounts opened: (.+)\.\n", agents).group(1).split(", "))  # type: ignore[union-attr]
    assert listed == opened


def test_an_existing_agents_file_is_untouched_and_no_bridge_is_written_unasked(tmp_path: Path) -> None:
    folder = tmp_path / "keep"
    folder.mkdir()
    (folder / "AGENTS.md").write_text("my own rules\n")
    done = bea(["--no-input", "init", str(folder), "--currency", "USD", "--agent-files"], tmp_path)
    assert done.returncode == 0, done.stderr
    assert (folder / "AGENTS.md").read_text() == "my own rules\n"
    assert not (folder / "CLAUDE.md").exists()
    assert "AGENTS.md already exists; left unchanged" in done.stderr


def test_an_existing_claude_file_is_never_replaced(tmp_path: Path) -> None:
    folder = tmp_path / "keep"
    folder.mkdir()
    (folder / "CLAUDE.md").write_text("custom\n")
    done = bea(["--no-input", "init", str(folder), "--currency", "USD", "--agent-files"], tmp_path)
    assert done.returncode == 0, done.stderr
    assert (folder / "CLAUDE.md").read_text() == "custom\n"
    assert (folder / "AGENTS.md").is_file()
    assert "CLAUDE.md already exists; left unchanged" in done.stderr


def test_json_reports_what_happened_to_each_file(tmp_path: Path) -> None:
    target, run = _init(tmp_path, "--agent-files", globals_=("--json",))
    assert run.returncode == 0, run.stderr
    assert json.loads(run.stdout)["data"]["agent_files"] == {"AGENTS.md": "created", "CLAUDE.md": "created"}
    assert (target / "AGENTS.md").is_file()


@pytest.mark.skipif(not SKILL_TEMPLATE.is_file(), reason="needs the repository checkout's skills/")
def test_the_embedded_template_is_the_skills_template() -> None:
    fenced = re.search(r"## `AGENTS.md`\n\n```markdown\n(.*?)```", SKILL_TEMPLATE.read_text(), re.DOTALL)
    assert fenced is not None
    skill_text = fenced.group(1).replace("{{CURRENCY}}", "{currency}").replace("{{ACCOUNTS}}", "{accounts}")
    skill_text = skill_text.replace("`main.bean`", "`{root}`")
    # The skill's text keeps `main.bean` literal in the check command; the CLI substitutes the root.
    skill_text = skill_text.replace("bea --file main.bean check", "bea --file {root} check")
    assert AGENTS_TEMPLATE == skill_text
