"""Tests for directive writer module."""

import datetime
from decimal import Decimal
from pathlib import Path

import pytest

from cli.directives import writer
from cli.directives.models import (
    Amount,
    BalanceDirective,
    CloseDirective,
    CommodityDirective,
    CustomDirective,
    CustomDirectiveValueAccount,
    CustomDirectiveValueAmount,
    CustomDirectiveValueNumber,
    CustomDirectiveValueText,
    DocumentDirective,
    EventDirective,
    NoteDirective,
    OpenDirective,
    PadDirective,
    Posting,
    PriceDirective,
    TransactionDirective,
)


def _read(file: Path) -> str:
    return file.read_text().strip()


@pytest.fixture
def tmp_bean_file(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(
        "2020-01-01 open Assets:Cash USD\n"
        "2020-01-01 open Assets:OldAccount USD\n"
        "2020-01-01 open Expenses:Food USD\n"
        "2020-01-01 open Equity:Opening USD\n"
        '2020-01-01 * "Opening"\n  Assets:Cash 1000 USD\n  Equity:Opening -1000 USD\n'
    )
    return file


class TestWriteTransaction:
    def test_basic(self, tmp_bean_file: Path) -> None:
        writer.write_transaction(
            tmp_bean_file,
            TransactionDirective(
                date=datetime.date(2026, 4, 30),
                narration="Coffee",
                postings=[
                    Posting(account="Expenses:Food", units=Amount(number=Decimal("12.50"), currency="USD")),
                    Posting(account="Assets:Cash", units=Amount(number=Decimal("-12.50"), currency="USD")),
                ],
            ),
        )
        content = _read(tmp_bean_file)
        assert "2026-04-30 *" in content
        assert '"Coffee"' in content
        assert "Expenses:Food" in content
        assert "12.50 USD" in content

    def test_with_payee_and_tags(self, tmp_bean_file: Path) -> None:
        writer.write_transaction(
            tmp_bean_file,
            TransactionDirective(
                date=datetime.date(2026, 1, 1),
                flag="!",
                payee="Cafe",
                narration="Lunch",
                tags=["travel"],
                links=["^ref-001"],
                postings=[
                    Posting(account="Expenses:Food", units=Amount(number=Decimal("10"), currency="USD")),
                    Posting(account="Assets:Cash", units=Amount(number=Decimal("-10"), currency="USD")),
                ],
            ),
        )
        content = _read(tmp_bean_file)
        assert '2026-01-01 ! "Cafe"' in content
        assert "#travel" in content
        assert "^ref-001" in content

    def test_multiple_appended(self, tmp_bean_file: Path) -> None:
        for i in range(3):
            writer.write_transaction(
                tmp_bean_file,
                TransactionDirective(
                    date=datetime.date(2026, 1, i + 1),
                    narration=f"Entry {i}",
                    postings=[
                        Posting(account="Expenses:Food", units=Amount(number=Decimal("1"), currency="USD")),
                        Posting(account="Assets:Cash", units=Amount(number=Decimal("-1"), currency="USD")),
                    ],
                ),
            )
        content = _read(tmp_bean_file)
        assert content.count("2026-01-") == 3


class TestWriteOpen:
    def test_with_currencies(self, tmp_bean_file: Path) -> None:
        tmp_bean_file.write_text("")
        writer.write_open(
            tmp_bean_file,
            OpenDirective(
                date=datetime.date(2026, 1, 1),
                account="Assets:Cash",
                currencies=["USD", "EUR"],
            ),
        )
        content = _read(tmp_bean_file)
        assert "2026-01-01 open Assets:Cash" in content
        assert "USD" in content

    def test_without_currencies(self, tmp_bean_file: Path) -> None:
        tmp_bean_file.write_text("")
        writer.write_open(
            tmp_bean_file,
            OpenDirective(
                date=datetime.date(2026, 1, 1),
                account="Assets:Cash",
            ),
        )
        content = _read(tmp_bean_file)
        assert "open Assets:Cash" in content


class TestWriteClose:
    def test_basic(self, tmp_bean_file: Path) -> None:
        writer.write_close(
            tmp_bean_file,
            CloseDirective(
                date=datetime.date(2026, 12, 31),
                account="Assets:OldAccount",
            ),
        )
        assert "2026-12-31 close Assets:OldAccount" in _read(tmp_bean_file)


class TestWriteBalance:
    def test_basic(self, tmp_bean_file: Path) -> None:
        writer.write_balance(
            tmp_bean_file,
            BalanceDirective(
                date=datetime.date(2026, 4, 30),
                account="Assets:Cash",
                amount=Amount(number=Decimal("1000.00"), currency="USD"),
            ),
        )
        content = _read(tmp_bean_file)
        assert "2026-04-30 balance Assets:Cash" in content
        assert "1000.00 USD" in content


class TestWritePad:
    def test_basic(self, tmp_bean_file: Path) -> None:
        with tmp_bean_file.open("a") as stream:
            stream.write("2026-01-02 balance Assets:Cash 2000 USD\n")
        writer.write_pad(
            tmp_bean_file,
            PadDirective(
                date=datetime.date(2026, 1, 1),
                account="Assets:Cash",
                source_account="Equity:Opening",
            ),
        )
        assert "2026-01-01 pad Assets:Cash Equity:Opening" in _read(tmp_bean_file)


class TestWriteNote:
    def test_basic(self, tmp_bean_file: Path) -> None:
        writer.write_note(
            tmp_bean_file,
            NoteDirective(
                date=datetime.date(2026, 4, 30),
                account="Assets:Cash",
                comment="ATM cash",
            ),
        )
        content = _read(tmp_bean_file)
        assert "2026-04-30 note Assets:Cash" in content
        assert '"ATM cash"' in content


class TestWriteEvent:
    def test_basic(self, tmp_bean_file: Path) -> None:
        writer.write_event(
            tmp_bean_file,
            EventDirective(
                date=datetime.date(2026, 4, 30),
                type="location",
                description="New York",
            ),
        )
        content = _read(tmp_bean_file)
        assert '2026-04-30 event "location"' in content
        assert '"New York"' in content


class TestWritePrice:
    def test_basic(self, tmp_bean_file: Path) -> None:
        writer.write_price(
            tmp_bean_file,
            PriceDirective(
                date=datetime.date(2026, 4, 30),
                currency="BTC",
                amount=Amount(number=Decimal("60000"), currency="USD"),
            ),
        )
        content = _read(tmp_bean_file)
        assert "2026-04-30 price BTC" in content
        assert "60000 USD" in content


class TestWriteCommodity:
    def test_basic(self, tmp_bean_file: Path) -> None:
        writer.write_commodity(
            tmp_bean_file,
            CommodityDirective(
                date=datetime.date(2026, 1, 1),
                currency="VFINX",
            ),
        )
        assert "2026-01-01 commodity VFINX" in _read(tmp_bean_file)


class TestWriteDocument:
    def test_basic(self, tmp_bean_file: Path) -> None:
        (tmp_bean_file.parent / "receipts").mkdir()
        (tmp_bean_file.parent / "receipts/april.pdf").write_bytes(b"receipt")
        writer.write_document(
            tmp_bean_file,
            DocumentDirective(
                date=datetime.date(2026, 4, 30),
                account="Assets:Cash",
                filename="receipts/april.pdf",
            ),
        )
        content = _read(tmp_bean_file)
        assert "2026-04-30 document Assets:Cash" in content
        assert '"receipts/april.pdf"' in content


class TestWriteCustom:
    def test_various_value_types(self, tmp_bean_file: Path) -> None:
        writer.write_custom(
            tmp_bean_file,
            CustomDirective(
                date=datetime.date(2026, 4, 30),
                type="budget",
                values=[
                    CustomDirectiveValueText(kind="text", value="travel"),
                    CustomDirectiveValueNumber(kind="number", value=Decimal("1000")),
                    CustomDirectiveValueAmount(kind="amount", number=Decimal("500"), currency="USD"),
                    CustomDirectiveValueAccount(kind="account", value="Assets:Cash"),
                ],
            ),
        )
        content = _read(tmp_bean_file)
        assert '2026-04-30 custom "budget"' in content
        assert '"travel"' in content
        assert "1000" in content
        assert "500 USD" in content
        assert "Assets:Cash" in content


class TestCostLabelEscaping:
    """Lot labels are quoted by the upstream printer but never escaped."""

    @staticmethod
    def _stock_book(tmp_path: Path) -> Path:
        file = tmp_path / "main.bean"
        file.write_text("2026-01-01 open Assets:Stock AAPL\n2026-01-01 open Assets:Cash USD\n")
        return file

    @pytest.mark.parametrize("label", ["lot\\A", 'say "hi"', "lot-one", "back\\\\slash"])
    def test_label_survives_a_write_and_reload(self, tmp_path: Path, label: str) -> None:
        from beancount import loader
        from beancount.core.data import Transaction

        from cli.directives.models import Cost

        file = self._stock_book(tmp_path)
        directive = TransactionDirective(
            date=datetime.date(2026, 2, 1),
            narration="Buy",
            postings=[
                Posting(
                    account="Assets:Stock",
                    units=Amount(number=Decimal("1"), currency="AAPL"),
                    cost=Cost(number=Decimal("100"), currency="USD", label=label),
                ),
                Posting(account="Assets:Cash", units=Amount(number=Decimal("-100"), currency="USD")),
            ],
        )
        writer.write_transaction(file, directive)

        assert directive.postings[0].cost is not None and directive.postings[0].cost.label == label
        entries, errors, _ = loader.load_file(str(file))
        assert not errors, errors
        [txn] = [e for e in entries if isinstance(e, Transaction)]
        assert txn.postings[0].cost.label == label

    def test_a_native_label_is_not_double_escaped(self, tmp_path: Path) -> None:
        """`add transaction -p` parses native syntax first; the parsed label must be escaped once."""
        from typer.testing import CliRunner

        from cli.main import app

        file = self._stock_book(tmp_path)
        result = CliRunner().invoke(
            app,
            [
                "--file",
                str(file),
                "add",
                "transaction",
                "Buy",
                "--date",
                "2026-02-01",
                "-p",
                'Assets:Stock 1 AAPL {100 USD, "lot\\\\A"}',
                "-p",
                "Assets:Cash -100 USD",
            ],
        )
        assert result.exit_code == 0, result.output
        assert '"lot\\\\A"' in file.read_text()
        listing = CliRunner().invoke(app, ["--json", "--file", str(file), "list", "transaction"])
        assert '"label": "lot\\\\A"' in listing.stdout
