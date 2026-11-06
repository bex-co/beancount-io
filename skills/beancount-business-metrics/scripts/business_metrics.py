#!/usr/bin/env python3
"""Cash, net operating burn and runway from a local Beancount ledger, through `bea`.

Reads `bea report cash-flow` month by month and does only the arithmetic the
definitions in references/metrics-contract.md name. Standard library only.

Exit status: 0 figures printed (a runway that cannot be stated is explained,
not an error); 2 bad usage or a ledger `bea` refuses; 1 a `bea` command failed.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

CENT = Decimal("0.01")
TENTH = Decimal("0.1")
MONTH = re.compile(r"^(\d{4})-(0[1-9]|1[0-2])$")
UNSUPPORTED = (
    "ARR",
    "MRR",
    "CAC",
    "LTV",
    "churn",
    "retention",
    "cohorts",
)
UNSUPPORTED_REASON = (
    "These need customer, subscription or marketing data the ledger does not hold (a dated list of customers or "
    "subscriptions, acquisition spend by channel). A ledger's income accounts do not identify them, so none is "
    "computed or estimated here."
)


class MetricsError(Exception):
    def __init__(self, message: str, code: int = 1) -> None:
        super().__init__(message)
        self.code = code


def months_back(through: str, count: int) -> list[str]:
    year, month = int(through[:4]), int(through[5:7])
    out: list[str] = []
    for _ in range(count):
        out.append(f"{year:04d}-{month:02d}")
        year, month = (year - 1, 12) if month == 1 else (year, month - 1)
    return list(reversed(out))


class Bea:
    def __init__(self, executable: str, ledger: str | None) -> None:
        self.executable, self.ledger = executable, ledger

    def data(self, *argv: str) -> dict[str, Any]:
        command = [self.executable, "--no-input", "--json"]
        if self.ledger:
            command += ["--file", self.ledger]
        try:
            done = subprocess.run([*command, *argv], capture_output=True, text=True, encoding="utf-8", check=False)
        except FileNotFoundError:
            raise MetricsError(f"`{self.executable}` is not installed or not on PATH; install bea first.", 2) from None
        if done.returncode != 0:
            text = (done.stderr or done.stdout).strip()
            try:
                text = json.loads(text)["error"]["message"]
            except (ValueError, KeyError, TypeError):
                pass
            code = 2 if done.returncode == 2 or argv[:1] == ("check",) else 1
            raise MetricsError(f"`bea {' '.join(argv)}` failed (exit {done.returncode}): {text}", code)
        return json.loads(done.stdout)["data"]


def amounts(balance: dict[str, str] | None) -> dict[str, Decimal]:
    return {currency: Decimal(value) for currency, value in (balance or {}).items() if value is not None}


def money(value: Decimal) -> str:
    return f"{value.quantize(CENT, rounding=ROUND_HALF_UP):,.2f}"


def collect(bea: Bea, through: str, months: int) -> dict[str, Any]:
    bea.data("check")
    first = bea.data("query", "--", "SELECT min(date) AS first")["rows"][0][0]
    if first is None:
        raise MetricsError("The ledger has no dated entries.", 2)
    first_month = str(first)[:7]
    window = months_back(through, months)
    rows: list[dict[str, Any]] = []
    cash_accounts: list[dict[str, Any]] = []
    residual = False
    for month in window:
        if month < first_month:
            continue
        report = bea.data("report", "cash-flow", "--time", month)
        operating = amounts(report["totals"]["operating"])
        rows.append(
            {
                "month": month,
                "operating": operating,
                "investing": amounts(report["totals"]["investing"]),
                "financing": amounts(report["totals"]["financing"]),
                "net_change": amounts(report["net_change"]),
                "closing": amounts(report["closing"]),
                "net_burn": {currency: -value for currency, value in operating.items()},
            }
        )
        residual = residual or bool(report["rounding_residual"])
        cash_accounts = report["cash_accounts"]
    if not rows:
        raise MetricsError(f"The ledger starts in {first_month}, after {through}; there is nothing to measure.", 2)
    return {"rows": rows, "first_month": first_month, "cash_accounts": cash_accounts, "rounding_residual": residual}


def runway(rows: list[dict[str, Any]], through: str, basis_months: int) -> dict[str, Any]:
    """Closing cash over the trailing average net burn, per currency, or the reason there is none."""
    basis = [row for row in rows if row["month"] in months_back(through, basis_months)]
    if len(basis) < basis_months:
        return {
            "basis_months": basis_months,
            "available_months": len(basis),
            "status": "insufficient-history",
            "reason": f"only {len(basis)} of the {basis_months} months the basis needs fall inside the ledger's history; "
            "a runway from fewer months is not stated.",
            "currencies": {},
        }
    closing = rows[-1]["closing"]
    currencies: dict[str, Any] = {}
    for currency in sorted({c for row in basis for c in row["net_burn"]} | set(closing)):
        average = sum((row["net_burn"].get(currency, Decimal(0)) for row in basis), Decimal(0)) / basis_months
        cash = closing.get(currency, Decimal(0))
        entry: dict[str, Any] = {"average_net_burn": average.quantize(CENT, rounding=ROUND_HALF_UP), "closing_cash": cash}
        if average <= 0:
            entry["status"] = "not-burning"
            entry["reason"] = "operating cash flow was not negative on average, so a runway is undefined"
        elif cash <= 0:
            entry["status"] = "no-cash"
            entry["reason"] = "there is no positive cash balance to run on"
        else:
            entry["status"] = "ok"
            entry["months"] = (cash / average).quantize(TENTH, rounding=ROUND_HALF_UP)
        currencies[currency] = entry
    return {"basis_months": basis_months, "available_months": len(basis), "status": "computed", "currencies": currencies}


def render(through: str, data: dict[str, Any], plan: dict[str, Any]) -> str:
    rows = data["rows"]
    currencies = sorted({c for row in rows for key in ("operating", "investing", "financing", "closing") for c in row[key]})
    lines = [f"# Cash, burn and runway — through {through}", ""]
    for currency in currencies:
        lines += [
            f"## {currency}",
            "",
            "| Month | Operating | Net burn | Investing | Financing | Closing cash |",
            "| --- | ---: | ---: | ---: | ---: | ---: |",
        ]
        for row in rows:
            cells = [money(row[key].get(currency, Decimal(0))) for key in ("operating", "net_burn", "investing", "financing", "closing")]
            lines.append(f"| {row['month']} | " + " | ".join(cells) + " |")
        lines.append("")
    lines += ["## Runway", ""]
    if plan["status"] == "insufficient-history":
        lines.append(f"Not stated: {plan['reason']}")
    for currency, entry in plan["currencies"].items():
        basis = f"closing cash {money(entry['closing_cash'])} {currency} over the average net burn {money(entry['average_net_burn'])} {currency} a month ({plan['basis_months']} months to {through})"
        if entry["status"] == "ok":
            lines.append(f"- {currency}: {entry['months']} months — {basis}")
        else:
            lines.append(f"- {currency}: not stated — {entry['reason']} ({basis})")
    lines += [
        "",
        "## Definitions and perimeter",
        "",
        "- Net burn = minus the month's operating cash flow (positive = cash consumed). Investing and financing are shown, never counted as burn; transfers between cash accounts are not flows.",
        "- Cash accounts: "
        + (", ".join(f"{a['account']} ({a['role_source']})" for a in data["cash_accounts"]) or "none")
        + ". `heuristic` means the class came from the account's name, not a declared `cash-flow-role`.",
        f"- Months before the ledger starts ({data['first_month']}) are not counted.",
        *(
            ["- A month's cash-flow report disclosed a rounding residual; see `bea report cash-flow` for that month."]
            if data["rounding_residual"]
            else []
        ),
        "",
        "## Not computed",
        "",
        f"{', '.join(UNSUPPORTED)}: {UNSUPPORTED_REASON}",
        "",
    ]
    return "\n".join(lines)


def to_json(through: str, data: dict[str, Any], plan: dict[str, Any]) -> dict[str, Any]:
    def plain(value: Any) -> Any:
        if isinstance(value, Decimal):
            return format(value, "f")
        if isinstance(value, dict):
            return {k: plain(v) for k, v in value.items()}
        if isinstance(value, list):
            return [plain(v) for v in value]
        return value

    return plain({"through": through, "months": data["rows"], "runway": plan, "cash_accounts": data["cash_accounts"],
                  "not_computed": {"metrics": list(UNSUPPORTED), "reason": UNSUPPORTED_REASON}})


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--through", required=True, help="Last month to measure, YYYY-MM")
    parser.add_argument("--months", type=int, default=6, help="Months shown, ending at --through (default 6)")
    parser.add_argument("--runway-months", type=int, default=3, help="Months of net burn the runway averages (default 3)")
    parser.add_argument("--file", help="Root ledger (default: bea's own discovery)")
    parser.add_argument("--bea", default="bea", help="The bea executable")
    parser.add_argument("--json", action="store_true", help="Print JSON instead of Markdown")
    args = parser.parse_args()
    try:
        if not MONTH.match(args.through):
            raise MetricsError("--through must be a month like 2026-06.", 2)
        if not 1 <= args.months <= 36 or not 1 <= args.runway_months <= args.months:
            raise MetricsError("--months must be 1-36 and --runway-months between 1 and --months.", 2)
        data = collect(Bea(args.bea, args.file), args.through, args.months)
        plan = runway(data["rows"], args.through, args.runway_months)
    except MetricsError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return exc.code
    if args.json:
        print(json.dumps(to_json(args.through, data, plan), indent=2))
    else:
        print(render(args.through, data, plan))
    return 0


if __name__ == "__main__":
    sys.exit(main())
