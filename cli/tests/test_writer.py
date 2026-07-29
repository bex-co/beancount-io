"""Tests for directive writer module."""

import datetime
from decimal import Decimal
from pathlib import Path

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
