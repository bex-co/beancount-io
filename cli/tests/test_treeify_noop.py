"""`bea treeify` fails loudly when upstream finds no column to render (w1/m23/t006)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

ALIGNED = "Assets:Bank:Checking               100\nAssets:Cash                       25\n"


def _env(tmp_path: Path) -> dict[str, str]:
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
    return env


def _bea(tmp_path: Path, *args: str, stdin: str = "") -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        input=stdin,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_treeify_no_column_exits_nonzero_and_names_target(tmp_path: Path) -> None:
    result = _bea(tmp_path, "treeify", stdin="hello\nworld\n")
    assert result.returncode == 2, result.stderr
    assert result.stdout == ""
    assert "Could not find any valid column in input" in result.stderr
    assert "no hierarchical column" in result.stderr


def test_treeify_success_path_renders_tree(tmp_path: Path) -> None:
    result = _bea(tmp_path, "treeify", stdin=ALIGNED)
    assert result.returncode == 0, result.stderr
    assert "`-- Assets" in result.stdout


def test_treeify_refuses_an_existing_ledger_file_unless_forced(tmp_path: Path) -> None:
    """A ledger file treeify was never given is not replaced without `--force` (w3/m48)."""
    foreign = tmp_path / "somebody-else.bean"
    foreign.write_text('option "title" "OTHER LEDGER"\n')

    refused = _bea(tmp_path, "treeify", "-o", "somebody-else.bean", stdin=ALIGNED)

    assert refused.returncode == 2, refused.stderr
    assert "Already exists" in refused.stderr
    assert "--force" in refused.stderr
    assert foreign.read_text() == 'option "title" "OTHER LEDGER"\n'

    forced = _bea(tmp_path, "treeify", "-o", "somebody-else.bean", "--force", stdin=ALIGNED)

    assert forced.returncode == 0, forced.stderr
    assert "`-- Assets" in foreign.read_text()


def test_treeify_writes_a_fresh_destination(tmp_path: Path) -> None:
    """The legitimate use is untouched: a path that is nobody's file is written."""
    result = _bea(tmp_path, "treeify", "-o", "fresh.bean", stdin=ALIGNED)

    assert result.returncode == 0, result.stderr
    assert "`-- Assets" in (tmp_path / "fresh.bean").read_text()


def test_a_failed_run_leaves_its_destination_untouched(tmp_path: Path) -> None:
    """Upstream opens `-o` before it reads; a failure must not have written (w1/084)."""
    notes = tmp_path / "notes.txt"
    notes.write_text("IMPORTANT NOTES\n")

    result = _bea(tmp_path, "treeify", "-o", str(notes), stdin="quarterly summary\nno accounts here\n")

    assert result.returncode == 2, result.stderr
    assert "no hierarchical column" in result.stderr
    assert notes.read_text() == "IMPORTANT NOTES\n"


def test_a_destination_that_is_the_input_is_refused(tmp_path: Path) -> None:
    balances = tmp_path / "bal.txt"
    balances.write_text("Assets:Cash  1\nAssets:Bank  2\n")

    result = _bea(tmp_path, "treeify", str(balances), "-o", str(balances))

    assert result.returncode == 2, result.stderr
    assert "would overwrite the file it reads" in result.stderr
    assert balances.read_text() == "Assets:Cash  1\nAssets:Bank  2\n"


def test_a_valid_input_file_still_writes_its_destination(tmp_path: Path) -> None:
    source = tmp_path / "accounts.txt"
    source.write_text(ALIGNED)

    result = _bea(tmp_path, "treeify", str(source), "-o", "tree.txt")

    assert result.returncode == 0, result.stderr
    assert result.stdout == ""
    assert "`-- Assets" in (tmp_path / "tree.txt").read_text()
    assert source.read_text() == ALIGNED


BALANCES = "Assets:Cash     10\nAssets:Savings  20\nExpenses:Food    5\n"


@pytest.mark.parametrize(
    "option",
    [
        ("--pattern", "["),
        ("--delimiter", "["),
        ("--split", "["),
        ("-r", "(unclosed"),
        ("-d", "*"),
        ("--split=a{2,1}",),
    ],
    ids=["pattern", "delimiter", "split", "short-pattern", "short-delimiter", "split-equals"],
)
def test_treeify_names_the_malformed_regex_option(tmp_path: Path, option: tuple[str, ...]) -> None:
    """w5/061: a regex typo was `IndexError: no such group` or a position in text the user never typed, exit 1."""
    source = tmp_path / "balances.txt"
    source.write_text(BALANCES)
    out = tmp_path / "out.txt"
    out.write_text("SENTINEL\n")
    flag = {"-r": "--pattern", "-d": "--delimiter"}.get(option[0], option[0].split("=")[0])
    value = option[-1].split("=", 1)[-1]

    result = _bea(tmp_path, "treeify", str(source), "-o", str(out), *option)

    assert result.returncode == 2, result.stderr
    assert result.stdout == ""
    assert f"Invalid regular expression for {flag} {value!r}" in result.stderr
    assert "IndexError" not in result.stderr
    assert "treeify failed" not in result.stderr
    assert out.read_text() == "SENTINEL\n"
    assert source.read_text() == BALANCES


def test_treeify_valid_and_default_regexes_still_render(tmp_path: Path) -> None:
    source = tmp_path / "balances.txt"
    source.write_text(BALANCES)
    out = tmp_path / "out.txt"

    custom = _bea(tmp_path, "treeify", str(source), "-o", str(out), "--delimiter", " {2,}")
    assert custom.returncode == 0, custom.stderr
    tree = out.read_text()
    assert "Assets" in tree and "Savings" in tree and "Food" in tree
    assert tree != BALANCES

    default = _bea(tmp_path, "treeify", str(source))
    assert default.returncode == 0, default.stderr
    assert default.stdout == tree


def test_treeify_does_not_validate_a_split_that_a_preset_replaces(tmp_path: Path) -> None:
    """`--loose-accounts` supplies its own split, so upstream never compiles the one given."""
    result = _bea(tmp_path, "treeify", "--loose-accounts", "--split", "[", stdin=BALANCES)
    assert result.returncode == 0, result.stderr
    assert "Assets" in result.stdout
