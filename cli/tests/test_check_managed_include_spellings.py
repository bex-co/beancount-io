"""Text `bea check` routes every spelling of a managed include to the helper (w5/192).

`check` decided with its own pattern whether the closure names a URL include
native bean-check cannot fetch. The pattern wanted a lowercase scheme and a
space after the keyword, so `include "HTTP://…"` and `include"http://…"` —
both of which the loader resolves — went to bean-check and were reported as a
file glob that matches nothing, while `--json check` called the ledger valid.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_price import _run_bea
from tests.test_price import feed_server as feed_server

LEDGER = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Broker
2024-01-01 open Expenses:Food
"""


def _include(feed_server: str, spelling: str) -> str:
    url = f"{feed_server}/prices/BTC-USD"
    return {
        "lowercase": f'include "{url}"',
        "uppercase-scheme": f'include "{url.replace("http://", "HTTP://", 1)}"',
        "mixed-scheme": f'include "{url.replace("http://", "hTtP://", 1)}"',
        "no-space": f'include"{url}"',
        "no-space-uppercase": f'include"{url.replace("http://", "HTTP://", 1)}"',
    }[spelling]


@pytest.mark.parametrize(
    "spelling", ["lowercase", "uppercase-scheme", "mixed-scheme", "no-space", "no-space-uppercase"]
)
def test_text_check_agrees_with_json_check(feed_server: str, tmp_path: Path, spelling: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER + _include(feed_server, spelling) + "\n")

    control = _run_bea(tmp_path, feed_server, "--json", "--file", str(ledger), "check")
    text = _run_bea(tmp_path, feed_server, "--file", str(ledger), "check")

    assert control.returncode == 0, control.stderr
    assert json.loads(control.stdout)["data"] == {"valid": True, "errors": []}
    assert text.returncode == 0, text.stdout + text.stderr
    assert "does not match any files" not in text.stdout + text.stderr
    assert "matches no file" not in text.stdout + text.stderr


def test_bean_check_options_are_refused_for_an_uppercase_scheme(feed_server: str, tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER + _include(feed_server, "uppercase-scheme") + "\n")

    result = _run_bea(tmp_path, feed_server, "--file", str(ledger), "check", "-v")

    assert result.returncode == 2, result.stdout + result.stderr
    assert "names a URL include native bean-check cannot fetch" in result.stderr


def test_a_local_include_still_runs_native_bean_check(feed_server: str, tmp_path: Path) -> None:
    (tmp_path / "HTTP").mkdir()
    (tmp_path / "HTTP" / "extra.bean").write_text("2024-01-01 open Assets:Cash USD\n")
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER + 'include"HTTP/extra.bean"\n')

    result = _run_bea(tmp_path, feed_server, "--file", str(ledger), "check", "-v")

    assert result.returncode == 0, result.stdout + result.stderr
