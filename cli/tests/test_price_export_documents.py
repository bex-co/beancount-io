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


def test_an_absolute_document_path_refuses_after_a_unicode_line_separator(tmp_path: Path) -> None:
    # U+2028 is a line break to `str.splitlines` but not to Beancount's lexer;
    # counting it put the directive's line one early and let the path through (w1/049).
    source = tmp_path / "source"
    source.mkdir()
    receipt = source / "receipt.pdf"
    receipt.write_bytes(RECEIPT)
    main = source / "main.bean"
    main.write_text(
        f'; pasted\u2028comment\n2024-01-01 open Assets:Cash USD\n2024-03-01 document Assets:Cash "{receipt}"\n',
        encoding="utf-8",
    )

    out = tmp_path / "out"
    refused = _export(tmp_path, main, out)
    assert refused.returncode == 2, refused.stdout
    assert "main.bean:3" in refused.stderr
    assert not out.exists()


def test_symlinked_documents_keep_the_name_the_directive_uses(tmp_path: Path) -> None:
    """w1/044: a symlinked file or folder was copied under its target's name.

    The copied ledger still named `alias.pdf` and `linked/statement.pdf`, so
    the export reported success and then failed its own check; two aliases of
    one receipt collapsed into a single copy neither name reached.
    """
    source = tmp_path / "source"
    (source / "real").mkdir(parents=True)
    (source / "receipt.pdf").write_bytes(RECEIPT)
    (source / "real" / "statement.pdf").write_bytes(b"statement\n")
    (source / "alias.pdf").symlink_to("receipt.pdf")
    (source / "alias2.pdf").symlink_to("receipt.pdf")
    (source / "linked").symlink_to("real")
    os.link(source / "receipt.pdf", source / "hard.pdf")
    main = source / "main.bean"
    main.write_text(
        "2024-01-01 open Assets:Cash USD\n"
        '2024-03-01 document Assets:Cash "alias.pdf"\n'
        '2024-03-02 document Assets:Cash "alias2.pdf"\n'
        '2024-03-03 document Assets:Cash "linked/statement.pdf"\n'
        '2024-03-04 document Assets:Cash "receipt.pdf"\n'
        '2024-03-05 document Assets:Cash "hard.pdf"\n'
    )
    before = _snapshot(source)

    out = tmp_path / "out"
    exported = _export(tmp_path, main, out)
    assert exported.returncode == 0, exported.stderr
    files = sorted(Path(f).relative_to(out).as_posix() for f in json.loads(exported.stdout)["data"]["files"])
    assert files == ["alias.pdf", "alias2.pdf", "hard.pdf", "linked/statement.pdf", "main.bean", "receipt.pdf"]
    assert _snapshot(source) == before
    # Plain copies, so the snapshot does not depend on links that may not travel.
    assert not any(p.is_symlink() for p in out.rglob("*"))
    assert (out / "alias2.pdf").read_bytes() == RECEIPT
    assert (out / "linked" / "statement.pdf").read_bytes() == b"statement\n"

    relocated = tmp_path / "elsewhere" / "copy"
    shutil.copytree(out, relocated)
    shutil.rmtree(source)
    checked = _bean_check(tmp_path, relocated / "main.bean")
    assert checked.returncode == 0, checked.stdout + checked.stderr


def test_a_symlink_to_a_file_outside_the_tree_still_refuses(tmp_path: Path) -> None:
    source = tmp_path / "source"
    source.mkdir()
    (tmp_path / "elsewhere.pdf").write_bytes(RECEIPT)
    (source / "alias.pdf").symlink_to(tmp_path / "elsewhere.pdf")
    main = source / "main.bean"
    main.write_text('2024-01-01 open Assets:Cash USD\n2024-03-01 document Assets:Cash "alias.pdf"\n')

    out = tmp_path / "out"
    refused = _export(tmp_path, main, out)
    assert refused.returncode == 2, refused.stdout
    assert "elsewhere.pdf" in refused.stderr
    assert not out.exists()
