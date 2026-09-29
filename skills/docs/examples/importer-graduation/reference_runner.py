"""Run the supplied baseline; this is not the user's existing import.py."""

import beangulp

from reference_importer import Importer

importers = [Importer("Assets:Bank:Checking", "USD")]

if __name__ == "__main__":
    beangulp.Ingest(importers)()
