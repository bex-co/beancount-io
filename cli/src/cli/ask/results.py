"""The shape a ledger query takes on its way to the model.

`ask` used to hand the model whatever the engine's text renderer printed
(`--format text`, straight through). Three of that decision's consequences were
wrong answers rather than cosmetics:

* An empty Inventory renders as a run of spaces, so `SELECT sum(position) WHERE
  date <= 2024-03-01` — correct BQL, and zero because every transaction balances
  — arrived as a header, a rule and a blank cell. Nothing in it said whether the
  total was zero or there were no rows, and the model told the user their ledger
  had no entries (w3/447). The same blank answered "how much EUR do I hold?"
  with "there is no EUR balance" on a ledger holding 800.00 EUR.
* Nothing said how many rows came back, or what a row *is*. `SELECT count(*)`
  over the default table counts postings, so "how many transactions do I have?"
  was answered with the posting count, twice out of two (w3/455).
* Nothing bounded the result. A 15,000-transaction ledger and "list every
  transaction" put a 15,000-row table into the request body, which the gateway
  refuses with `request entity too large` (w3/448).

So the tool asks the engine for rows and columns (`--format json`) and renders
them here: a row count, the relation and its grain, cells whose zero is visible,
footnotes for the two mistakes the shape of BQL invites, and a documented
truncation budget that the model is told about so it can disclose it.

Rendering from typed rows rather than from the text table is what makes the zero
legible at all: an empty Inventory and an empty tag set are both `[]` on the
wire, and only the column's declared type tells them apart.
"""

from __future__ import annotations

import json
import re
from collections.abc import Mapping, Sequence
from typing import Any

#: How much of a result may reach the model. A tool result is not a file the
#: model can page through: it is spent, whole, in every later request of the
#: same question. The gateway accepts a body around 100 KB and refuses one in
#: the megabytes (w3/448), and `TOOL_CALLS_LIMIT` results accumulate inside one
#: question — so the per-result budget is deliberately a fraction of that.
#: Enumerating a ledger is the question that hits this, and the right answer to
#: it is an aggregate, which the truncation line says.
MAX_ROWS = 200
MAX_CHARS = 12_000
#: Room kept for the "…(N chars cut)" marker on a row cut to fit.
_CUT_MARKER_ROOM = 32

#: The relations a BQL query may name. `FROM` in this dialect takes either one
#: of these (optionally `#`-prefixed or quoted) or an entry filter expression —
#: the prompt used to claim it is never a table name, which is how the model was
#: steered off the only correct entry count.
TABLES = ("entries", "postings", "accounts", "balances", "prices", "documents", "commodities")

_FROM_TABLE = re.compile(r'(?i)\bFROM\s+["#]*(' + "|".join(TABLES) + r')\b["]*')
_COUNTING = re.compile(r"(?i)\bcount\s*\(")

#: Said once per result, where the mistake is made rather than in the prompt.
_POSTINGS_GRAIN = "one row per posting, so a transaction with two postings is two rows"
_COUNT_FOOTNOTE = (
    "Note: over the postings table count(*) counts postings, not transactions. "
    "For a number of entries use: SELECT count(*) FROM #entries WHERE type = 'transaction'."
)
_ZERO_FOOTNOTE = (
    "Note: a cell shown as 0 is an empty inventory — the matched postings cancel out, "
    "they are not missing. Every transaction balances, so a sum(position) over the whole "
    "ledger is always 0; filter it, e.g. WHERE account ~ '^(Assets|Liabilities)' for "
    "holdings, or WHERE account = 'Assets:Bank:Euro' for one account."
)


def table_named(query: str) -> str:
    """Which relation this query reads, for stating the grain of a row."""
    match = _FROM_TABLE.search(query)
    return match.group(1).lower() if match else "postings"


