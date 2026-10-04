"""What `bea ask` shows before a write is what the write will do (w3/451, w3/452).

Two defects met in one panel. `ask` was the one surface outside the sanitizer
`w3/392` installed everywhere else: the approval panel rendered model-proposed
directive text verbatim, so the consent surface could be repainted by the very
text it was asking about, and approving it persisted those bytes into the `.bean`
file — while `bea add` escaped the same payload correctly. And the panel was
titled with the **root** ledger even under `--into`, which appends to an included
file, with the path silently trimmed to the frame width on top of that.

The rules pinned here:

- raw directive text carrying a control character is refused by the engine, so
  no writer can persist one (escaping is wrong for this path: it would write
  something other than the bytes the user approved);
- the panel names the destination the engine's own dry run resolved, in the body
  where it cannot be trimmed, and neutralizes every model-controlled byte on it;
- the answer channel is neutralized in both `--print` and session modes.

The PTY tests assert on emitted **bytes**: a piped capture strips control
sequences and would show the payload half-defused. The model is a local stub, so
nothing here describes the hosted AI service.
"""

from __future__ import annotations

import re
import time
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from bea_engine.ledger import appending
from bea_engine.ledger.text import refuse_control_characters
from bea_engine.protocol import UsageError as EngineUsageError
from cli.ask.agent import BqlDeps, WritePermission, make_agent
from tests.conftest import StubModel, model_answer, model_tool_call

ESC = "\x1b"
#: The payload class `w3/done/392` describes: cursor up, erase line, then a
#: plausible-looking replacement for the row it erased.
CURSOR_ATTACK = f"{ESC}[1A{ESC}[2KAPPROVED"
CLEAN_DIRECTIVE = '2024-03-05 * "Deli" "lunch"\n  Expenses:Food   7.00 USD\n  Assets:Cash\n'
ARMED_DIRECTIVE = f'2024-03-05 * "Deli" "lunch{CURSOR_ATTACK}"\n  Expenses:Food   7.00 USD\n  Assets:Cash\n'

ROOT = """option "operating_currency" "USD"
include "side.bean"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food USD
2024-01-01 open Equity:Opening USD
2024-01-02 * "Opening"
  Assets:Cash 100.00 USD
  Equity:Opening
"""
SIDE = '2024-01-03 * "Tea"\n  Expenses:Food 1.00 USD\n  Assets:Cash\n'


@pytest.fixture
def split_ledger(tmp_path: Path) -> Path:
    """A root ledger with one included file — what `--into` exists for."""
    (tmp_path / "main.bean").write_text(ROOT, encoding="utf-8")
    (tmp_path / "side.bean").write_text(SIDE, encoding="utf-8")
    return tmp_path / "main.bean"


# ── the write path refuses control characters (w3/451) ─────────────────────


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param(CURSOR_ATTACK, id="cursor-attack"),
        pytest.param(f"{ESC}]0;INJECTED\x07", id="osc-title"),
        pytest.param("\x00", id="nul"),
        pytest.param("\x7f", id="del"),
        pytest.param("\x9b[2K", id="c1-csi"),
    ],
)
def test_raw_directive_text_with_a_control_character_is_refused(payload: str) -> None:
    with pytest.raises(EngineUsageError) as caught:
        refuse_control_characters(f'2024-01-01 note Assets:Cash "{payload}"', what="the directive text")

    assert "Write rejected" in str(caught.value)
    assert "nothing was written" in str(caught.value)


@pytest.mark.parametrize("whitespace", ["\t", "\n", "\r\n"])
def test_the_whitespace_a_ledger_is_written_with_is_allowed(whitespace: str) -> None:
    """Indentation and line breaks are structure, not terminal control."""
    refuse_control_characters(f"2024-01-01 open{whitespace}Assets:Cash", what="the directive text")


