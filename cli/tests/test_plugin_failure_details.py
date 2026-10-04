"""Plugin failures keep the exception type and point at the failing directive (w1/101).

Only the traceback's last non-empty line was kept, so a multi-line message
lost its type and first line; and the first `plugin "name"` line was
reported even when a later directive with another config was the one that
failed.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from bea_engine.query import _exception_summary

ROOT = Path(__file__).resolve().parents[1]

BOOM = (
    '__plugins__ = ["boom"]\n\n\n'
    "def boom(entries, options):\n"
    '    raise ValueError("Bad account mapping:\\n  Assets:Old -> ?")\n'
)
CFGP = (
    '__plugins__ = ["cfgp"]\n\n\n'
    "def cfgp(entries, options, config):\n"
    '    if config == "bad":\n'
    '        raise ValueError(f"Bad config: {config}")\n'
    "    return entries, []\n"
)


def _check(tmp_path: Path, ledger_text: str, plugins: dict[str, str]) -> list[str]:
    for name, source in plugins.items():
        (tmp_path / f"{name}.py").write_text(source, encoding="utf-8")
    ledger = tmp_path / "main.bean"
    ledger.write_text(ledger_text, encoding="utf-8")
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    done = subprocess.run(
        [sys.executable, "-m", "cli.main", "--json", "--file", str(ledger), "check"],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
        stdin=subprocess.DEVNULL,
    )
    assert done.returncode == 1, done.stderr
    return [str(detail) for detail in json.loads(done.stderr)["error"]["details"]]


def test_a_multi_line_plugin_message_keeps_its_type_and_first_line(tmp_path: Path) -> None:
    details = _check(
        tmp_path,
        'option "insert_pythonpath" "TRUE"\nplugin "boom"\n2024-01-01 open Assets:Cash USD\n',
        {"boom": BOOM},
    )

    ledger = tmp_path / "main.bean"
    expected = f'{ledger}:2: Plugin "boom" failed while running: ValueError: Bad account mapping: Assets:Old -> ?.'
    assert expected in details, details


def test_the_failing_config_locates_its_own_directive(tmp_path: Path) -> None:
    details = _check(
        tmp_path,
        'option "insert_pythonpath" "TRUE"\n'
        "2024-01-01 open Assets:Cash USD\n"
        "\n"
        'plugin "cfgp" "good"\n'
        'plugin "cfgp" "bad"\n',
        {"cfgp": CFGP},
    )

    ledger = tmp_path / "main.bean"
    expected = f'{ledger}:5: Plugin "cfgp" failed while running: ValueError: Bad config: bad.'
    assert expected in details, details


def test_recorded_plugin_errors_pickle_as_plain_load_errors(tmp_path: Path) -> None:
    """Beancount's load cache must stay readable by upstream tools that lack bea_engine."""
    import pickle

    from bea_engine import managed_load
    from bea_engine.managed_load import PLUGIN_CONFIG_KEY

    (tmp_path / "cfgp.py").write_text(CFGP, encoding="utf-8")
    ledger = tmp_path / "main.bean"
    ledger.write_text('option "insert_pythonpath" "TRUE"\nplugin "cfgp" "bad"\n', encoding="utf-8")
    sys.path.insert(0, str(tmp_path))
    try:
        _entries, errors, _options = managed_load.load_file(ledger)
    finally:
        sys.path.remove(str(tmp_path))
        sys.modules.pop("cfgp", None)

    failure = next(error for error in errors if "cfgp" in error.message)
    assert failure.source[PLUGIN_CONFIG_KEY] == "bad"
    pickled = pickle.dumps(failure)
    assert b"bea_engine" not in pickled
    restored = pickle.loads(pickled)
    assert (type(restored).__module__, type(restored).__qualname__) == ("beancount.loader", "LoadError")
    assert tuple(restored) == tuple(failure)


@pytest.mark.parametrize(
    ("text", "summary"),
    [
        (
            'Traceback (most recent call last):\n    File "x.py", line 1, in f\n      raise KeyError("k")\n'
            "  KeyError: 'k'\n  ",
            "KeyError: 'k'",
        ),
        ("no traceback at all", "no traceback at all"),
    ],
)
def test_exception_summary(text: str, summary: str) -> None:
    assert _exception_summary(text) == summary
