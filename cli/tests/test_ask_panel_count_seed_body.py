"""The ask approval panel states the count and the seed; a skill body is capped (w5/849).

60 transactions were offered as "this directive" with no count anywhere, a new
include's seeded `option "name_*"` line was written without appearing on the
panel, and a 2 MB SKILL.md body was returned whole to the model.
"""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from bea_engine.ledger import appending
from cli.ask.agent import BqlDeps, WritePermission, make_agent
from cli.ask.skills import MAX_BODY, AgentSkill

OPENS = 'option "name_expenses" "Aufwand"\n2024-01-01 open Assets:Cash USD\n2024-01-01 open Aufwand:Food USD\n'
ONE = '2024-01-20 * "Cafe" "Latte"\n  Aufwand:Food  5.00 USD\n  Assets:Cash\n'


def _tool(agent: Any, name: str) -> Any:
    return agent._function_toolset.tools[name].function


def test_the_panel_counts_the_directives_and_the_selector_repeats_it(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from cli.ask import repl

    asked: list[int] = []
    monkeypatch.setattr(repl, "_ask_write_permission", lambda count=1: (asked.append(count), "n")[1])
    monkeypatch.setattr(repl, "console", repl.Console(width=100, force_terminal=False, record=True))

    repl.make_confirm_fn([None])(ONE * 60, str(tmp_path / "main.bean"), [], {"count": 60, "seed": "", "created": False})

    assert "Allow the AI to append these 60 directives to your ledger?" in repl.console.export_text()
    assert asked == [60]


@pytest.mark.parametrize("width", [80, 120])
def test_a_new_include_shows_its_seed_and_says_it_is_created(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, width: int
) -> None:
    from cli.ask import repl

    ledger = tmp_path / "main.bean"
    ledger.write_text(OPENS + 'include "y2025/*.bean"\n')
    (tmp_path / "y2025").mkdir()
    seen: list[tuple[str, dict[str, Any]]] = []
    deps = BqlDeps(
        file=ledger,
        into=Path("y2025/new.bean"),
        write_permission=WritePermission(confirm_fn=lambda d, t, w, p: (seen.append((d, p)), "n")[1]),
    )

    _tool(make_agent("gpt-4o", "http://unused", "tok"), "write_directive")(SimpleNamespace(deps=deps), ONE)

    ((directive, proposal),) = seen
    assert proposal == {"count": 1, "seed": 'option "name_expenses" "Aufwand"\n', "created": True}
    monkeypatch.setattr(repl, "_ask_write_permission", lambda count=1: "n")
    monkeypatch.setattr(repl, "console", repl.Console(width=width, force_terminal=False, record=True))
    repl.make_confirm_fn([None])(directive, str(tmp_path / "y2025" / "new.bean"), [], proposal)
    shown = repl.console.export_text()
    # A longer temporary path can wrap the annotation between panel rows.
    assert "(new file, created by this write)" in " ".join(shown.replace("│", " ").split())
    assert shown.index('option "name_expenses" "Aufwand"') < shown.index('2024-01-20 * "Cafe" "Latte"')
    assert not (tmp_path / "y2025" / "new.bean").exists()


def test_an_existing_destination_is_not_called_new(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(OPENS)

    preview = appending.answer(ledger, ONE, dry_run=True)

    assert (preview["count"], preview["seed"], preview["created"]) == (1, "", False)


def test_a_skill_body_is_cut_with_a_mark(tmp_path: Path) -> None:
    body = "x" * 2_000_000
    skill = AgentSkill(name="big", description="d", body=body, path=tmp_path / "SKILL.md")
    deps = BqlDeps(file=tmp_path / "main.bean", skills={"big": skill})

    answer = _tool(make_agent("gpt-4o", "http://unused", "tok"), "get_skill_body")(SimpleNamespace(deps=deps), "big")

    assert answer.startswith("x" * MAX_BODY)
    assert answer.endswith(f"[Skill body cut at {MAX_BODY:,} of 2,000,000 characters.]")
    assert len(answer) < MAX_BODY + 100
