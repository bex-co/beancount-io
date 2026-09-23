"""`price export` carries the ledger's document attachments (w4/180).

Beancount validates that every `document` exists, but the export copied only
ledger text: a source that passed `bean-check` produced an export that failed
it, with exit 0 and a manifest that never mentioned the missing file.

Documents under the root's directory now travel to the same relative place.
Anything that could not travel that way — outside the tree, or named by an
absolute path — refuses the export before a byte is written.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECEIPT = b"synthetic receipt bytes\n"


def _run(tmp_path: Path, *argv: str) -> subprocess.CompletedProcess[str]:
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
    return subprocess.run(list(argv), env=env, cwd=tmp_path, capture_output=True, text=True, timeout=120)


def _export(tmp_path: Path, main: Path, out: Path) -> subprocess.CompletedProcess[str]:
    return _run(
        tmp_path,
        sys.executable,
        "-m",
        "cli.main",
        "--json",
        "--file",
        str(main),
        "price",
        "export",
        "--output",
        str(out),
    )


def _bean_check(tmp_path: Path, ledger: Path) -> subprocess.CompletedProcess[str]:
    return _run(tmp_path, sys.executable, "-c", "from beancount.scripts.check import main; main()", str(ledger))


def _snapshot(directory: Path) -> dict[str, bytes]:
    return {str(p.relative_to(directory)): p.read_bytes() for p in sorted(directory.rglob("*")) if p.is_file()}


def test_documents_travel_with_the_export_and_survive_relocation(tmp_path: Path) -> None:
    source = tmp_path / "source"
    (source / "parts").mkdir(parents=True)
    (source / "docs").mkdir()
    (source / "receipt.pdf").write_bytes(RECEIPT)
    (source / "docs" / "statement.pdf").write_bytes(RECEIPT)
    main = source / "main.bean"
    main.write_text(
        '2024-01-01 open Assets:Cash USD\n2024-03-01 document Assets:Cash "receipt.pdf"\ninclude "parts/more.bean"\n'
    )
    # A nested include names its document relative to itself.
    (source / "parts" / "more.bean").write_text('2024-03-02 document Assets:Cash "../docs/statement.pdf"\n')
    before = _snapshot(source)

    out = tmp_path / "out"
    exported = _export(tmp_path, main, out)
    assert exported.returncode == 0, exported.stderr
    files = sorted(Path(f).relative_to(out).as_posix() for f in json.loads(exported.stdout)["data"]["files"])
    assert files == ["docs/statement.pdf", "main.bean", "parts/more.bean", "receipt.pdf"]
    assert _snapshot(source) == before

    relocated = tmp_path / "elsewhere" / "copy"
    shutil.copytree(out, relocated)
    shutil.rmtree(source)
    checked = _bean_check(tmp_path, relocated / "main.bean")
    assert checked.returncode == 0, checked.stdout + checked.stderr


def test_a_document_outside_the_tree_refuses_before_writing(tmp_path: Path) -> None:
    source = tmp_path / "source"
    source.mkdir()
    (tmp_path / "elsewhere.pdf").write_bytes(RECEIPT)
    main = source / "main.bean"
    main.write_text('2024-01-01 open Assets:Cash USD\n2024-03-01 document Assets:Cash "../elsewhere.pdf"\n')

    out = tmp_path / "out"
    refused = _export(tmp_path, main, out)
    assert refused.returncode == 2, refused.stdout
    assert "elsewhere.pdf" in refused.stderr
    assert "Nothing was written" in refused.stderr
    assert not out.exists()


def test_an_absolute_document_path_refuses_rather_than_pinning_this_machine(tmp_path: Path) -> None:
    source = tmp_path / "source"
    source.mkdir()
    receipt = source / "receipt.pdf"
    receipt.write_bytes(RECEIPT)
    main = source / "main.bean"
    main.write_text(f'2024-01-01 open Assets:Cash USD\n2024-03-01 document Assets:Cash "{receipt}"\n')

    out = tmp_path / "out"
    refused = _export(tmp_path, main, out)
    assert refused.returncode == 2, refused.stdout
    assert "main.bean:2" in refused.stderr
    assert not out.exists()
