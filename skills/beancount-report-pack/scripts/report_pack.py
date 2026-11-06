#!/usr/bin/env python3
"""Build a reconciled report pack from one local Beancount ledger, through `bea`.

Writes CSV statements, SUMMARY.md (headline figures, tie-outs, visible gaps)
and EVIDENCE.md (input digests, commands, output digests) into --out. Every
figure comes from `bea` JSON or CSV output; this script only reads, hashes and
compares. Standard library only.

Exit status: 0 every performed tie-out passed; 2 bad usage or a ledger `bea`
refuses; 1 a `bea` command failed; 3 the pack was written but a tie-out
failed (SUMMARY.md says NOT RECONCILED and shows each difference).
"""

from __future__ import annotations

import argparse
import csv
import glob
import hashlib
import json
import os
import re
import subprocess
import sys
from decimal import Decimal
from pathlib import Path
from typing import Any

STATEMENTS = (
    ("balance-sheet", "balance-sheet.csv", True),
    ("income-statement", "income-statement.csv", True),
    ("trial-balance", "trial-balance.csv", True),
    ("cash-flow", "cash-flow.csv", False),
    ("holdings", "holdings.csv", True),
)
INCLUDE = re.compile(r'^\s*include\s+"([^"]+)"', re.MULTILINE)
Balance = dict[str, Any]


class PackError(Exception):
    def __init__(self, message: str, code: int = 1, *, missing_prices: bool = False) -> None:
        super().__init__(message)
        self.code = code
        self.missing_prices = missing_prices


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def closure(root: Path) -> list[Path]:
    """The root file and every file it includes, found by reading `include` lines."""
    seen: dict[Path, None] = {}
    pending = [root.resolve()]
    while pending:
        current = pending.pop()
        if current in seen or not current.is_file():
            continue
        seen[current] = None
        text = current.read_text(encoding="utf-8", errors="replace")
        for pattern in INCLUDE.findall(text):
            if "://" in pattern:
                continue  # a URL include is outside the digest; EVIDENCE.md says so
            target = pattern if os.path.isabs(pattern) else str(current.parent / pattern)
            pending.extend(Path(match).resolve() for match in sorted(glob.glob(target, recursive=True)))
    return sorted(seen)


def digest_of(files: list[Path], base: Path) -> tuple[str, list[tuple[str, str]]]:
    rows = [(os.path.relpath(path, base), sha256(path)) for path in files]
    combined = hashlib.sha256("\n".join(f"{name} {value}" for name, value in rows).encode()).hexdigest()
    return combined, rows


def failure(argv: tuple[str, ...], done: subprocess.CompletedProcess[str]) -> PackError:
    """bea's own error message, with the way out when the cause is a missing price."""
    text = (done.stderr or done.stdout).strip()
    # A ledger `bea check` refuses is the caller's to fix, like a usage error.
    code = 2 if done.returncode == 2 or argv[:1] == ("check",) else 1
    try:
        error = json.loads(text)["error"]
    except (ValueError, KeyError, TypeError):
        return PackError(f"`bea {' '.join(argv)}` failed (exit {done.returncode}): {text}", code)
    lines = [f"`bea {' '.join(argv)}` failed (exit {done.returncode}): {error['message']}", *map(str, error.get("details", []))]
    missing = bool(error.get("result", {}).get("missing_prices"))
    if missing:
        lines.append("Add the missing prices, or build with --conversion at_cost for book value (holdings are left out without prices).")
    return PackError("\n".join(lines), code, missing_prices=missing)


class Bea:
    def __init__(self, executable: str, ledger: Path | None) -> None:
        self.executable, self.ledger = executable, ledger

    def run(self, *argv: str, json_output: bool = True) -> subprocess.CompletedProcess[str]:
        command = [self.executable, "--no-input"]
        if json_output:
            command.append("--json")
        if self.ledger is not None:
            command += ["--file", str(self.ledger)]
        try:
            return subprocess.run([*command, *argv], capture_output=True, text=True, encoding="utf-8", check=False)
        except FileNotFoundError:
            raise PackError(f"`{self.executable}` is not installed or not on PATH; install bea first.", 2) from None

    def envelope(self, *argv: str) -> dict[str, Any]:
        done = self.run(*argv)
        if done.returncode != 0:
            raise failure(argv, done)
        return json.loads(done.stdout)

    def data(self, *argv: str) -> dict[str, Any]:
        return self.envelope(*argv)["data"]


