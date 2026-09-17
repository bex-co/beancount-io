"""`bea add commodity --meta` registers what a symbol is (w3/354)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )


def _ledger(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text('option "operating_currency" "USD"\n')
    return ledger


def test_meta_is_written_under_the_directive(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    result = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "commodity",
        "--date",
        "2020-01-01",
        "--currency",
        "VFINX",
        "--meta",
        "name:Vanguard 500 Index",
        "--meta",
        "asset-class:equity",
    )
    assert result.returncode == 0, result.stderr
    text = ledger.read_text()
    assert "2020-01-01 commodity VFINX" in text
    assert '  name: "Vanguard 500 Index"' in text
    assert '  asset-class: "equity"' in text

    check = _bea(tmp_path, "--file", str(ledger), "check")
    assert check.returncode == 0, check.stderr


def test_typed_meta_keeps_its_type_on_disk_and_in_json(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    result = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "add",
        "commodity",
        "--date",
        "2020-01-02",
        "--currency",
        "VBTLX",
        "--meta",
        "quantum:3",
        "--meta",
        "when:2020-03-04",
    )
    assert result.returncode == 0, result.stderr
    meta = json.loads(result.stdout)["data"]["directive"]["meta"]
    # The same tagged shape `add transaction` answers with, so the response can
    # be sent again without a number becoming text.
    assert meta["quantum"] == {"kind": "number", "value": "3"}
    assert meta["when"] == {"kind": "date", "value": "2020-03-04"}
    text = ledger.read_text()
    assert "  quantum: 3" in text
    assert "  when: 2020-03-04" in text


def test_a_commodity_without_meta_is_unchanged(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    result = _bea(tmp_path, "--file", str(ledger), "add", "commodity", "--date", "2020-01-03", "--currency", "HOOL")
    assert result.returncode == 0, result.stderr
    assert ledger.read_text().rstrip().endswith("2020-01-03 commodity HOOL")


def test_an_invalid_meta_key_is_refused_before_writing(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    before = ledger.read_text()
    result = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "commodity",
        "--date",
        "2020-01-04",
        "--currency",
        "HOOL",
        "--meta",
        "Name:nope",
    )
    assert result.returncode == 2, result.stdout + result.stderr
    assert ledger.read_text() == before