def format_result(query: str, answer: Mapping[str, Any]) -> str:
    """One query's rows, as the text the model is given.

    `answer` is the engine's `query --format json` envelope: `columns` carrying
    a name and a declared type, and JSON-ready `rows`.
    """
    columns = list(answer.get("columns") or [])
    rows = list(answer.get("rows") or [])
    names = [str(column.get("name", "?")) for column in columns]
    types = [str(column.get("type", "")) for column in columns]
    table = table_named(query)
    grain = f" ({_POSTINGS_GRAIN})" if table == "postings" else ""

    if not rows:
        return (
            f"0 row(s) from the {table} table{grain}. "
            "No row matched this query — that is an empty result, not an error and not a zero."
        )

    header = f"{len(rows)} row(s) from the {table} table{grain}."
    lines = [header, " | ".join(names) if names else "(no columns)"]
    # The budget is spent in whole rows: a cut row would read as a real value
    # the model could quote. The one exception is a first row that alone is
    # over budget — taking it whole let one long cell put the entire value into
    # every later request (w1/096) — so it is cut, and the cut is marked.
    shown = 0
    used = sum(len(line) + 1 for line in lines)
    cut = 0
    zeroed = False
    for row in rows:
        if shown >= MAX_ROWS:
            break
        typed = [(value, types[index] if index < len(types) else "") for index, value in enumerate(row)]
        cells = [render_cell(value, kind) for value, kind in typed]
        zeroed = zeroed or any(
            cell == "0" and kind == "Inventory" for cell, (_, kind) in zip(cells, typed, strict=True)
        )
        line = " | ".join(cells)
        if used + len(line) + 1 > MAX_CHARS:
            if shown:
                break
            keep = max(MAX_CHARS - used - 1 - _CUT_MARKER_ROOM, 0)
            cut = len(line) - keep
            line = f"{line[:keep]}…({cut} chars cut)"
        lines.append(line)
        used += len(line) + 1
        shown += 1
        if cut:
            break
    if shown < len(rows) or cut:
        clipped = f" The first row was cut short by {cut} characters where marked." if cut else ""
        lines.append(
            f"… truncated: showing the first {shown} of {len(rows)} rows.{clipped} "
            "Say in your answer that the result was truncated, or ask a narrower question — "
            "an aggregate (sum, count, GROUP BY), a date range or a LIMIT — instead of enumerating."
        )
    if zeroed:
        lines.append(_ZERO_FOOTNOTE)
    if table == "postings" and _COUNTING.search(query):
        lines.append(_COUNT_FOOTNOTE)
    return "\n".join(lines)


def render_cell(value: Any, declared_type: str) -> str:
    """One cell, rendered so its zero, its emptiness and its currency all show."""
    if value is None:
        return "(none)"
    if declared_type == "Inventory":
        positions = value if isinstance(value, Sequence) and not isinstance(value, str) else [value]
        if not positions:
            return "0"
        return ", ".join(_position(position) for position in positions)
    if declared_type in ("Position", "Amount", "Cost"):
        return _position(value)
    if declared_type == "set":
        items = value if isinstance(value, Sequence) and not isinstance(value, str) else [value]
        return ", ".join(str(item) for item in items) if items else "(empty set)"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str | int | float):
        return str(value)
    return _position(value)


def _position(value: Any) -> str:
    """An amount, a position or a lot, as a person would write it."""
    if value is None:
        return "(none)"
    if not isinstance(value, Mapping):
        return str(value)
    if "units" in value:
        units = _position(value.get("units"))
        cost = value.get("cost")
        return f"{units} {{{_position(cost)}}}" if cost else units
    number = value.get("number")
    currency = value.get("currency")
    if number is not None or currency is not None:
        rendered = " ".join(str(part) for part in (number, currency) if part is not None)
        label = value.get("label")
        acquired = value.get("date")
        extra = ", ".join(str(part) for part in (acquired, label) if part)
        return f"{rendered} ({extra})" if extra else rendered
    return json.dumps(value, sort_keys=True)
