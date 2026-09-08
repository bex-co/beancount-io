"""Example of the modern Beangulp importer interface, using only the standard library and Beancount.

Input columns: Date,Payee,Narration,Amount,Currency,Category,BankID.
Amount is signed from the checking account's perspective (purchases negative).
Use a bank-specific importer for the bank's native CSV/OFX/QIF format.
"""

import csv
import datetime
from decimal import Decimal

from beancount.core.amount import Amount
from beancount.core.data import Posting, Transaction, new_metadata


class CategorizedCSV:
    name = "categorized-checking"

    def identify(self, filepath):
        with open(filepath, encoding="utf-8-sig", newline="") as stream:
            return {"Date", "Payee", "Narration", "Amount", "Currency", "Category"}.issubset(
                csv.DictReader(stream).fieldnames or []
            )

    def account(self, filepath):
        return "Assets:Checking"

    def extract(self, filepath, existing):
        entries = []
        with open(filepath, encoding="utf-8-sig", newline="") as stream:
            for line, row in enumerate(csv.DictReader(stream), start=2):
                meta = new_metadata(filepath, line)
                if row.get("BankID"):
                    meta["bank_id"] = row["BankID"]
                number = Decimal(row["Amount"])
                entries.append(
                    Transaction(
                        meta,
                        datetime.date.fromisoformat(row["Date"]),
                        "*",
                        row["Payee"],
                        row["Narration"],
                        frozenset(),
                        frozenset(),
                        [
                            Posting(self.account(filepath), Amount(number, row["Currency"]), None, None, None, None),
                            Posting(row["Category"], Amount(-number, row["Currency"]), None, None, None, None),
                        ],
                    )
                )
        return entries


CONFIG = [CategorizedCSV()]
