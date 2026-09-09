"""Customer outcomes: onboarding, financial numbers, and usable CLI errors."""

import json
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()


@pytest.fixture
def book(tmp_path: Path) -> Path:
    result = runner.invoke(
        app,
        [
            "--json",
            "init",
            str(tmp_path / "books"),
            "--currency",
            "USD",
            "--date",
            "2026-08-01",
            "--opening-balance",
            "Assets:Checking 7000",
        ],
    )
    assert result.exit_code == 0, result.output
    file = tmp_path / "books/main.bean"
    with file.open("a") as stream:
        stream.write("""
2026-08-02 * "Income"
  Assets:Checking 6002 USD
  Income:Salary -6002 USD
2026-08-03 * "Spending"
  Expenses:Rent 2221.50 USD
  Assets:Checking -2221.50 USD
2026-09-02 * "Income"
  Assets:Checking 6000 USD
  Income:Salary -6000 USD
2026-09-03 * "Spending"
  Expenses:Rent 1800 USD
  Assets:Checking -1800 USD
""")
    return file


def run(file: Path, *args: str):
    return runner.invoke(app, ["--json", "--file", str(file), *args])


def report(file: Path, name: str, *args: str):
    result = run(file, "report", name, *args)
    assert result.exit_code == 0, result.output
    return json.loads(result.stdout)["data"]


def test_onboarding_never_overwrites_and_requires_currency_unattended(book: Path, tmp_path: Path) -> None:
    before = book.read_bytes()
    result = runner.invoke(app, ["--json", "init", str(book), "--currency", "EUR"])
    assert result.exit_code == 4
    assert book.read_bytes() == before
    result = runner.invoke(app, ["--no-input", "init", str(tmp_path / "new")])
    assert result.exit_code == 2
    assert "--currency" in result.stderr
    assert not (tmp_path / "new").exists()
    assert run(book, "check").exit_code == 0


