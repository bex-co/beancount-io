"""Chase checking CSV importer (format generation 1: Date,Description,Amount)."""

from beangulp.importers import csvbase


class Importer(csvbase.Importer):
    date = csvbase.Date("Date", "%m/%d/%Y")
    narration = csvbase.Column("Description")
    amount = csvbase.Amount("Amount")

    def identify(self, filepath):
        try:
            with open(filepath) as f:
                return f.readline().strip() == "Date,Description,Amount"
        except (UnicodeDecodeError, OSError):
            return False


if __name__ == "__main__":
    from beangulp.testing import main

    main(Importer("Assets:Bank:Checking", "USD"))
