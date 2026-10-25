"""`bea import` dispatches OFX/QFX into the no-code preview (w22/m2/t003).

Flag-free `.ofx`/`.qfx` files — and OFX content under any suffix — route
to the engine's `--ofx` path with the same preview, rules, `--apply`,
and remembered-settings behavior as CSV. Tests that only need routing
run on the plain interpreter: without beangulp the engine answers its
install hint, which only the OFX branch emits, so the hint itself proves
the dispatch. Tests that need a real preview point `BEA_ENGINE_PYTHON`
at a wrapper over the beangulp overlay, skipping when it cannot build.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app
from tests.conftest import write_ofx

runner = CliRunner()
CLI_ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = CLI_ROOT / "docs" / "examples"

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Expenses:Uncategorized USD
"""

BEANGULP_HINT = "Engine feature 'beangulp' is not enabled. Run: bea engine enable beangulp"


@pytest.fixture(scope="module")
def beangulp_engine(tmp_path_factory: pytest.TempPathFactory) -> str:
    """A `BEA_ENGINE_PYTHON` wrapper with the real beangulp, skipping offline."""
    if sys.platform == "win32":
        pytest.skip("the overlay wrapper is a POSIX shell script")
    wrapper = tmp_path_factory.mktemp("ofx-engine") / "ofx-python"
    wrapper.write_text(
        f'#!/bin/sh\nexec uv run --quiet --project "{CLI_ROOT}" --with beangulp==0.2.0 --no-sync python "$@"\n'
    )
    wrapper.chmod(0o755)
    probe = subprocess.run(
        [str(wrapper), "-c", "import examples.importers.ofx"],
        capture_output=True,
        text=True,
        timeout=300,
        cwd=CLI_ROOT,
        check=False,
    )
    if probe.returncode != 0:
        pytest.skip(f"beangulp overlay unavailable: {(probe.stderr or probe.stdout)[-500:]}")
    return str(wrapper)