def dec(balance: Balance | None) -> dict[str, Decimal | None]:
    return {currency: None if value is None else Decimal(value) for currency, value in (balance or {}).items()}


def total(tree: dict[str, Any] | None) -> dict[str, Decimal | None]:
    return dec(tree["balance_children"]) if tree else {}


def residuals(left: dict[str, Decimal | None], right: dict[str, Decimal | None]) -> tuple[dict[str, Decimal], bool]:
    """Per-currency `left + right`; the flag is true when any side could not be valued."""
    out: dict[str, Decimal] = {}
    unvalued = False
    for currency in sorted(set(left) | set(right)):
        a, b = left.get(currency, Decimal(0)), right.get(currency, Decimal(0))
        if a is None or b is None:
            unvalued = True
            continue
        out[currency] = a + b
    return out, unvalued


def show(balance: dict[str, Any]) -> str:
    return ", ".join(f"{value} {currency}" for currency, value in sorted(balance.items())) or "0"


class Check:
    def __init__(self, name: str, claim: str) -> None:
        self.name, self.claim, self.status, self.detail = name, claim, "pass", ""

    def settle(self, differences: dict[str, Decimal], unvalued: bool, allowance: dict[str, Decimal] | None = None) -> None:
        allowance = allowance or {}
        bad = {c: d for c, d in differences.items() if abs(d) > abs(allowance.get(c, Decimal(0)))}
        if bad:
            self.status, self.detail = "FAIL", "difference " + show(bad)
        elif unvalued:
            self.status, self.detail = "skipped", "a balance could not be valued (missing price); pass --conversion at_cost or add prices"
        elif any(differences.values()):
            self.status, self.detail = "pass", "difference within disclosed rounding residual " + show(differences)


def check_balance_sheet(sheet: dict[str, Any]) -> Check:
    check = Check("Balance sheet balances", "assets + liabilities + equity (with current earnings) = 0, in Beancount signs")
    assets, liabilities = total(sheet["assets"]), total(sheet["liabilities"])
    if sheet.get("equity_reconciled"):
        equity = dec(sheet["equity_total"])
    else:
        equity, _ = residuals(total(sheet["equity"]), dec(sheet["current_earnings"]))
    left, bad1 = residuals(assets, liabilities)
    diff, bad2 = residuals(left, equity)
    check.settle(diff, bad1 or bad2 or any(v is None for v in equity.values()))
    return check


def check_profit(sheet: dict[str, Any], income: dict[str, Any]) -> Check:
    check = Check("Profit ties across statements", "income-statement net profit + balance-sheet current earnings = 0")
    diff, unvalued = residuals(dec(income["net_profit"]), dec(sheet["current_earnings"]))
    check.settle(diff, unvalued)
    return check


def check_trial_balance(trial: dict[str, Any], sheet: dict[str, Any], income: dict[str, Any]) -> Check:
    check = Check("Trial balance agrees with the statements", "each root total in the trial balance equals the same root in its statement")
    pairs = [(trial[r], sheet[r]) for r in ("assets", "liabilities", "equity")] + [(trial[r], income[r]) for r in ("income", "expenses")]
    differences: dict[str, Decimal] = {}
    unvalued = False
    for one, other in pairs:
        negated = {c: None if v is None else -v for c, v in total(other).items()}
        diff, bad = residuals(total(one), negated)
        unvalued = unvalued or bad
        for currency, value in diff.items():
            differences[currency] = differences.get(currency, Decimal(0)) + abs(value)
    check.settle(differences, unvalued)
    return check


def check_cash_roll(flow: dict[str, Any]) -> Check:
    check = Check("Cash rolls forward", "opening cash + net change = closing cash (any gap equals the disclosed rounding residual)")
    moved, bad1 = residuals(dec(flow["opening"]), dec(flow["net_change"]))
    negative_closing = {c: None if v is None else -v for c, v in dec(flow["closing"]).items()}
    diff, bad2 = residuals(moved, negative_closing)
    check.settle(diff, bad1 or bad2, allowance=dec(flow["rounding_residual"]))  # type: ignore[arg-type]
    return check


