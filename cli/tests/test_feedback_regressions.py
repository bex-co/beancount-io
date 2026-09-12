"""Exercise the reported customer failures with actual ledgers and CLI commands."""

import datetime
import io
import json
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace

import pytest
from beancount import loader
from beancount.core.data import Transaction
from typer.testing import CliRunner

from bea_engine.ledger import write as ledger_write
from bea_engine.protocol import ConflictError
from bea_engine.query import build_shell
from cli.ask.agent import BqlDeps, WritePermission, make_agent
from cli.main import app

runner = CliRunner()
ACCOUNTS = """2020-01-01 open Assets:Checking USD
2020-01-01 open Expenses:Groceries USD
2020-01-01 open Expenses:Fees USD
2020-01-01 open Income:Salary USD
2020-01-01 open Equity:OpeningBalances USD
2020-01-01 open Assets:Stock AAPL
"""
POSTINGS = ["-p", "Assets:Checking -30 USD", "-p", "Expenses:Groceries"]


def run(file: Path, *args: str):
    return runner.invoke(app, ["--json", "-f", str(file), *args])


def transactions(file: Path):
    entries, errors, _ = loader.load_file(file)
    assert not errors
    return [entry for entry in entries if isinstance(entry, Transaction)]


@pytest.fixture
def book(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text('option "operating_currency" "USD"\n' + ACCOUNTS)
    return file


@pytest.fixture
def split(book: Path) -> tuple[Path, Path]:
    parts = book.parent / "parts"
    parts.mkdir()
    (parts / "accounts.bean").write_text(ACCOUNTS)
    target = parts / "2026.bean"
    target.write_text("")
    book.write_text('option "operating_currency" "USD"\ninclude "parts/*.bean"\n')
    return book, target


def test_precision_matches_json_in_cli_interactive_query_and_ask(book: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    with book.open("a") as stream:
        for _ in range(5):
            stream.write('2026-01-01 * "Whole"\n  Assets:Checking -1 USD\n  Expenses:Fees 1 USD\n')
        stream.write('2026-01-02 * "Cents"\n  Assets:Checking -82.35 USD\n  Expenses:Groceries 82.35 USD\n')
    query = "SELECT account, sum(position) WHERE account ~ 'Expenses' GROUP BY account"
    result = runner.invoke(app, ["-f", str(book), "query", query])
    assert result.exit_code == 0, result.output
    assert "82.35 USD" in result.stdout
    data = json.loads(run(book, "query", query).stdout)["data"]
    assert any(row[1][0]["units"]["number"] == "82.35" for row in data["rows"])

    monkeypatch.setattr("beanquery.shell.readline", None)
    monkeypatch.setattr("beanquery.shell.INIT_FILENAME", str(book.parent / "no-init"))
    stream = io.StringIO()
    build_shell(book, stream).onecmd(query)
    assert "82.35 USD" in stream.getvalue()

    agent = make_agent("gpt-4o", "http://unused", "test")
    tool = agent._function_toolset.tools["run_bql_query"].function
    assert "82.35 USD" in tool(SimpleNamespace(deps=BqlDeps(file=book)), query)


def test_derived_currency_amount_retains_more_digits_than_inputs(book: Path) -> None:
    with book.open("a") as stream:
        stream.write("""2020-01-01 open Assets:Crypto BTC
2020-01-01 open Equity:Crypto BTC
2026-01-01 * "Crypto"
  Assets:Crypto 0.12345678 BTC
  Equity:Crypto -0.12345678 BTC
2026-01-02 price BTC 12.34 USD
""")
    query = "SELECT convert(sum(position), 'USD') WHERE account = 'Assets:Crypto'"
    expected = str(Decimal("0.12345678") * Decimal("12.34"))
    result = runner.invoke(app, ["-f", str(book), "query", query])
    assert result.exit_code == 0, result.output
    assert expected + " USD" in result.stdout


def test_query_preserves_large_balances_and_fractional_units(book: Path) -> None:
    with book.open("a") as stream:
        stream.write(
            '2026-01-01 * "Large"\n'
            "  Assets:Checking 12345678901234567890.12345 USD\n"
            "  Equity:OpeningBalances -12345678901234567890.12345 USD\n"
        )
    query = "SELECT sum(position) WHERE account = 'Assets:Checking'"
    result = runner.invoke(app, ["-f", str(book), "query", query])
    assert result.exit_code == 0, result.output
    assert "12345678901234567890.12345 USD" in result.stdout


def test_quick_capture_infers_date_currency_and_balancing_amount(book: Path) -> None:
    result = run(book, "add", "transaction", "-p", "Expenses:Groceries 30", "-p", "Assets:Checking")
    assert result.exit_code == 0, result.output
    entry = transactions(book)[0]
    assert entry.date == datetime.date.today()
    assert [(p.units.number, p.units.currency) for p in entry.postings] == [(Decimal(30), "USD"), (Decimal(-30), "USD")]


def test_single_add_json_can_be_reused_as_bulk_input(book: Path) -> None:
    result = run(book, "add", "transaction", *POSTINGS)
    assert result.exit_code == 0, result.output
    payload = book.parent / "repeat.json"
    payload.write_text(json.dumps([json.loads(result.stdout)["data"]["directive"]]))
    result = run(book, "add", "transactions", "--from", str(payload))
    assert result.exit_code == 0, result.output
    assert len(transactions(book)) == 2


@pytest.mark.parametrize("stock", ["Assets:Stock 2 AAPL {100 USD}", "Assets:Stock 2 AAPL {{200 USD}}"])
def test_native_cost_syntax_books_real_lots(book: Path, stock: str) -> None:
    result = run(book, "add", "transaction", "--date", "2026-01-01", "-p", stock, "-p", "Assets:Checking -200 USD")
    assert result.exit_code == 0, result.output
    assert transactions(book)[0].postings[0].cost.number == Decimal(100)


@pytest.mark.parametrize("price", ["@ 100 USD", "@@ 200 USD"])
def test_native_price_syntax_balances_at_the_annotated_price(book: Path, price: str) -> None:
    result = run(book, "add", "transaction", "-p", f"Assets:Stock 2 AAPL {price}", "-p", "Assets:Checking -200 USD")
    assert result.exit_code == 0, result.output
    assert transactions(book)[0].postings[0].price.number == Decimal(100)


def test_ambiguous_currency_and_multiple_elisions_do_not_write(book: Path) -> None:
    book.write_text(
        book.read_text()
        .replace(
            'option "operating_currency" "USD"', 'option "operating_currency" "USD"\noption "operating_currency" "EUR"'
        )
        .replace("open Assets:Checking USD", "open Assets:Checking")
    )
    before = book.read_bytes()
    result = run(book, "add", "transaction", "-p", "Assets:Checking -30", "-p", "Expenses:Groceries")
    assert result.exit_code == 2 and "ambiguous" in result.stderr
    result = run(book, "add", "transaction", "-p", "Assets:Checking", "-p", "Expenses:Groceries")
    assert result.exit_code == 2
    assert book.read_bytes() == before


@pytest.mark.parametrize("allowed,code", [("USD, EUR", 0), ("EUR, GBP", 2)])
def test_operating_currency_inference_respects_account_constraints(book: Path, allowed: str, code: int) -> None:
    book.write_text(book.read_text().replace("open Assets:Checking USD", f"open Assets:Checking {allowed}"))
    before = book.read_bytes()
    result = run(book, "add", "transaction", "-p", "Assets:Checking -30", "-p", "Expenses:Groceries")
    assert result.exit_code == code, result.output
    if code:
        assert book.read_bytes() == before
    else:
        assert transactions(book)[0].postings[0].units.currency == "USD"


def test_split_ledger_destination_validates_the_root_and_preserves_other_files(split: tuple[Path, Path]) -> None:
    root, target = split
    receipt = target.parent / "receipt.pdf"
    receipt.write_bytes(b"receipt")
    target.write_text('2026-01-01 document Assets:Checking "receipt.pdf"\n')
    before = {p: p.read_bytes() for p in (root, target.parent / "accounts.bean")}
    result = run(root, "add", "transaction", "--into", "parts/2026.bean", "--date", "2026-01-02", *POSTINGS)
    assert result.exit_code == 0, result.output
    assert len(transactions(root)) == 1
    assert all(p.read_bytes() == content for p, content in before.items())
    assert "Groceries" in target.read_text()
    before_target = target.read_bytes()
    result = run(
        root,
        "add",
        "transaction",
        "--into",
        "parts/2026.bean",
        "-p",
        "Assets:Checking -30 USD",
        "-p",
        "Expenses:Groceries 20 USD",
    )
    assert result.exit_code == 1
    assert target.read_bytes() == before_target
    assert not list(root.parent.rglob(".bea-*.tmp"))


def test_unincluded_destination_is_rejected(book: Path) -> None:
    outside = book.parent / "unrelated.bean"
    outside.write_text("")
    result = run(book, "add", "transaction", "--into", "unrelated.bean", *POSTINGS)
    assert result.exit_code == 2 and "not included" in result.stderr
    assert outside.read_text() == ""


@pytest.mark.parametrize("change", ["edit", "new_include", "delete"])
def test_included_file_changes_during_validation_abort_the_write(
    split: tuple[Path, Path], monkeypatch: pytest.MonkeyPatch, change: str
) -> None:
    root, target = split
    original = target.read_bytes()
    validate = ledger_write.validate_candidate
    accounts = target.parent / "accounts.bean"

    def changed(*args, **kwargs):
        warnings = validate(*args, **kwargs)
        if change == "edit":
            accounts.write_text(accounts.read_text() + "; external edit\n")
        elif change == "new_include":
            (target.parent / "new.bean").write_text("; newly included\n")
        else:
            accounts.unlink()
        return warnings

    monkeypatch.setattr(ledger_write, "validate_candidate", changed)
    with pytest.raises(ConflictError):
        ledger_write.append(root, ['2026-01-01 event "test" "value"'], into=target)
    assert target.read_bytes() == original


def test_bulk_shorthand_and_elision_work_in_an_included_file(split: tuple[Path, Path]) -> None:
    root, target = split
    payload = root.parent / "rows.json"
    payload.write_text(
        json.dumps(
            [
                {
                    "date": "2026-01-01",
                    "postings": [
                        {"account": "Assets:Checking", "amount": "-30 USD"},
                        {"account": "Expenses:Groceries"},
                    ],
                }
            ]
        )
    )
    result = run(root, "add", "transactions", "--from", str(payload), "--into", "parts/2026.bean")
    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["target"]["into"] == str(target)
    assert transactions(root)[0].postings[1].units.number == Decimal(30)


def test_pad_and_balance_are_written_together_and_ordinary_assertions_stay_strict(book: Path) -> None:
    before = book.read_bytes()
    args = ["add", "balance", "--date", "2026-01-02", "-a", "Assets:Checking", "--amount", "100 USD"]
    assert run(book, *args).exit_code == 1
    assert book.read_bytes() == before
    result = run(book, *args, "--pad-from", "Equity:OpeningBalances")
    assert result.exit_code == 0, result.output
    assert transactions(book)[0].postings[0].units.number == Decimal(100)
    saved = book.read_bytes()
    assert run(book, *args, "--pad-from", "Equity:OpeningBalances", "--pad-date", "2026-01-02").exit_code == 2
    assert book.read_bytes() == saved


def test_formatting_is_idempotent_after_a_write(book: Path) -> None:
    assert runner.invoke(app, ["format", str(book)]).exit_code == 0
    assert run(book, "add", "transaction", *POSTINGS).exit_code == 0
    result = runner.invoke(app, ["--json", "format", str(book), "--dry-run"])
    assert json.loads(result.stdout)["data"]["formatted"] == []


def test_income_signs_match_between_summary_and_periods(book: Path) -> None:
    result = run(
        book, "add", "transaction", "--date", "2026-01-02", "-p", "Income:Salary -1000 USD", "-p", "Assets:Checking"
    )
    assert result.exit_code == 0, result.output
    result = run(book, "report", "income-statement", "--time", "2026-01")
    data = json.loads(result.stdout)["data"]
    assert data["income"]["balance_children"] == data["periods"][0]["income"] == {"USD": "-1000"}
    assert data["periods"][0]["net_profit"] == {"USD": "1000"}


def test_ask_writes_are_validated_and_detect_edits_while_confirming(book: Path) -> None:
    agent = make_agent("gpt-4o", "http://unused", "test")
    write = agent._function_toolset.tools["write_directive"].function
    deps = BqlDeps(file=book, write_permission=WritePermission(approve_all=True))
    ctx = SimpleNamespace(deps=deps)
    before = book.read_bytes()
    invalid = '2026-01-02 * "Bad"\n  Assets:Checking -30 USD\n  Expenses:Groceries 20 USD\n'
    assert "rejected" in write(ctx, invalid)
    assert book.read_bytes() == before
    valid = invalid.replace("20 USD", "30 USD")
    assert "Added" in write(ctx, valid)
    assert len(transactions(book)) == 1
    before = book.read_bytes()

    def confirm(_):
        book.write_bytes(before + b"; external edit\n")
        return "y"

    deps.write_permission = WritePermission(confirm_fn=confirm)
    assert "changed" in write(ctx, valid)
    assert book.read_bytes() == before + b"; external edit\n"
    assert "rejected" in write(ctx, 'plugin "untrusted_plugin"')


def test_a_malformed_query_points_at_the_token_it_choked_on(book: Path) -> None:
    """Beanquery answers 'syntax error' and an offset; on its own that names no token."""
    result = runner.invoke(app, ["-f", str(book), "query", "SELECT account, FROM"])
    assert result.exit_code == 2, result.output
    assert "SELECT account, FROM" in result.stderr
    assert "^" in result.stderr
    assert ".tables" in result.stderr


def test_an_unknown_column_suggests_the_ones_the_table_has(book: Path) -> None:
    result = runner.invoke(app, ["-f", str(book), "query", "SELECT accont FROM #postings"])
    assert result.exit_code == 2, result.output
    assert "Did you mean account" in result.stderr


def test_a_query_error_is_reported_as_json_when_json_was_asked_for(book: Path) -> None:
    error = json.loads(run(book, "query", "SELCT foo").stderr)["error"]
    assert error["category"] == "usage" and error["exit_code"] == 2
    assert "syntax error" in error["message"]


@pytest.mark.parametrize("suffix", ["#target.bean", "?target.bean"])
def test_query_loads_the_exact_file_when_its_name_has_url_characters(
    tmp_path: Path, suffix: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """`beancount:<path>` is urlparse()d by beanquery; `#`/`?` must not swap the ledger."""
    ledger = (
        "2026-01-01 open Assets:Cash USD\n"
        "2026-01-01 open Equity:Opening USD\n"
        '2026-02-01 * "QA"\n  Assets:Cash {n} USD\n  Equity:Opening -{n} USD\n'
    )
    decoy = tmp_path / "main.bean"
    decoy.write_text(ledger.format(n=999))
    target = tmp_path / f"main.bean{suffix}"
    target.write_text(ledger.format(n=10))
    query = "SELECT sum(position) WHERE account = 'Assets:Cash'"

    result = run(target, "query", query)
    assert result.exit_code == 0, result.output
    envelope = json.loads(result.stdout)
    assert envelope["target"] == {"file": str(target)}
    assert envelope["data"]["rows"][0][0][0]["units"]["number"] == "10"

    monkeypatch.setattr("beanquery.shell.readline", None)
    monkeypatch.setattr("beanquery.shell.INIT_FILENAME", str(tmp_path / "no-init"))
    stream = io.StringIO()
    build_shell(target, stream).onecmd(query)
    assert "10 USD" in stream.getvalue() and "999" not in stream.getvalue()

    agent = make_agent("gpt-4o", "http://unused", "test")
    tool = agent._function_toolset.tools["run_bql_query"].function
    assert "10 USD" in tool(SimpleNamespace(deps=BqlDeps(file=target)), query)


def test_query_honors_relative_includes_from_a_url_character_filename(tmp_path: Path) -> None:
    (tmp_path / "accounts.bean").write_text("2026-01-01 open Assets:Cash USD\n2026-01-01 open Equity:Opening USD\n")
    target = tmp_path / "books#2026.bean"
    target.write_text('include "accounts.bean"\n2026-02-01 * "QA"\n  Assets:Cash 10 USD\n  Equity:Opening -10 USD\n')

    result = run(target, "query", "SELECT sum(position) WHERE account = 'Assets:Cash'")

    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"]["rows"][0][0][0]["units"]["number"] == "10"


def test_query_still_fails_a_missing_file_with_url_characters(tmp_path: Path) -> None:
    result = run(tmp_path / "missing#x.bean", "query", "SELECT 1")

    assert result.exit_code == 2
    assert "missing#x.bean" in result.stderr


def test_query_json_keeps_both_lots_of_an_inventory(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    file.write_text(
        "2026-01-01 open Assets:Stock AAPL\n2026-01-01 open Assets:Cash USD\n"
        '2026-02-01 * "First"\n  Assets:Stock 1 AAPL {100 USD, "first"}\n  Assets:Cash -100 USD\n'
        '2026-02-02 * "Second"\n  Assets:Stock 1 AAPL {100 USD, "second"}\n  Assets:Cash -100 USD\n'
    )

    result = run(file, "query", "SELECT sum(position) WHERE account = 'Assets:Stock'")

    assert result.exit_code == 0, result.output
    [[lots]] = json.loads(result.stdout)["data"]["rows"]
    assert sorted((lot["cost"]["date"], lot["cost"]["label"]) for lot in lots) == [
        ("2026-02-01", "first"),
        ("2026-02-02", "second"),
    ]