@pytest.fixture
def books(tmp_path: Path, bea_config_dir: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    write_ofx(tmp_path / "checking.ofx")
    return ledger


def _import(ledger: Path, *args: str):
    return runner.invoke(app, ["--no-input", "--file", str(ledger), "import", *args])


def test_flag_free_ofx_reaches_the_engine_ofx_branch(books: Path) -> None:
    """Without beangulp, a flag-free `.ofx` import answers the install hint.

    Only the engine's OFX branch emits that text, so the hint proves the
    dispatch; where beangulp is installed the same run previews instead.
    """
    result = _import(books, str(books.parent / "checking.ofx"), "--account", "Assets:Checking")
    try:
        import examples.importers.ofx  # noqa: F401
    except ImportError:
        assert result.exit_code == 2, result.output
        assert BEANGULP_HINT in result.stderr
    else:
        assert result.exit_code == 0, result.output
        assert "OfxImporter" in result.stdout


def test_ofx_with_a_beangulp_less_override_names_the_override(books: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """The frontend gate fires before the engine when the override lacks beangulp."""
    try:
        import examples.importers.ofx  # noqa: F401
    except ImportError:
        pass
    else:
        pytest.skip("beangulp is installed here; nothing to refuse")
    monkeypatch.setenv("BEA_ENGINE_PYTHON", sys.executable)
    result = _import(books, str(books.parent / "checking.ofx"), "--account", "Assets:Checking")
    assert result.exit_code == 2, result.output
    message = " ".join(result.stderr.split())
    assert f"Engine feature 'beangulp' is not available in BEA_ENGINE_PYTHON={sys.executable}." in message
    assert "Install it into that environment, or unset BEA_ENGINE_PYTHON" in message


def test_ofx_content_under_any_suffix_dispatches(books: Path, tmp_path: Path) -> None:
    renamed = tmp_path / "statement.txt"
    write_ofx(renamed)
    result = _import(books, str(renamed), "--account", "Assets:Checking")
    try:
        import examples.importers.ofx  # noqa: F401
    except ImportError:
        assert result.exit_code == 2, result.output
        assert BEANGULP_HINT in result.stderr
    else:
        assert result.exit_code == 0, result.output
        assert "OfxImporter" in result.stdout


def test_ofx_suffix_without_ofx_content_is_refused_as_not_ofx(
    books: Path, tmp_path: Path, beangulp_engine: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Suffix dispatch reaches the engine, which validates the content itself."""
    monkeypatch.setenv("BEA_ENGINE_PYTHON", beangulp_engine)
    monkeypatch.delenv("BEA_ENGINE_DIR", raising=False)
    fake = tmp_path / "fake.ofx"
    fake.write_text("Date,Amount\n2026-08-01,1.00\n")
    result = _import(books, str(fake), "--account", "Assets:Checking")
    assert result.exit_code == 2, result.output
    assert "is not an OFX file" in result.stderr


def test_detected_ofx_without_an_account_names_it(books: Path) -> None:
    result = _import(books, str(books.parent / "checking.ofx"))
    assert result.exit_code == 2, result.output
    message = " ".join(result.stderr.split())
    assert (
        "Detected checking.ofx as an OFX export, but not which account the export belongs to. "
        "Add --account ACCOUNT" in message
    )


def test_explicit_ofx_without_an_account_names_the_flag(books: Path) -> None:
    result = _import(books, str(books.parent / "checking.ofx"), "--ofx")
    assert result.exit_code == 2, result.output
    assert "--ofx needs --account ACCOUNT, naming the account the export belongs to." in result.stderr


def test_ofx_refuses_csv_only_and_python_importer_options(books: Path) -> None:
    source = str(books.parent / "checking.ofx")
    dated = _import(books, source, "--ofx", "--account", "Assets:Checking", "--date-format", "%Y-%m-%d")
    assert dated.exit_code == 2, dated.output
    assert "--date-format applies only to --csv rows, but this import reads checking.ofx as OFX." in dated.stderr

    named = _import(books, source, "--ofx", "--account", "Assets:Checking", "--importer", "bank")
    assert named.exit_code == 2, named.output
    assert "the built-in OFX importer, which has no named importers" in named.stderr


@pytest.mark.parametrize(
    ("extra", "message"),
    [
        (["--csv", "auto"], "Pass only one of --csv, --config, or --ofx."),
        (["--config", "importers.py"], "Pass only one of --csv, --config, or --ofx."),
    ],
    ids=["csv-and-ofx", "config-and-ofx"],
)
def test_ofx_combined_with_another_mode_is_refused(books: Path, extra: list[str], message: str) -> None:
    result = _import(books, str(books.parent / "checking.ofx"), "--ofx", *extra)
    assert result.exit_code == 2, result.output
    assert message in result.stderr


def test_config_with_no_code_options_on_ofx_names_ofx(books: Path) -> None:
    """Column-mapping options under `--config` advise `--ofx` for OFX files."""
    (books.parent / "importers.py").write_text("CONFIG = []\n")
    result = _import(
        books,
        str(books.parent / "checking.ofx"),
        "--config",
        str(books.parent / "importers.py"),
        "--account",
        "Assets:Checking",
    )
    assert result.exit_code == 2, result.output
    message = " ".join(result.stderr.split())
    assert "--account applies only to --csv or --ofx rows" in message
    assert "replace --config with --ofx to import it without an importer" in message


def test_configured_ledger_keeps_its_python_importers_for_ofx(books: Path, tmp_path: Path) -> None:
    """Auto-dispatch never hijacks a ledger that configured Python importers."""
    (books.parent / "importers.py").write_text(
        "from beancount.core.amount import Amount\n"
        "from beancount.core.data import Posting, Transaction, new_metadata\n"
        "from beancount.core.number import D\n"
        "import datetime\n"
        "\n"
        "class OfxBank:\n"
        "    def identify(self, filepath):\n"
        "        return filepath.endswith('.ofx')\n"
        "    def account(self, filepath):\n"
        "        return 'Assets:Checking'\n"
        "    def extract(self, filepath, existing):\n"
        "        meta = new_metadata(filepath, 0)\n"
        "        return [Transaction(meta, datetime.date(2026, 8, 3), '*', None, 'OFX row', frozenset(), frozenset(),\n"
        "            [Posting('Assets:Checking', Amount(D('-1.00'), 'USD'), None, None, None, None),\n"
        "             Posting('Expenses:Uncategorized', Amount(D('1.00'), 'USD'), None, None, None, None)])]\n"
        "\n"
        "CONFIG = [OfxBank()]\n"
    )
    result = _import(books, str(books.parent / "checking.ofx"))
    assert result.exit_code == 0, result.output
    assert "Using importers from" in result.stderr and "importers.py" in result.stderr
    assert "OfxImporter" not in result.stdout


def test_ofx_preview_rules_and_apply_through_the_wrapper(
    books: Path, tmp_path: Path, beangulp_engine: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """End to end: preview, `--rules`, `--apply`, and the RULE column."""
    monkeypatch.setenv("BEA_ENGINE_PYTHON", beangulp_engine)
    monkeypatch.delenv("BEA_ENGINE_DIR", raising=False)
    rules = tmp_path / "rules.toml"
    rules.write_text('[[rule]]\nmatch = "PEETS"\naccount = "Expenses:Food"\n')
    preview = _import(books, str(books.parent / "checking.ofx"), "--account", "Assets:Checking", "--rules", str(rules))
    assert preview.exit_code == 0, preview.output
    assert "Detected checking.ofx as an OFX export; parsed with beangulp's OFX importer." in preview.stderr
    assert "RULE" in preview.stdout and "PEETS" in preview.stdout
    assert "OfxImporter → Assets:Checking: 2 ready" in preview.stdout

    applied = _import(
        books, str(books.parent / "checking.ofx"), "--account", "Assets:Checking", "--rules", str(rules), "--apply"
    )
    assert applied.exit_code == 0, applied.output
    assert "Wrote 2 entries" in applied.stdout
    text = books.read_text()
    assert 'import-id: "ofx:TXN-001"' in text and "Expenses:Food" in text


def test_ofx_account_is_remembered_per_acctid(
    books: Path, tmp_path: Path, beangulp_engine: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The first run remembers the account; the next flag-free run replays it."""
    monkeypatch.setenv("BEA_ENGINE_PYTHON", beangulp_engine)
    monkeypatch.delenv("BEA_ENGINE_DIR", raising=False)
    first = _import(books, str(books.parent / "checking.ofx"), "--account", "Assets:Checking", "--apply")
    assert first.exit_code == 0, first.output

    second = _import(books, str(books.parent / "checking.ofx"))
    assert second.exit_code == 0, second.output
    assert "Using remembered settings for checking.ofx: --ofx --account Assets:Checking." in second.stderr
    assert "2 exact duplicates" in second.stdout

    other = tmp_path / "other.ofx"
    write_ofx(other, acctid="CHK-10")
    third = _import(books, str(other))
    assert third.exit_code == 2, third.output
    assert "but not which account the export belongs to" in " ".join(third.stderr.split())


def test_ofx_recalled_json_reports_the_settings(
    books: Path, beangulp_engine: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A recalled run reports its settings in the envelope like CSV does."""
    monkeypatch.setenv("BEA_ENGINE_PYTHON", beangulp_engine)
    monkeypatch.delenv("BEA_ENGINE_DIR", raising=False)
    first = _import(books, str(books.parent / "checking.ofx"), "--account", "Assets:Checking", "--apply")
    assert first.exit_code == 0, first.output

    result = runner.invoke(
        app, ["--json", "--no-input", "--file", str(books), "import", str(books.parent / "checking.ofx")]
    )
    assert result.exit_code == 0, result.output
    payload = json.loads(result.stdout)["data"]
    assert payload["remembered"] == {
        "mapping": None,
        "source": "checking.ofx",
        "account": "Assets:Checking",
        "date_format": None,
        "delimiter": None,
        "encoding": None,
        "decimal": None,
        "skip": None,
        "rules": None,
        "default_account": None,
    }
    assert any("Using remembered settings for checking.ofx" in note for note in payload["notes"])


def test_ofx_typed_account_updates_the_memory(
    books: Path, beangulp_engine: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A different typed `--account` wins this run and replays next time."""
    monkeypatch.setenv("BEA_ENGINE_PYTHON", beangulp_engine)
    monkeypatch.delenv("BEA_ENGINE_DIR", raising=False)
    first = _import(books, str(books.parent / "checking.ofx"), "--account", "Assets:Checking", "--apply")
    assert first.exit_code == 0, first.output

    (books.parent / "main.bean").write_text(LEDGER + "2026-01-01 open Assets:Savings USD\n")
    moved = _import(books, str(books.parent / "checking.ofx"), "--account", "Assets:Savings")
    assert moved.exit_code == 0, moved.output
    assert "OfxImporter → Assets:Savings" in moved.stdout

    replayed = _import(books, str(books.parent / "checking.ofx"))
    assert replayed.exit_code == 0, replayed.output
    assert "Using remembered settings for checking.ofx: --ofx --account Assets:Savings." in replayed.stderr


def test_docs_checking_fixture_imports_end_to_end(
    tmp_path: Path, bea_config_dir: Path, beangulp_engine: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The documented checking sample previews and applies (w22/m2/t004)."""
    monkeypatch.setenv("BEA_ENGINE_PYTHON", beangulp_engine)
    monkeypatch.delenv("BEA_ENGINE_DIR", raising=False)
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    preview = _import(ledger, str(EXAMPLES / "checking.ofx"), "--account", "Assets:Checking")
    assert preview.exit_code == 0, preview.output
    assert "OfxImporter → Assets:Checking: 4 ready" in preview.stdout
    applied = _import(ledger, str(EXAMPLES / "checking.ofx"), "--account", "Assets:Checking", "--apply")
    assert applied.exit_code == 0, applied.output
    assert "Wrote 4 entries" in applied.stdout
    assert 'import-id: "ofx:2026080301"' in ledger.read_text()


def test_docs_credit_card_fixture_reads_cc_statements(
    tmp_path: Path, bea_config_dir: Path, beangulp_engine: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The `.qfx` sample reads `CCSTMTRS` transactional statements."""
    monkeypatch.setenv("BEA_ENGINE_PYTHON", beangulp_engine)
    monkeypatch.delenv("BEA_ENGINE_DIR", raising=False)
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER + "2026-01-01 open Liabilities:Card USD\n")
    preview = _import(ledger, str(EXAMPLES / "credit-card.qfx"), "--account", "Liabilities:Card")
    assert preview.exit_code == 0, preview.output
    assert "OfxImporter → Liabilities:Card: 3 ready" in preview.stdout
    applied = _import(ledger, str(EXAMPLES / "credit-card.qfx"), "--account", "Liabilities:Card", "--apply")
    assert applied.exit_code == 0, applied.output
    assert "Wrote 3 entries" in applied.stdout
    assert 'import-id: "ofx:CC-2026080601"' in ledger.read_text()


def test_docs_multi_currency_fixture_imports_both_statements(
    tmp_path: Path, bea_config_dir: Path, beangulp_engine: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """One OFX 2.x file, one account id, a USD and a EUR statement."""
    monkeypatch.setenv("BEA_ENGINE_PYTHON", beangulp_engine)
    monkeypatch.delenv("BEA_ENGINE_DIR", raising=False)
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n'
        "2026-01-01 open Assets:Checking USD,EUR\n"
        "2026-01-01 open Expenses:Uncategorized USD,EUR\n"
    )
    preview = _import(ledger, str(EXAMPLES / "multi-currency.ofx"), "--account", "Assets:Checking")
    assert preview.exit_code == 0, preview.output
    assert "OfxImporter → Assets:Checking: 2 ready" in preview.stdout
    applied = _import(ledger, str(EXAMPLES / "multi-currency.ofx"), "--account", "Assets:Checking", "--apply")
    assert applied.exit_code == 0, applied.output
    text = ledger.read_text()
    assert "-150.00 USD" in text and "900.00 EUR" in text


def test_docs_fitid_collision_fixture_flags_the_reused_id(
    tmp_path: Path, bea_config_dir: Path, beangulp_engine: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """One FITID on two different rows conflicts; the clean row stays new."""
    monkeypatch.setenv("BEA_ENGINE_PYTHON", beangulp_engine)
    monkeypatch.delenv("BEA_ENGINE_DIR", raising=False)
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    preview = _import(ledger, str(EXAMPLES / "fitid-collision.ofx"), "--account", "Assets:Checking")
    assert preview.exit_code == 0, preview.output
    assert "OfxImporter → Assets:Checking: 2 ready" in preview.stdout
    assert "1 conflict" in preview.stdout
    assert "Row 2: Stable ID repeats row 1 of this import" in preview.stdout


def test_qif_still_points_at_a_python_importer(books: Path, tmp_path: Path) -> None:
    (tmp_path / "bank.qif").write_text("!Type:Bank\nD02/01/2026\nT-1.00\nPA\n^\n")
    result = _import(books, str(tmp_path / "bank.qif"), "--account", "Assets:Checking")
    assert result.exit_code == 2, result.output
    assert "looks like a QIF file" in result.stderr and "use a Python importer that reads it" in result.stderr


def test_non_ofx_xml_is_not_detected_as_ofx(books: Path, tmp_path: Path) -> None:
    """A bare XML declaration (Camt.053 and friends) is not OFX content."""
    camt = tmp_path / "camt.xml"
    camt.write_text('<?xml version="1.0"?>\n<Document><FIToFICstmrStmt></FIToFICstmrStmt></Document>\n')
    result = _import(books, str(camt), "--account", "Assets:Checking")
    assert result.exit_code == 2, result.output
    message = " ".join(result.stderr.split())
    assert "looks like an XML file, not a CSV export" in message
    assert "use a Python importer that reads it" in message
    assert "beangulp" not in result.stderr


def test_ofx_rules_and_default_are_recalled(
    books: Path, tmp_path: Path, beangulp_engine: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A flag-free run replays remembered rules and default, not just the account."""
    monkeypatch.setenv("BEA_ENGINE_PYTHON", beangulp_engine)
    monkeypatch.delenv("BEA_ENGINE_DIR", raising=False)
    rules = tmp_path / "rules.toml"
    rules.write_text('[[rule]]\nmatch = "PEETS"\naccount = "Expenses:Food"\n')
    first = _import(
        books,
        str(books.parent / "checking.ofx"),
        "--account",
        "Assets:Checking",
        "--rules",
        str(rules),
        "--default-account",
        "Expenses:Food",
        "--apply",
    )
    assert first.exit_code == 0, first.output

    second = _import(books, str(books.parent / "checking.ofx"))
    assert second.exit_code == 0, second.output
    note = " ".join(second.stderr.split())
    assert "Using remembered settings for checking.ofx: --ofx --account Assets:Checking" in note
    assert f"--rules {rules}" in note and "--default-account Expenses:Food" in note


def test_ofx_typed_default_updates_the_memory(
    books: Path, beangulp_engine: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A typed `--default-account` on a recalled run wins and replays."""
    monkeypatch.setenv("BEA_ENGINE_PYTHON", beangulp_engine)
    monkeypatch.delenv("BEA_ENGINE_DIR", raising=False)
    first = _import(books, str(books.parent / "checking.ofx"), "--account", "Assets:Checking", "--apply")
    assert first.exit_code == 0, first.output

    moved = _import(books, str(books.parent / "checking.ofx"), "--default-account", "Expenses:Food")
    assert moved.exit_code == 0, moved.output
    assert (
        "Updated remembered settings for checking.ofx: --default-account Expenses:Food. "
        "A flag-free run of this bank account now uses them." in " ".join(moved.stderr.split())
    )

    replayed = _import(books, str(books.parent / "checking.ofx"))
    assert replayed.exit_code == 0, replayed.output
    assert "--default-account Expenses:Food" in " ".join(replayed.stderr.split())


def test_ofx_explicit_run_discards_dropped_rules(
    books: Path, tmp_path: Path, beangulp_engine: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Explicit `--ofx` without `--rules` forgets remembered rules, announced."""
    monkeypatch.setenv("BEA_ENGINE_PYTHON", beangulp_engine)
    monkeypatch.delenv("BEA_ENGINE_DIR", raising=False)
    rules = tmp_path / "rules.toml"
    rules.write_text('[[rule]]\nmatch = "PEETS"\naccount = "Expenses:Food"\n')
    first = _import(
        books, str(books.parent / "checking.ofx"), "--account", "Assets:Checking", "--rules", str(rules), "--apply"
    )
    assert first.exit_code == 0, first.output

    dropped = _import(books, str(books.parent / "checking.ofx"), "--ofx", "--account", "Assets:Checking")
    assert dropped.exit_code == 0, dropped.output
    assert (
        f"Discarded remembered settings for checking.ofx: --rules {rules}. "
        "Re-pass them to keep them across refreshes." in " ".join(dropped.stderr.split())
    )

    replayed = _import(books, str(books.parent / "checking.ofx"))
    assert replayed.exit_code == 0, replayed.output
    assert "--rules" not in " ".join(replayed.stderr.split())


def test_ofx_corrupt_record_reads_as_no_memory(
    books: Path, bea_config_dir: Path, beangulp_engine: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A corrupt OFX record degrades to a fresh run instead of blocking."""
    monkeypatch.setenv("BEA_ENGINE_PYTHON", beangulp_engine)
    monkeypatch.delenv("BEA_ENGINE_DIR", raising=False)
    first = _import(books, str(books.parent / "checking.ofx"), "--account", "Assets:Checking", "--apply")
    assert first.exit_code == 0, first.output
    records = list(bea_config_dir.glob("importers/ofx-*.json"))
    assert len(records) == 1
    records[0].write_text("{not json")

    second = _import(books, str(books.parent / "checking.ofx"))
    assert second.exit_code == 2, second.output
    assert "but not which account the export belongs to" in " ".join(second.stderr.split())


def test_ofx_deleted_remembered_rules_degrade_announced(
    books: Path, tmp_path: Path, beangulp_engine: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Remembered rules that vanish import unruled, with a note saying so."""
    monkeypatch.setenv("BEA_ENGINE_PYTHON", beangulp_engine)
    monkeypatch.delenv("BEA_ENGINE_DIR", raising=False)
    rules = tmp_path / "rules.toml"
    rules.write_text('[[rule]]\nmatch = "PEETS"\naccount = "Expenses:Food"\n')
    first = _import(
        books, str(books.parent / "checking.ofx"), "--account", "Assets:Checking", "--rules", str(rules), "--apply"
    )
    assert first.exit_code == 0, first.output
    rules.unlink()

    second = _import(books, str(books.parent / "checking.ofx"))
    assert second.exit_code == 0, second.output
    assert f"Remembered --rules {rules} cannot be used" in " ".join(second.stderr.split())
    assert "unmatched" in second.stdout


def test_ofx_mistyped_account_is_not_remembered(
    books: Path, bea_config_dir: Path, beangulp_engine: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A typo account previews but is never written to the OFX memory."""
    monkeypatch.setenv("BEA_ENGINE_PYTHON", beangulp_engine)
    monkeypatch.delenv("BEA_ENGINE_DIR", raising=False)
    typo = _import(books, str(books.parent / "checking.ofx"), "--account", "Assets:Savngs")
    assert typo.exit_code == 0, typo.stderr
    assert "Not remembering these settings: Assets:Savngs is not open in this ledger." in typo.stderr
    assert list(bea_config_dir.glob("importers/ofx-*.json")) == []