def check_cash_independent(bea: Bea, flow: dict[str, Any]) -> Check:
    check = Check("Closing cash is independently recomputed", "a BQL sum of the cash accounts' postings through the period end = closing cash")
    accounts = [entry["account"] for entry in flow["cash_accounts"]]
    end = flow["period"]["end_exclusive"]
    if not accounts or end is None:
        check.status, check.detail = "skipped", "the ledger has no cash accounts or no dated activity"
        return check
    names = " OR ".join("account = '" + a.replace("'", "\\'") + "'" for a in accounts)
    rows = bea.data("query", "--", f"SELECT currency, sum(number) AS n WHERE ({names}) AND date < {end} GROUP BY currency")["rows"]
    recomputed: dict[str, Decimal | None] = {currency: Decimal(number) for currency, number in rows}
    negated = {c: None if v is None else -v for c, v in recomputed.items()}
    diff, unvalued = residuals(dec(flow["closing"]), negated)
    check.settle(diff, unvalued, allowance=dec(flow["rounding_residual"]))  # type: ignore[arg-type]
    return check


def gaps(bea: Bea, flow: dict[str, Any], sheet: dict[str, Any], income: dict[str, Any]) -> list[str]:
    """Classification gaps the pack leaves visible instead of resolving."""
    found: list[str] = []
    heuristic = [e["account"] for e in flow["cash_accounts"] if e.get("role_source") == "heuristic"]
    for activity in ("operating", "investing", "financing"):
        heuristic += [e["account"] for e in flow["sections"][activity] if e.get("role_source") == "heuristic"]
    if heuristic:
        found.append("Cash-flow class chosen by account name, not declared with `cash-flow-role`: " + ", ".join(sorted(set(heuristic))))
    if flow["invalid_role_values"]:
        found.append("Unknown cash-flow-role values: " + ", ".join(f"{v['account']}={v['value']!r}" for v in flow["invalid_role_values"]))

    def walk(node: dict[str, Any] | None) -> list[tuple[str, dict[str, Any]]]:
        if not node:
            return []
        out = [(node["account"], node["balance"])] if "uncategorized" in node["account"].lower() and node["balance"] else []
        return out + [pair for child in node["children"] for pair in walk(child)]

    for tree in (income["income"], income["expenses"]):
        for account, balance in walk(tree):
            found.append(f"Balance parked in {account}: {show(balance)}")
    period = sheet["period"]
    if period["start"] and period["end_exclusive"]:
        rows = bea.data("query", "--", f"SELECT id WHERE flag = '!' AND date >= {period['start']} AND date < {period['end_exclusive']} GROUP BY id")["rows"]
        if rows:
            found.append(f"{len(rows)} transaction(s) in the period are flagged `!` (pending review)")
    if sheet["unrooted_accounts"]:
        found.append("Accounts outside the five account roots, shown in no statement: " + ", ".join(sheet["unrooted_accounts"]))
    for source in sheet.get("price_sources", []):
        if source["freshness"] != "recent" or source["error"]:
            found.append(f"Price source {source['alias']} is {source['freshness']}" + (f" ({source['error']})" if source["error"] else ""))
    return found


def csv_rows(path: Path) -> int:
    with path.open(newline="", encoding="utf-8") as handle:
        return max(sum(1 for _ in csv.reader(handle)) - 1, 0)


