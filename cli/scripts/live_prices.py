"""Explicit authenticated production smoke, using a checkout or --bea executable.

Run make live-prices after cloud login, or supply protected BEA_TOKEN in CI.
Only synthetic holdings are used. A successful run records public source
metadata; failed runs never replace the last successful evidence record.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECORD = ROOT / "tests" / "managed_prices_live_status.json"
URL = "https://beancount.io/prices/BTC-USD"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bea", type=Path, help="Installed executable to validate instead of this checkout")
    args = parser.parse_args()
    command = [str(args.bea.resolve())] if args.bea else [sys.executable, "-m", "cli.main"]
    (ROOT / "tmp").mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="live-prices-", dir=ROOT / "tmp") as scratch:
        directory = Path(scratch)
        env = {**os.environ, "XDG_CACHE_HOME": str(directory / "cache"), "BEA_NO_UPDATE_NOTIFIER": "1"}
        for name in ("MANAGED_PRICE_OFFLINE", "MANAGED_PRICE_STRICT", "MANAGED_PRICE_ORIGINS", "BEA_FILE"):
            env.pop(name, None)
        if not args.bea:
            env["PYTHONPATH"] = str(ROOT / "src")
        ledger = directory / "main.bean"
        original = (
            'option "operating_currency" "USD"\n'
            f'include "{URL}"\n'
            "2024-01-01 open Assets:Crypto\n2024-01-01 open Equity:Opening\n"
            '2024-01-01 * "Synthetic launch check"\n'
            "  Assets:Crypto 0.5 BTC\n  Equity:Opening -0.5 BTC\n"
        )
        ledger.write_text(original)

        def run(*argv: str, file: Path = ledger) -> dict:
            result = subprocess.run(
                [*command, "--json", "--no-input", "--file", str(file), *argv],
                env=env,
                cwd=directory,
                capture_output=True,
                text=True,
                timeout=300,
            )
            if result.returncode:
                # Do not print subprocess output or traces carrying arbitrary state.
                raise RuntimeError(f"Live smoke command {argv[0]} failed (exit {result.returncode}).")
            return json.loads(result.stdout)

        refreshed = run("price", "refresh")
        source = refreshed["data"]["sources"][0]
        assert source["revision"] and source["error"] is None
        run("check")
        valued = run("balance", "Assets", "--conversion", "USD")["data"]
        assert valued["valuation"] == "complete"
        assert Decimal(valued["assets"]["balance_children"]["USD"]) > 0
        assert valued["price_sources"][0]["revision"] == source["revision"]
        replay = run("--offline", "balance", "Assets", "--conversion", "USD")["data"]
        assert replay["assets"] == valued["assets"]
        exported = directory / "audit"
        run("--offline", "price", "export", "--output", str(exported))
        run("--offline", "check", file=exported / "main.bean")
        portable = run("--offline", "balance", "Assets", "--conversion", "USD", file=exported / "main.bean")["data"]
        assert portable["assets"] == valued["assets"]
        assert portable["price_sources"] == []
        assert ledger.read_text() == original
        # A deliberate local quote supersedes the exact latest managed date.
        latest = max(source["effective_dates"])
        ledger.write_text(original + f"{latest} price BTC 100 USD\n")
        override = run("--offline", "balance", "Assets", "--conversion", "USD")["data"]
        assert Decimal(override["assets"]["balance_children"]["USD"]) == Decimal("50")
        assert override["price_sources"][0]["shadowed_count"] >= 1
        record = {
            "_readme": (
                "Explicit authenticated CLI smoke. Run make live-prices or "
                "python scripts/live_prices.py --bea PATH. No login is required by the unit suite."
            ),
            "url": URL,
            "date": datetime.now(UTC).isoformat(),
            "status": "authenticated",
            "cli_version": refreshed["bea"],
            "installation": "installed" if args.bea else "checkout",
            "revision": source["revision"],
            "observed_at": source["observed_at"],
            "fetched_at": source["fetched_at"],
            "checks": [
                "authenticated-refresh",
                "check",
                "valuation",
                "offline-replay",
                "portable-export",
                "manual-precedence",
            ],
        }
        RECORD.write_text(json.dumps(record, indent=2) + "\n")
        print(json.dumps(record, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
