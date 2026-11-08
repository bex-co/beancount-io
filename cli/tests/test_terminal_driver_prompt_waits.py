"""Terminal scripts wait for a new prompt after submitting a question."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from tests.conftest import StubModel, model_answer


def test_a_prompt_wait_does_not_reuse_the_prompt_before_the_question(
    tmp_path: Path, stub_model: StubModel, ask_on_a_terminal: Any
) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text("2026-01-01 open Assets:Cash USD\n")

    def delayed_reply(_n: int) -> object:
        # Longer than the driver's key interval: a stale prompt match sends
        # Ctrl-D during this request, then strands the real next prompt.
        time.sleep(4)
        return model_answer("The delayed answer arrived.")

    stub_model.reply = delayed_reply
    result = ask_on_a_terminal(
        ["--file", str(ledger), "ask"],
        ["question", "@ENTER", "@WAIT:❯", "@CTRL_D"],
        timeout=30,
    )

    assert result.status == 0, result.screen
    assert "The delayed answer arrived." in result.screen
    assert stub_model.count == 1
