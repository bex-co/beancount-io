#!/usr/bin/env python3
"""Capture stock beanquery results for the BQL oracle corpus.

Runs every query in ``queries.json`` through stock beanquery against the
checked-in fixture ledgers and writes ``bql-oracle.json``. The ledger engine's
``yarn verify:rustledger`` replays the same queries and diffs against it.

Offline by design: stock beanquery reads a local ledger loaded by
``beancount.loader`` and has no data source of its own. Fixtures must carry
literal ``price`` directives and never ``include`` a remote URL.

Usage (from ``backend-cluster/ledger``, with beanquery 0.2.0 installed, for
example ``cli/.venv/bin/python``)::

    python scripts/bql-oracle/generate-bql-oracle.py

The output is deterministic: sorted keys, no timestamps, no absolute paths.
"""

from __future__ import annotations

import argparse
import datetime
import decimal
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
DEFAULT_QUERIES = HERE / "queries.json"
DEFAULT_FIXTURES = HERE / "fixtures"
DEFAULT_OUTPUT = HERE / "bql-oracle.json"

FORMAT_VERSION = 1
ENGINE_BEANQUERY = "0.2.0"

# Error categories: the stock exception class, not its message (messages carry
# positions and wording that the engine does not and need not reproduce).
ERROR_CATEGORIES = {
    "ParseError": "parse",
    "CompilationError": "compile",
    "ProgrammingError": "programming",
    "DatabaseError": "database",
}


def source_hash(queries_path: Path, fixtures_dir: Path) -> str:
    """Hash the inputs, so the replayer can tell a stale oracle without Python."""
    digest = hashlib.sha256()
    digest.update(queries_path.read_bytes())
    for path in sorted(p for p in fixtures_dir.rglob("*") if p.is_file()):
        digest.update(path.relative_to(fixtures_dir).as_posix().encode())
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def normalize(value: Any) -> Any:
    """Render one result cell as JSON, losing only representation differences."""
    if value is None or isinstance(value, (bool, int, str)):
        return value
    if isinstance(value, decimal.Decimal):
        return format(value, "f")
    if isinstance(value, (datetime.date, datetime.datetime)):
        return value.isoformat()
    if hasattr(value, "get_positions"):  # beancount Inventory (a dict subclass)
        return sorted(str(position) for position in value.get_positions())
    if isinstance(value, (set, frozenset)):
        return sorted(normalize(item) for item in value)
    if isinstance(value, (list, tuple)):
        return [normalize(item) for item in value]
    if isinstance(value, dict):
        return {str(k): normalize(value[k]) for k in sorted(value, key=str)}
    # Amount, Position, Inventory, Cost, ...: their stock string form.
    return str(value)


def dtype_name(column: Any) -> str:
    datatype = column.datatype
    return getattr(datatype, "__name__", str(datatype))


def run_query(conn: Any, query: str) -> dict[str, Any]:
    try:
        cursor = conn.execute(query)
        rows = cursor.fetchall()
    except Exception as error:  # noqa: BLE001 - classify every stock refusal
        category = next(
            (
                ERROR_CATEGORIES[cls.__name__]
                for cls in type(error).__mro__
                if cls.__name__ in ERROR_CATEGORIES
            ),
            "other",
        )
        return {"error": category}
    return {
        "columns": [
            {"name": column.name, "dtype": dtype_name(column)}
            for column in cursor.description
        ],
        "rows": [[normalize(cell) for cell in row] for row in rows],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queries", type=Path, default=DEFAULT_QUERIES)
    parser.add_argument("--fixtures", type=Path, default=DEFAULT_FIXTURES)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    import beancount
    import beanquery
    from beancount import loader
    from beanquery import connect

    if beanquery.__version__ != ENGINE_BEANQUERY:
        sys.exit(
            f"expected stock beanquery {ENGINE_BEANQUERY}, found "
            f"{beanquery.__version__}"
        )

    fixtures = args.fixtures.resolve()
    queries = json.loads(args.queries.read_text())
    ids = [entry["id"] for entry in queries]
    if len(ids) != len(set(ids)):
        sys.exit("duplicate query ids in " + str(args.queries))

    # A fixture that does not load cleanly would make every result vacuous.
    for ledger in sorted({entry["ledger"] for entry in queries}):
        _, errors, _ = loader.load_file(str(fixtures / ledger))
        if errors:
            sys.exit(f"fixture {ledger} has load errors: {errors[0].message}")

    results: dict[str, Any] = {}
    connections: dict[str, Any] = {}
    for entry in queries:
        ledger = entry["ledger"]
        if ledger not in connections:
            connections[ledger] = connect(f"beancount:{fixtures / ledger}")
        results[entry["id"]] = {
            "ledger": ledger,
            "query": entry["query"],
            "source": entry["source"],
            **run_query(connections[ledger], entry["query"]),
        }

    document = {
        "format": FORMAT_VERSION,
        "oracle": {
            "beancount": beancount.__version__,
            "beanquery": beanquery.__version__,
        },
        "sourceHash": source_hash(args.queries, fixtures),
        "results": results,
    }
    args.output.write_text(
        json.dumps(document, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
    )
    print(f"wrote {len(results)} results to {args.output.name}")


if __name__ == "__main__":
    main()