def write_pack(args: argparse.Namespace) -> int:
    out = Path(args.out)
    bea = Bea(args.bea, Path(args.file) if args.file else None)
    probe = bea.envelope("check")
    if not probe["data"].get("valid", True):
        errors = "; ".join(str(error) for error in probe["data"].get("errors", [])[:3])
        raise PackError(f"The ledger does not pass `bea check`; fix it before packing: {errors}", 2)
    root = Path(probe["target"]["file"]).resolve()
    before, _ = digest_of(closure(root), root.parent)
    out.mkdir(parents=True, exist_ok=True)

    conversion = ["--conversion", args.conversion] if args.conversion else []
    common = ["--time", args.time]
    json_reports: dict[str, dict[str, Any]] = {}
    commands: dict[str, str] = {}
    omitted: list[str] = []
    for kind, filename, takes_conversion in STATEMENTS:
        extra = conversion if takes_conversion else []
        try:
            json_reports[kind] = bea.data("report", kind, *common, *extra)
        except PackError as exc:
            # Holdings are market values by nature: without prices the other statements still stand.
            if kind != "holdings" or not exc.missing_prices:
                raise
            omitted.append(f"`{filename}` was not produced: holdings need a price for every commodity held")
            (out / filename).unlink(missing_ok=True)
            continue
        csv_path = out / filename
        done = bea.run("report", kind, *common, *extra, "--format", "csv", "--output", str(csv_path), json_output=False)
        if done.returncode != 0:
            raise PackError(f"`bea report {kind} --format csv` failed: {done.stderr.strip()} (CSV output needs a bea release after 0.3.1)", 1)
        commands[filename] = "bea report " + " ".join([kind, *common, *extra, "--format csv"])

    sheet, income = json_reports["balance-sheet"], json_reports["income-statement"]
    trial, flow = json_reports["trial-balance"], json_reports["cash-flow"]
    checks = [
        check_balance_sheet(sheet),
        check_profit(sheet, income),
        check_trial_balance(trial, sheet, income),
        check_cash_roll(flow),
        check_cash_independent(bea, flow),
    ]
    visible = omitted + gaps(bea, flow, sheet, income)

    files = closure(root)
    after, rows = digest_of(files, root.parent)
    if after != before:
        raise PackError("The ledger changed while the pack was being built; run it again on a quiet ledger.", 1)

    failed = [c for c in checks if c.status == "FAIL"]
    status = "NOT RECONCILED" if failed else ("RECONCILED (some checks skipped)" if any(c.status == "skipped" for c in checks) else "RECONCILED")
    period = sheet["period"]
    lines = [
        f"# Report pack — {args.time}",
        "",
        f"**Status: {status}**",
        "",
        f"Period {period['start']} through {sheet['as_of']}; valuation `{sheet['conversion']}`. "
        f"Ledger digest `{before[:16]}…` (see EVIDENCE.md). Beancount signs: credits negative; statements are not a statutory audit.",
        "",
        "## Headline figures",
        "",
        f"- Net worth: {show(sheet['net_worth'])}",
        f"- Net profit: {show(income['net_profit'])}",
        f"- Net change in cash: {show(flow['net_change'])} (opening {show(flow['opening'])}, closing {show(flow['closing'])})",
        "",
        "## Tie-outs",
        "",
        "| Check | Result | What it compares |",
        "| --- | --- | --- |",
        *[f"| {c.name} | {c.status}{(' — ' + c.detail) if c.detail else ''} | {c.claim} |" for c in checks],
        "",
        "## Left visible",
        "",
        *([f"- {item}" for item in visible] or ["- Nothing unclassified was found by the checks above."]),
        "",
        "## Files",
        "",
        *[f"- `{name}`" for name in [f for _, f, _ in STATEMENTS if f in commands] + ["EVIDENCE.md"]],
        "",
    ]
    (out / "SUMMARY.md").write_text("\n".join(lines), encoding="utf-8")

    evidence = [
        "# Evidence",
        "",
        f"Built with `{args.bea}` {bea.run('--version', json_output=False).stdout.strip()}.",
        "",
        "## Input snapshot",
        "",
        f"Combined digest `{before}` over these files (include lines read; URL includes and plugin inputs are outside it):",
        "",
        *[f"- `{name}` `{value}`" for name, value in rows],
        "",
        "## Outputs",
        "",
        "| File | Rows | SHA-256 | Command |",
        "| --- | --- | --- | --- |",
        *[f"| `{name}` | {csv_rows(out / name)} | `{sha256(out / name)}` | `{command}` |" for name, command in commands.items()],
        f"| `SUMMARY.md` | — | `{sha256(out / 'SUMMARY.md')}` | built from the JSON of the commands above |",
        "",
    ]
    (out / "EVIDENCE.md").write_text("\n".join(evidence), encoding="utf-8")
    print(f"{status}: {out}/SUMMARY.md")
    for check in checks:
        print(f"  {check.status:7} {check.name}" + (f" — {check.detail}" if check.detail else ""))
    return 3 if failed else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--time", required=True, help="Period for bea: 2026, 2026-06, or '2026-01 - 2026-06'")
    parser.add_argument("--out", required=True, help="Directory to write the pack into (created if missing)")
    parser.add_argument("--file", help="Root ledger (default: bea's own discovery)")
    parser.add_argument("--conversion", help="Valuation for the statements: a currency, units, at_cost or at_value")
    parser.add_argument("--bea", default="bea", help="The bea executable")
    try:
        return write_pack(parser.parse_args())
    except PackError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return exc.code


if __name__ == "__main__":
    sys.exit(main())
