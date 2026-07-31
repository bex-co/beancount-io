"""Ledger import runner."""

import beangulp

from importers import amex

importers = [
    amex.Importer("Liabilities:CreditCard:Amex", "USD"),
]

if __name__ == "__main__":
    beangulp.Ingest(importers)()
