"""Runnable original-format baseline, separate from agent-authored rehearsals."""

import csv
import hashlib
import unicodedata
from collections import Counter

from beangulp.importers import csvbase


class Importer(csvbase.Importer):
    """Extract the confirmed checking export's source leg and stable identity."""

    date = csvbase.Date("Date", "%m/%d/%Y")
    narration = csvbase.Column("Description")
    amount = csvbase.Amount("Amount")

    def identify(self, filepath):
        try:
            with open(filepath, encoding=self.encoding, newline="") as source:
                return next(csv.reader(source), None) == [
                    "Date",
                    "Description",
                    "Amount",
                ]
        except (OSError, UnicodeError, csv.Error):
            return False

    def extract(self, filepath, existing):
        entries = super().extract(filepath, existing)
        occurrences = Counter()
        for entry in entries:
            units = entry.postings[0].units
            number = format(units.number, "f")
            if "." in number:
                number = number.rstrip("0").rstrip(".")
            if units.number == 0:
                number = "0"
            description = unicodedata.normalize(
                "NFC", " ".join(entry.narration.upper().split())
            )
            account = unicodedata.normalize("NFC", self.importer_account)
            identity = (
                f"{entry.date.isoformat()}|{number} {units.currency}|"
                f"{description}|{account}"
            )
            occurrences[identity] += 1
            if occurrences[identity] > 1:
                identity += f"|{occurrences[identity]}"
            digest = hashlib.sha256(identity.encode("utf-8")).hexdigest()[:16]
            entry.meta["import-id"] = f"csv:sha256:{digest}"
        return entries


if __name__ == "__main__":
    from beangulp.testing import main

    main(Importer("Assets:Bank:Checking", "USD"))