def test_interactive_onboarding(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("cli.context._stdin_is_a_terminal", lambda: True)
    result = runner.invoke(app, ["init", str(tmp_path / "books"), "--date", "2026-08-01"], input="EUR\n123.45\n")
    assert result.exit_code == 0, result.output
    data = report(tmp_path / "books/main.bean", "balance-sheet")
    assert Decimal(data["net_worth"]["EUR"]) == Decimal("123.45")


def test_profit_sign_and_interval_breakdown(book: Path) -> None:
    data = report(book, "income-statement", "--time", "2026-08 - 2026-09")
    assert Decimal(data["net_profit"]["USD"]) == Decimal("7980.50")
    assert [Decimal(p["net_profit"]["USD"]) for p in data["periods"]] == [Decimal("3780.50"), Decimal("4200")]
    assert Decimal(data["income"]["balance_children"]["USD"]) == Decimal("-12002")
    assert data["period"] == {"start": "2026-08-01", "end_exclusive": "2026-10-01"}
    assert len(report(book, "income-statement", "--time", "2026", "--interval", "yearly")["periods"]) == 1
    text = runner.invoke(app, ["--file", str(book), "report", "income-statement", "--time", "2026-08"])
    assert "Net Profit: 3,780.50 USD" in text.stdout


def test_loss_and_expense_refund_have_correct_signs(book: Path) -> None:
    with book.open("a") as stream:
        stream.write("""
2026-10-02 * "Spending"
  Expenses:Rent 100 USD
  Assets:Checking -100 USD
2026-10-03 * "Refund"
  Expenses:Rent -20 USD
  Assets:Checking 20 USD
""")
    data = report(book, "income-statement", "--time", "2026-10")
    assert Decimal(data["net_profit"]["USD"]) == -80
    assert Decimal(data["expenses"]["balance_children"]["USD"]) == 80


@pytest.mark.parametrize(
    "month,worth,earnings", [("2026-08", "10780.50", "-3780.50"), ("2026-09", "14980.50", "-4200")]
)
def test_balance_sheet_reconciles_current_earnings(book: Path, month: str, worth: str, earnings: str) -> None:
    data = report(book, "balance-sheet", "--time", month)
    assert Decimal(data["net_worth"]["USD"]) == Decimal(worth)
    assert Decimal(data["current_earnings"]["USD"]) == Decimal(earnings)
    assert Decimal(data["equity_total"]["USD"]) == -Decimal(worth)
    assert all(Decimal(v) == 0 for v in data["valuation_adjustment"].values())


def test_operating_currency_and_unpriced_conversion(tmp_path: Path) -> None:
    file = tmp_path / "euro.bean"
    result = runner.invoke(
        app,
        [
            "--json",
            "init",
            str(file),
            "--currency",
            "EUR",
            "--date",
            "2026-08-01",
            "--opening-balance",
            "Assets:Checking 1000",
        ],
    )
    assert result.exit_code == 0
    assert report(file, "overview")["totals"]["net_worth"] == {"EUR": "1000"}
    missing = run(file, "report", "balance-sheet", "--conversion", "USD")
    assert missing.exit_code == 1
    assert "EUR" in missing.stderr
    partial = report(file, "balance-sheet", "--conversion", "USD", "--allow-errors")
    assert partial["net_worth"] == {"USD": None}
    assert partial["assets"]["balance_children"] == {"EUR": "1000"}
    assert partial["missing_prices"] == [{"from": "EUR", "to": "USD"}]
    assert partial["equity_total"] is None
    assert partial["valuation_adjustment"] is None
    file.write_text(file.read_text().replace('option "operating_currency" "EUR"', ""))
    assert report(file, "overview")["conversion"] == "units"


def test_investment_valuation_uses_report_date_and_separates_gains(tmp_path: Path) -> None:
    file = tmp_path / "lots.bean"
    file.write_text("""option "operating_currency" "USD"
2026-08-01 open Assets:Cash USD
2026-08-01 open Assets:Stock AAPL
2026-08-01 open Equity:Opening USD
2026-08-01 open Income:Gains USD
2026-08-01 price AAPL 100 USD
2026-08-01 * "Opening"
  Assets:Cash 2000 USD
  Equity:Opening -2000 USD
2026-08-02 * "Buy"
  Assets:Stock 10 AAPL {100 USD}
  Assets:Cash -1000 USD
2026-08-03 * "Sell"
  Assets:Stock -2 AAPL {100 USD} @ 120 USD
  Assets:Cash 240 USD
  Income:Gains -40 USD
2026-08-31 price AAPL 150 USD
2026-09-01 price AAPL 200 USD
""")
    data = report(file, "balance-sheet", "--time", "2026-08")
    assert Decimal(data["net_worth"]["USD"]) == 2440
    assert Decimal(data["current_earnings"]["USD"]) == -40
    assert Decimal(data["valuation_adjustment"]["USD"]) == -400
    assert Decimal(data["equity_total"]["USD"]) == -2440


@pytest.mark.parametrize(
    "args",
    [
        ["list", "transaction", "--limit", "0"],
        ["list", "transaction", "--from-date", "2026-09-01", "--to-date", "2026-08-01"],
        ["report", "overview", "--interval", "nope"],
        ["report", "overview", "--time", "2026-13"],
        ["report", "overview", "--time", "nope"],
        ["report", "overview", "--time", "2026-09 - 2026-07"],
    ],
)
def test_invalid_filters_are_usage_errors(book: Path, args: list[str]) -> None:
    result = run(book, *args)
    assert result.exit_code == 2, result.output
    assert json.loads(result.stderr)["error"]["category"] == "usage"


@pytest.mark.parametrize("args", [["--json", "bad-command"], ["--json", "--bogus", "check"], ["--json", "--file"]])
def test_early_usage_errors_are_json_in_a_fresh_process(args: list[str]) -> None:
    result = subprocess.run([sys.executable, "-m", "cli.main", *args], text=True, capture_output=True, timeout=10)
    assert result.returncode == 2
    assert result.stdout == ""
    assert json.loads(result.stderr)["error"]["category"] == "usage"


def test_format_handles_files_both_extensions_and_missing_targets(tmp_path: Path) -> None:
    for name in ("one.bean", "two.beancount"):
        (tmp_path / name).write_text('2026-08-01 * "Coffee"\n  Assets:Cash -1 USD\n  Expenses:Food 1 USD\n')
    first = runner.invoke(app, ["--json", "format", str(tmp_path / "one.bean")])
    assert first.exit_code == 0
    assert json.loads(first.stdout)["data"]["scanned"] == 1
    second = runner.invoke(app, ["--json", "format", str(tmp_path)])
    assert second.exit_code == 0
    assert json.loads(second.stdout)["data"]["scanned"] == 2
    missing = runner.invoke(app, ["--json", "format", str(tmp_path / "missing")])
    assert missing.exit_code == 2


def test_transaction_details_include_every_posting_and_source(book: Path) -> None:
    result = run(book, "list", "transaction", "--sort", "newest", "--limit", "1")
    data = json.loads(result.stdout)["data"]
    assert data[0]["date"] == "2026-09-03"
    assert len(data[0]["postings"]) == 2
    assert data[0]["source"]["filename"] == str(book)
    detail = runner.invoke(
        app, ["--file", str(book), "list", "transaction", "--sort", "newest", "--limit", "1", "--details"]
    )
    assert "Expenses:Rent" in detail.stdout and "Assets:Checking" in detail.stdout
    assert str(book) in detail.stdout


def test_interactive_query_rejects_invalid_ledger(book: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("cli.context._stdin_is_a_terminal", lambda: True)
    with book.open("a") as stream:
        stream.write('2026-09-04 * "Invalid"\n  Assets:Checking -1 USD\n')
    result = runner.invoke(app, ["--file", str(book), "query"])
    assert result.exit_code == 1
    assert "Ledger has" in result.stderr


@pytest.fixture
def tagged_book(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(
        'option "operating_currency" "USD"\n'
        "2026-01-01 open Assets:Cash USD\n"
        "2026-01-01 open Expenses:Food USD\n"
        "2026-01-01 open Expenses:Travel USD\n"
        "2026-01-01 open Equity:Opening-Balances USD\n"
        '2026-08-02 * "Whole Foods" "groceries" #food ^receipt-1\n'
        "  Expenses:Food  20.00 USD\n"
        "  Assets:Cash   -20.00 USD\n"
        '2026-08-03 * "Airline" "whole foods snack"\n'
        "  Expenses:Travel  15.00 USD\n"
        "  Assets:Cash     -15.00 USD\n"
    )
    return file


def tagged(file: Path, *args: str):
    return runner.invoke(app, ["--file", str(file), "list", "transaction", *args])


class TestTransactionSearchFilters:
    def test_search_matches_payee_and_narration(self, tagged_book: Path) -> None:
        result = tagged(tagged_book, "--search", "whole foods")

        assert result.exit_code == 0, result.output
        assert "Whole Foods" in result.stdout
        assert "whole foods snack" in result.stdout

    @pytest.mark.parametrize("flag", ["--tag", "--link"])
    def test_sigils_are_optional(self, tagged_book: Path, flag: str) -> None:
        sigil = "#" if flag == "--tag" else "^"
        value = "food" if flag == "--tag" else "receipt-1"

        assert tagged(tagged_book, flag, value).stdout == tagged(tagged_book, flag, f"{sigil}{value}").stdout

    def test_filters_compose_with_account_and_dates(self, tagged_book: Path) -> None:
        result = tagged(tagged_book, "--search", "whole foods", "--account", "Travel", "--from-date", "2026-08-01")

        assert result.exit_code == 0, result.output
        assert "Airline" in result.stdout
        assert "Whole Foods" not in result.stdout

    def test_json_envelope_is_unchanged(self, tagged_book: Path) -> None:
        result = runner.invoke(
            app, ["--json", "--file", str(tagged_book), "list", "transaction", "--search", "whole foods"]
        )

        assert result.exit_code == 0, result.output
        data = json.loads(result.stdout)["data"]
        assert {item["payee"] for item in data} == {"Whole Foods", "Airline"}


class TestBalanceCommand:
    def test_pruned_tree_shows_matching_subtree(self, book: Path) -> None:
        result = runner.invoke(app, ["--file", str(book), "balance", "Checking"])

        assert result.exit_code == 0, result.output
        assert "Checking" in result.stdout
        assert "Rent" not in result.stdout

    def test_filtered_views_exclude_closed_accounts(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        file.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Assets:Cash USD\n"
            "2026-01-01 open Assets:Old USD\n"
            "2026-06-01 close Assets:Old\n"
        )
        result = runner.invoke(app, ["--file", str(file), "balance", "Assets"])

        assert result.exit_code == 0, result.output
        assert "Cash" in result.stdout
        assert "Old" not in result.stdout

    def test_no_filter_matches_trial_balance(self, book: Path) -> None:
        balance = runner.invoke(app, ["--file", str(book), "balance"])
        trial = runner.invoke(app, ["--file", str(book), "report", "trial-balance"])

        assert balance.exit_code == 0, balance.output
        assert balance.stdout == trial.stdout

    def test_json_tree_shape_matches_trial_balance(self, book: Path) -> None:
        balance = json.loads(run(book, "balance", "Checking").stdout)["data"]
        trial = json.loads(run(book, "report", "trial-balance").stdout)["data"]

        assert set(balance) == set(trial)
        assert balance["assets"]["account"] == "Assets"
        assert balance["assets"]["children"][0]["account"] == "Assets:Checking"


class TestPositionalNarration:
    def test_positional_narration_is_written(self, book: Path) -> None:
        result = runner.invoke(
            app,
            [
                "--file",
                str(book),
                "add",
                "transaction",
                "Coffee",
                "-p",
                "Expenses:Rent 12.50",
                "-p",
                "Assets:Checking",
            ],
        )

        assert result.exit_code == 0, result.output
        assert '* "Coffee"' in book.read_text()

    def test_conflicting_narrations_exit_2(self, book: Path) -> None:
        result = runner.invoke(
            app,
            [
                "--file",
                str(book),
                "add",
                "transaction",
                "Coffee",
                "--narration",
                "Tea",
                "-p",
                "Expenses:Rent 12.50",
                "-p",
                "Assets:Checking",
            ],
        )

        assert result.exit_code == 2
        assert "positional" in result.stderr and "--narration" in result.stderr

    def test_json_directive_carries_the_positional_value(self, book: Path) -> None:
        result = runner.invoke(
            app,
            [
                "--json",
                "--file",
                str(book),
                "add",
                "transaction",
                "Tea",
                "-p",
                "Expenses:Rent 5",
                "-p",
                "Assets:Checking",
            ],
        )

        assert result.exit_code == 0, result.output
        assert json.loads(result.stdout)["data"]["directive"]["narration"] == "Tea"


class TestDailyFixes:
    def test_format_honors_the_global_file(self, book: Path, tmp_path: Path) -> None:
        other = tmp_path / "other.bean"
        other.write_text('2026-08-01 *  "X"\n  Assets:Cash             1.00 USD\n')

        result = runner.invoke(app, ["--file", str(book), "format"])

        assert result.exit_code == 0, result.output
        assert "main.bean" in result.stdout
        assert other.read_text().startswith("2026-08-01 *  ")

    def test_bulk_add_reads_stdin(self, book: Path) -> None:
        payload = json.dumps(
            [
                {
                    "date": "2026-08-04",
                    "narration": "Stdin",
                    "postings": [{"account": "Expenses:Rent", "amount": "5 USD"}, {"account": "Assets:Checking"}],
                }
            ]
        )
        result = runner.invoke(app, ["--file", str(book), "add", "transactions", "--from", "-"], input=payload)

        assert result.exit_code == 0, result.output
        assert "Stdin" in book.read_text()

    def test_bulk_rejection_uses_the_singular(self, book: Path) -> None:
        payload = json.dumps([{"date": "not-a-date", "postings": []}])
        result = runner.invoke(
            app, ["--file", str(book), "add", "transactions", "--from", "-", "--partial"], input=payload
        )

        assert result.exit_code == 1
        assert "1 row was rejected" in result.stderr

    def test_init_next_uses_an_absolute_path(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.chdir(tmp_path)
        target = tmp_path / "far" / "books"
        result = runner.invoke(app, ["--no-input", "init", str(target), "--currency", "USD", "--date", "2026-08-01"])

        assert result.exit_code == 0, result.output
        assert f"cd {target} && bea check" in result.output