def test_the_append_path_leaves_the_ledger_untouched_when_it_refuses(split_ledger: Path) -> None:
    before = split_ledger.read_bytes()

    with pytest.raises(EngineUsageError):
        appending.answer(split_ledger, ARMED_DIRECTIVE)

    assert split_ledger.read_bytes() == before
    assert b"\x1b" not in split_ledger.read_bytes()


def test_a_clean_directive_still_appends(split_ledger: Path) -> None:
    """The control: the refusal must not have closed the path it guards."""
    result = appending.answer(split_ledger, CLEAN_DIRECTIVE, into=Path("side.bean"))

    assert result["written"] == 1
    assert "side.bean" in str(result["target"])


# ── the panel names the real destination, readably (w3/452) ────────────────


def _unwrapped(shown: str) -> str:
    """Panel text with the frame and the wrapping removed, so a long path reads whole."""
    return re.sub(r"[\s│]+", "", shown)


def _write_tool(agent: Any) -> Any:
    return agent._function_toolset.tools["write_directive"].function


def test_the_confirm_callback_is_given_the_into_destination(split_ledger: Path) -> None:
    """`--into` writes to the included file, so that is what consent is asked about."""
    seen: list[tuple[str, str, list[str]]] = []
    agent = make_agent("gpt-4o", "http://unused", "tok")
    deps = BqlDeps(
        file=split_ledger,
        into=Path("side.bean"),
        write_permission=WritePermission(confirm_fn=lambda d, t, w: (seen.append((d, t, w)), "n")[1]),
    )

    answer = _write_tool(agent)(SimpleNamespace(deps=deps), CLEAN_DIRECTIVE)

    assert answer == "Write cancelled by user."
    directive, target, _ = seen[0]
    assert directive == CLEAN_DIRECTIVE
    assert Path(target) == (split_ledger.parent / "side.bean").resolve()
    assert split_ledger.read_text() == ROOT, "declining leaves the root byte-identical"


