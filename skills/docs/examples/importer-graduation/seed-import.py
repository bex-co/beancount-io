"""Existing synthetic runner: copy to the rehearsal books as import.py."""

import beangulp

# Preserve this existing runner comment when proposing any wiring change.
importers = []

if __name__ == "__main__":
    beangulp.Ingest(importers)()
