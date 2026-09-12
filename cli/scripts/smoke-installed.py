"""Customer workflow checks against an installed bea executable; standard library only."""

from __future__ import annotations

import csv
import json
import os
import re
import stat
import subprocess
import sys
import tempfile
from decimal import Decimal
from pathlib import Path


def _frontend_python(binary: Path) -> Path | None:
    """Interpreter that runs the installed frontend, when the shim exposes one."""
    try:
        text = binary.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    if text.startswith("#!"):
        first = text.splitlines()[0][2:].strip()
        candidate = Path(first.split()[0])
        if candidate.name.startswith("python") and candidate.exists():
            return candidate
    for line in text.splitlines():
        match = re.search(r'exec\s+"([^"]+/venv/bin/bea)"', line)
        if match:
            nested = Path(match.group(1))
            return _frontend_python(nested) if nested.exists() else None
    sibling = binary.parent / ("python.exe" if os.name == "nt" else "python")
    return sibling if sibling.exists() else None


def smoke(binary: Path, directory: Path) -> None:
    directory = directory.resolve()
    env = dict(
        os.environ,
        BEA_CONFIG_DIR=str(directory / "config"),
        XDG_CONFIG_HOME=str(directory / "xdg-config"),
        XDG_CACHE_HOME=str(directory / "xdg-cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
    )
    # PyPI first-use provisioning lands under XDG_DATA_HOME. Homebrew sets
    # BEA_ENGINE_DIR to the keg-local engine and must keep that install-time path.
    if "BEA_ENGINE_DIR" not in env:
        env["XDG_DATA_HOME"] = str(directory / "xdg-data")
    env.pop("BEA_FILE", None)
    # Conflicting global bean-* tools on PATH must never answer (ADR014).
    fake_bin = directory / "fake-path-bin"
    fake_bin.mkdir()
    for name in ("bean-check", "bean-format", "bean-query", "bean-doctor", "bean-example", "treeify"):
        decoy = fake_bin / name
        decoy.write_text("#!/bin/sh\necho DECOY >&2\nexit 99\n")
        decoy.chmod(decoy.stat().st_mode | stat.S_IXUSR)
    env["PATH"] = f"{fake_bin}{os.pathsep}{env.get('PATH', '')}"
    commands = 0

    def run(*args: str, exit_code: int = 0, json_output: bool = True, timeout: int = 120):
        nonlocal commands
        commands += 1
        completed = subprocess.run(
            [str(binary), *(["--json"] if json_output else []), "--no-input", *args],
            cwd=directory,
            env=env,
            text=True,
            capture_output=True,
            timeout=timeout,
        )
        assert completed.returncode == exit_code, (args, completed.stdout, completed.stderr)
        result = completed.stdout if exit_code == 0 else completed.stderr
        return json.loads(result) if json_output else result

    version = subprocess.run([str(binary), "--version"], env=env, capture_output=True, text=True, check=True)
    assert version.stdout.startswith("bea ")
    run("init", "books", "--currency", "USD", "--date", "2026-08-01", "--opening-balance", "Assets:Checking 1000")
    file = directory / "books/main.bean"
    target = ("--file", str(file))
    # First engine-touching command: may download+hash-pin on a clean PyPI install.
    run(*target, "check", timeout=300)
    for account, number in (("Income:Salary", "-100"), ("Expenses:Dining", "25")):
        run(
            *target,
            "add",
            "transaction",
            "--date",
            "2026-08-02",
            "--narration",
            "Smoke transaction",
            "-p",
            f"{account} {number} USD",
            "-p",
            f"Assets:Checking {-Decimal(number)} USD",
        )
    result = run(*target, "query", "SELECT sum(number) WHERE account = 'Expenses:Dining'")
    assert Decimal(result["data"]["rows"][0][0]) == 25
    result = run(*target, "report", "income-statement", "--time", "2026-08")
    assert Decimal(result["data"]["net_profit"]["USD"]) == 75
    result = run(*target, "report", "balance-sheet", "--time", "2026-08")
    assert Decimal(result["data"]["net_worth"]["USD"]) == 1075
    assert Decimal(result["data"]["equity_total"]["USD"]) == -1075
    original = file.read_bytes()
    run(
        *target,
        "add",
        "transaction",
        "--date",
        "2026-08-03",
        "-p",
        "Assets:Checking -5 USD",
        "-p",
        "Expenses:Dining 4 USD",
        exit_code=1,
    )
    assert file.read_bytes() == original
    config = Path(__file__).with_name("csv_importers.py")
    if not config.exists():
        config = Path(__file__).resolve().parents[1] / "docs/examples/csv_importers.py"
    source = directory / "bank.csv"
    untrusted = 'Coffee"\r\n2026-01-01 open Assets:Evil USD ;"'
    normalized = 'Coffee" 2026-01-01 open Assets:Evil USD ;"'
    with source.open("w", newline="") as stream:
        csv.writer(stream).writerows(
            [
                ["Date", "Payee", "Narration", "Amount", "Currency", "Category", "BankID"],
                ["2026-08-03", "Cafe", untrusted, "-5.25", "USD", "Expenses:Dining", "bank-001"],
            ]
        )
    importing = (*target, "import", str(source), "--config", str(config))
    preview = run(*importing)["data"]
    assert preview["ready"] == 1 and preview["rows"][0]["narration"] == normalized
    assert file.read_bytes() == original
    assert run(*importing, "--apply")["data"]["written"] == 1
    assert not any(line.startswith("2026-01-01 open Assets:Evil") for line in file.read_text().splitlines())
    imported = file.read_bytes()
    assert run(*importing, "--apply")["data"]["written"] == 0
    assert file.read_bytes() == imported
    run(*target, "add", "open", "--date", "2026-08-01", "--account", "Assets:Stock", "--currency", "AAPL")
    investment = directory / "investment.json"
    investment.write_text(
        json.dumps(
            [
                {
                    "date": "2026-08-04",
                    "postings": [
                        {
                            "account": "Assets:Stock",
                            "units": {"number": "1", "currency": "AAPL"},
                            "cost": {"number": "100", "currency": "USD"},
                        },
                        {"account": "Assets:Checking", "units": {"number": "-100", "currency": "USD"}},
                    ],
                }
            ]
        )
    )
    run(*target, "add", "transactions", "--from", str(investment))
    run(*target, "add", "price", "--date", "2026-08-31", "--currency", "AAPL", "--amount", "150 USD")
    valued = run(*target, "report", "balance-sheet", "--time", "2026-08")["data"]
    assert Decimal(valued["net_worth"]["USD"]) == Decimal("1119.75")
    assert Decimal(valued["valuation_adjustment"]["USD"]) == -50
    comment = 'A "quoted" café receipt \\ path'
    run(*target, "add", "note", "--date", "2026-08-03", "--account", "Assets:Checking", "--comment", comment)
    assert run(*target, "list", "note")["data"][0]["comment"] == comment
    run("format", str(file), "--in-place")
    run(*target, "check")
    run(
        "init",
        "euro.beancount",
        "--currency",
        "EUR",
        "--date",
        "2026-08-01",
        "--opening-balance",
        "Assets:Checking 1000",
    )
    euro = ("--file", str(directory / "euro.beancount"))
    run(*euro, "report", "balance-sheet", "--conversion", "USD", exit_code=1)
    result = run(*euro, "report", "balance-sheet", "--conversion", "USD", "--allow-errors")
    assert result["data"]["net_worth"] == {"USD": None}
    # Exercise the root/destination split, native posting parser, precision,
    # and changed-bank-ID review in the actual dependency environment.
    run("init", "split", "--currency", "USD", "--date", "2026-08-01")
    split = directory / "split/main.bean"
    (split.parent / "accounts.bean").write_bytes(split.read_bytes())
    entries = split.parent / "2026.bean"
    entries.write_text("")
    split.write_text('include "accounts.bean"\ninclude "2026.bean"\n')
    split_target = ("--file", str(split))
    before = split.read_bytes()
    run(
        *split_target,
        "add",
        "balance",
        "--into",
        "2026.bean",
        "--date",
        "2026-08-02",
        "--account",
        "Assets:Checking",
        "--amount",
        "1000 USD",
        "--pad-from",
        "Equity:OpeningBalances",
    )
    run(
        *split_target,
        "add",
        "transaction",
        "--into",
        "2026.bean",
        "--date",
        "2026-08-03",
        "-p",
        "Expenses:Groceries 82.35",
        "-p",
        "Assets:Checking",
    )
    run(
        *split_target,
        "add",
        "transaction",
        "--into",
        "2026.bean",
        "--date",
        "2026-08-04",
        "-p",
        "Expenses:Groceries 1",
        "-p",
        "Assets:Checking",
    )
    text = run(*split_target, "query", "SELECT sum(position) WHERE account = 'Expenses:Groceries'", json_output=False)
    assert "83.35 USD" in text
    # Appending a wider posting preserves existing bytes, so older balance
    # lines may need realignment. Explicit formatting must then be idempotent.
    run("format", str(entries), "--in-place")
    assert run("format", str(entries), "--check")["data"]["formatted"] == []
    assert split.read_bytes() == before
    newest = run(*split_target, "list", "transaction", "-a", "checking", "--limit", "1")["data"][0]
    assert newest["date"] == "2026-08-04"
    importing = (*split_target, "import", str(source), "--into", "2026.bean")
    assert run(*importing, "--config", str(config), "--apply")["data"]["written"] == 1
    source.write_text(source.read_text().replace("bank-001", "regenerated-bank-id"))
    before = entries.read_bytes()
    assert run(*importing, "--apply", exit_code=4)["error"]["result"]["possible_duplicates"] == 1
    assert "Import needs review; nothing was written" in run(*importing, "--apply", exit_code=4, json_output=False)
    assert entries.read_bytes() == before
    assert run(*importing, "--apply", "--duplicates", "skip")["data"]["written"] == 0
    assert entries.read_bytes() == before
    assert not list(directory.rglob("*.bea.lock"))
    run(*split_target, "check")
    # Dated FX diagnostics, idempotent prices, native entry ergonomics and
    # permission checks must also work in the installed base environment.
    valued = directory / "valuation.bean"
    valued.write_text("""2026-01-01 open Assets:Checking EUR
2026-01-01 open Equity:OpeningBalances EUR
2026-01-01 open Expenses:Food EUR
2026-01-02 * "Opening"
  Assets:Checking 100 EUR
  Equity:OpeningBalances -100 EUR
2026-06-01 price EUR 1.10 USD
""")
    valued_target = ("--file", str(valued))
    report = (*valued_target, "report", "overview", "-x", "USD", "--time", "2026-01 - 2026-06")
    error = run(*report, exit_code=1)["error"]
    assert error["result"]["missing_prices"] == [{"from": "EUR", "to": "USD"}]
    assert error["result"]["missing_price_dates"][0]["date"] == "2026-01-31"
    run(*valued_target, "add", "price", "--date", "2026-01-31", "--currency", "EUR", "--amount", "1.05 USD")
    assert run(*report)["data"]["valuation"] == "complete"
    before = valued.read_bytes()
    repeated = run(*valued_target, "add", "price", "--date", "2026-06-01", "--currency", "EUR", "--amount", "1.100 USD")
    assert repeated["data"]["written"] == 0 and valued.read_bytes() == before
    run(
        *valued_target,
        "add",
        "transaction",
        "--date",
        "2026-06-02",
        "--flag",
        "!",
        "--meta",
        "receipt:R-42",
        "--meta",
        f"note:{untrusted}",
        "--payee",
        untrusted,
        "-p",
        "Assets:Checking -5 EUR",
        "-p",
        "Expenses:Food",
    )
    flagged = run(*valued_target, "list", "transaction", "--flag", "!", "--limit", "1")["data"]
    assert len(flagged) == 1 and flagged[0]["meta"]["receipt"] == "R-42"
    assert flagged[0]["payee"] == flagged[0]["meta"]["note"] == normalized
    balance = run(
        *valued_target,
        "add",
        "balance",
        "--date",
        "2026-06-03",
        "--account",
        "Assets:Checking",
        "--amount",
        "95.5 ~ 1 EUR",
    )
    assert balance["data"]["directive"]["tolerance"] == "1"
    before = valued.read_bytes()
    valued.chmod(0o444)
    try:
        if os.name != "nt":  # POSIX mode bits do not model Windows ACLs.
            run(
                *valued_target,
                "add",
                "price",
                "--date",
                "2026-06-02",
                "--currency",
                "EUR",
                "--amount",
                "1.20 USD",
                exit_code=3,
            )
            assert valued.read_bytes() == before and valued.stat().st_mode & 0o777 == 0o444
    finally:
        valued.chmod(0o600)
    formatting = directory / "formatting.bean"
    formatting.write_text('2026-01-01 * "Food"\n Assets:Cash -1 USD\n Expenses:Food 1 USD\n')
    before = formatting.read_bytes()
    assert run("format", str(formatting), "--check", exit_code=1)["error"]["result"]["formatted"] == [str(formatting)]
    assert formatting.read_bytes() == before
    run("format", str(formatting), "--in-place")
    assert run("format", str(formatting), "--check")["data"]["formatted"] == []
    # bean-format does not parse ledgers; invalid account names are not rejected.
    formatting.write_text("2026-01-01 open assets:lower USD\n")
    assert run("format", str(formatting), "--check")["data"]["formatted"] == []
    run("format", str(formatting), "--in-place")
    bad_number = run(
        *valued_target, "add", "transaction", "-p", "Assets:Checking -1e3 EUR", "-p", "Expenses:Food", exit_code=2
    )
    assert "decimal notation" in bad_number["error"]["message"] and "<string>" not in json.dumps(bad_number)
    bad_account = run(*valued_target, "add", "open", "--date", "2026-01-01", "-a", "assets:lower", exit_code=2)
    assert "Account names" in bad_account["error"]["message"]
    before = file.read_bytes()
    bad_pad = run(
        *target,
        "add",
        "pad",
        "--date",
        "2026-08-05",
        "-a",
        "Assets:Checking",
        "--source",
        "Equity:Opening-Balances",
        "--allow-errors",
        exit_code=1,
    )
    assert "Pad accounts must be active, even with --allow-errors." in bad_pad["error"]["details"]
    assert file.read_bytes() == before
    prices = run(*valued_target, "list", "price", "--currency", "eur")["data"]
    assert len(prices) == 2 and all(price["currency"] == "EUR" for price in prices)
    unusual = run("init", "custom-currency", "--currency", "US", "--date", "2026-01-01")["data"]
    assert unusual["currency"] == "US" and unusual["warnings"]
    table = run(*valued_target, "list", "transaction", "--account", "checking", "--flag", "!", json_output=False)
    assert "MATCHING POSTING AMOUNTS" in table and "(no narration)" in table
    assert "#compdef" in run("--shell", "zsh", "--show-completion", json_output=False)
    # Six native commands: doctor / example / treeify (check/format/query already above).
    options = run("doctor", "list-options", json_output=False)
    assert 'option "title"' in options and "DECOY" not in options
    printed = run("doctor", "print-options", str(file), json_output=False)
    assert "account_previous_balances" in printed or "operating_currency" in printed
    lexed = run("doctor", "lex", str(file), json_output=False)
    assert "OPEN" in lexed and "ACCOUNT" in lexed
    example_out = directory / "example.bean"
    run(
        "example",
        "--date-begin",
        "2020-01-01",
        "--date-end",
        "2020-03-01",
        "--seed",
        "1",
        "-o",
        str(example_out),
        json_output=False,
        timeout=180,
    )
    assert example_out.is_file() and example_out.stat().st_size > 0
    run("--file", str(example_out), "check")
    tree_in = directory / "treeify-in.txt"
    tree_in.write_text("Assets:US:Bank:Checking  100 USD\nAssets:US:Bank:Savings   200 USD\n")
    tree = run("treeify", str(tree_in), json_output=False)
    assert "Assets" in tree and "Checking" in tree and "DECOY" not in tree
    # ask needs the optional [ask] extra + hosted credentials. Base installs
    # stop at the missing-extra gate (2); installs with [ask] stop at auth (3).
    ask = subprocess.run(
        [str(binary), "--no-input", *target, "ask", "What is my cash balance?"],
        cwd=directory,
        env=env,
        text=True,
        capture_output=True,
        timeout=120,
    )
    commands += 1
    assert ask.returncode in (2, 3), (ask.stdout, ask.stderr)
    ask_err = ask.stderr
    assert "optional AI" in ask_err or "BEA_TOKEN" in ask_err or "Not logged in" in ask_err or "cloud login" in ask_err
    # Frontend isolation + license materials on the installed interpreter.
    frontend_python = _frontend_python(binary)
    if frontend_python is not None:
        probe = subprocess.run(
            [
                str(frontend_python),
                "-c",
                "import importlib.metadata as m, importlib.util as u, sys\n"
                "reqs = m.requires('beancount-io') or []\n"
                "runtime = [r for r in reqs if 'extra ==' not in r]\n"
                "forbidden = [name for name in ('beancount', 'beanquery', 'fava', 'bea_engine')\n"
                "             if any(r.split()[0].split('>=')[0].split('==')[0] == name for r in runtime)]\n"
                "assert not forbidden, forbidden\n"
                "engine_specs = {name: u.find_spec(name) is not None\n"
                "                for name in ('beancount', 'beanquery', 'fava', 'bea_engine')}\n"
                "print(','.join(k for k, v in engine_specs.items() if v))\n",
            ],
            capture_output=True,
            text=True,
            env=env,
            timeout=60,
        )
        assert probe.returncode == 0, (probe.stdout, probe.stderr)
        # Customer artifacts must not ship the engine stack in the frontend venv.
        # Dev/checkouts keep Beancount in the same interpreter for the test suite.
        if "site-packages" in str(frontend_python.resolve()) or "venv" in str(frontend_python.resolve()):
            loaded = {name for name in probe.stdout.strip().split(",") if name}
            # Only enforce import rejection when none of the engine packages are present.
            if not loaded:
                assert probe.stdout.strip() == ""
    # Engine env: Homebrew (BEA_ENGINE_DIR) or PyPI first-use under XDG_DATA_HOME.
    engine_dir = env.get("BEA_ENGINE_DIR")
    if engine_dir:
        engine_root = Path(engine_dir)
    else:
        data_home = Path(env["XDG_DATA_HOME"])
        engines = list((data_home / "bea" / "engine").glob("*"))
        engines = [path for path in engines if path.is_dir() and not path.name.startswith(".")]
        # Checkout installs may use the in-tree engine without provisioning.
        engine_root = engines[0] if engines else None
    if engine_root is not None and engine_root.is_dir():
        assert any(engine_root.glob("bin/bean-check")) or any(engine_root.glob("Scripts/bean-check.exe"))
        notices = list(engine_root.glob("lib/python*/site-packages/bea_engine/NOTICE.fava"))
        assert notices, f"engine NOTICE.fava missing under {engine_root}"
        assert "Fava" in notices[0].read_text(encoding="utf-8")
        # Offline reuse: a second check must not need the network or uv downloads.
        offline_env = dict(env, UV_OFFLINE="1", http_proxy="http://127.0.0.1:9", HTTPS_PROXY="http://127.0.0.1:9")
        offline = subprocess.run(
            [str(binary), "--json", "--no-input", *target, "check"],
            cwd=directory,
            env=offline_env,
            text=True,
            capture_output=True,
            timeout=60,
        )
        assert offline.returncode == 0, (offline.stdout, offline.stderr)
        commands += 1
    run("unknown-command", exit_code=2)
    run("--file", exit_code=2)
    print(f"Installed CLI smoke passed: {commands + 1} commands ({version.stdout.strip()}).")


if __name__ == "__main__":
    with tempfile.TemporaryDirectory(prefix="bea-smoke-") as work:
        smoke(Path(sys.argv[1]).resolve(), Path(work))