def test_the_panel_prints_the_destination_in_full_and_escapes_the_directive(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A Rich panel *title* is trimmed to the frame without an ellipsis; a body line is not."""
    from cli.ask import repl

    deep = tmp_path / ("a" * 40) / ("b" * 40) / "side.bean"
    monkeypatch.setattr(repl, "_ask_write_permission", lambda: "n")
    monkeypatch.setattr(repl, "console", repl.Console(width=100, force_terminal=False, record=True))

    assert repl.make_confirm_fn([None])(ARMED_DIRECTIVE, str(deep), ["ledger has 1 warning"]) == "n"

    shown = repl.console.export_text()
    assert _unwrapped(shown).count(str(deep)) == 1, shown
    assert "\\x1b[1A\\x1b[2KAPPROVED" in shown, "the payload is shown as visible escapes"
    assert ESC not in shown, "no model-controlled control byte reaches the panel"
    assert "ledger has 1 warning" in shown


# ── end to end on a real terminal ─────────────────────────────────────────

CSI = re.compile(rb"\x1b\[[0-9;]*[A-Za-z]")


def test_an_armed_directive_never_reaches_the_ledger_or_repaints_the_panel(
    split_ledger: Path, stub_model: StubModel, ask_on_a_terminal: Any
) -> None:
    stub_model.reply = lambda n: (
        model_tool_call("write_directive", {"directive": ARMED_DIRECTIVE}) if n == 1 else model_answer("Done.")
    )

    run = ask_on_a_terminal(
        ["--file", str(split_ledger), "ask", "--into", "side.bean"],
        ["add a 7 usd lunch", "@ENTER", "@WAIT:Done.", "@WAIT:❯", "@CTRL_D"],
    )

    assert run.status == 0, run.screen
    assert b"\x1b[2KAPPROVED" not in run.emitted, "the payload executed against the consent surface"
    for path in (split_ledger, split_ledger.parent / "side.bean"):
        assert b"\x1b" not in path.read_bytes(), f"{path} kept a control byte"
    assert "Write rejected" not in run.screen, "the refusal is the model's business, not a user-facing error"


def test_an_approved_write_lands_in_the_into_file_the_panel_named(
    split_ledger: Path, stub_model: StubModel, ask_on_a_terminal: Any
) -> None:
    def reply(number: int) -> dict[str, object]:
        if number == 1:
            # Quiet output is not readiness for approval: the model may still be working.
            time.sleep(5)
            return model_tool_call("write_directive", {"directive": CLEAN_DIRECTIVE})
        return model_answer("Done.")

    stub_model.reply = reply
    root_before = split_ledger.read_text()

    run = ask_on_a_terminal(
        ["--file", str(split_ledger), "ask", "--into", "side.bean"],
        [
            "add a 7 usd lunch",
            "@ENTER",
            "@WAIT:Append this directive to the ledger",
            "@ENTER",
            "@WAIT:Done.",
            "@WAIT:❯",
            "@CTRL_D",
        ],
    )

    assert run.status == 0, run.screen
    side = split_ledger.parent / "side.bean"
    assert '"lunch"' in side.read_text(), run.screen
    assert split_ledger.read_text() == root_before
    # The path may wrap across body lines at 100 columns; what matters is that
    # every character of it is on screen, and that it is not the root ledger.
    assert str(split_ledger.parent / "side.bean") in _unwrapped(run.screen)
    assert "Write to " not in run.screen, "the destination is no longer a trimmable panel title"


def test_the_answer_channel_is_neutralized_in_print_mode(
    split_ledger: Path, stub_model: StubModel, ask_on_a_terminal: Any
) -> None:
    stub_model.reply = lambda n: model_answer(f"Your balance is 100 USD.{CURSOR_ATTACK}: harmless")

    run = ask_on_a_terminal(["--file", str(split_ledger), "ask", "--print", "balance?"], [])

    assert run.status == 0, run.screen
    assert CSI.search(run.emitted) is None, f"raw CSI reached the terminal: {CSI.findall(run.emitted)[:4]}"
    assert "\\x1b[1A\\x1b[2KAPPROVED" in run.screen


# ── a model's Markdown link cannot disguise its target (w1/097) ────────────

#: A link whose visible text names one site and whose target is another.
DISGUISED_LINK = "Log in at [https://beancount.io/login](https://evil.example/phish) now."
OSC8 = b"\x1b]8;"
#: A terminal that renders hyperlinks. The PTY default is `TERM=dumb`, under
#: which Rich emits no styling at all, so the escape could never appear there.
LINK_TERMINAL = {"TERM": "xterm-256color"}


def _visible(run: Any) -> str:
    return str(CSI.sub(b"", run.emitted).decode("utf-8", "replace"))


def test_a_markdown_link_shows_its_target_in_print_mode(
    split_ledger: Path, stub_model: StubModel, ask_on_a_terminal: Any
) -> None:
    stub_model.reply = lambda n: model_answer(DISGUISED_LINK)

    run = ask_on_a_terminal(["--file", str(split_ledger), "ask", "--print", "link"], [], env_overrides=LINK_TERMINAL)

    assert run.status == 0, run.screen
    assert OSC8 not in run.emitted, "the answer opened a terminal hyperlink"
    assert "https://evil.example/phish" in _visible(run)


def test_a_markdown_link_shows_its_target_in_the_session(
    split_ledger: Path, stub_model: StubModel, ask_on_a_terminal: Any
) -> None:
    stub_model.reply = lambda n: model_answer(DISGUISED_LINK)

    run = ask_on_a_terminal(
        ["--file", str(split_ledger), "ask"],
        ["link", "@ENTER", "@WAIT:now.", "@WAIT:❯", "@CTRL_D"],
        env_overrides=LINK_TERMINAL,
    )

    assert run.status == 0, run.screen
    assert OSC8 not in run.emitted, "the answer opened a terminal hyperlink"
    assert "https://evil.example/phish" in _visible(run)
