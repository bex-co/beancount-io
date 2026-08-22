#!/usr/bin/env python3
"""Capture the pre-Rustledger FastAPI endpoint responses for the shadow corpus.

Run this with the deleted Python service checked out at the commit recorded in
the output. The app itself serves every request; only its external clients are
replaced, exactly as in the old service's endpoint tests.
"""

from __future__ import annotations

import argparse
import base64
import json
import subprocess
import sys
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--oracle-root", required=True, type=Path)
    parser.add_argument("--fixture-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def portable(value: Any, fixture_root: Path) -> Any:
    if isinstance(value, str):
        prefix = f"{fixture_root}/"
        return value.replace(prefix, "") if value.startswith(prefix) else value
    if isinstance(value, dict):
        return {key: portable(item, fixture_root) for key, item in value.items()}
    if isinstance(value, list):
        return [portable(item, fixture_root) for item in value]
    return value


def canonical(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: canonical(value[key]) for key in sorted(value)}
    if isinstance(value, list):
        return [canonical(item) for item in value]
    return value


def main() -> None:
    args = parse_args()
    oracle_root = args.oracle_root.resolve()
    fixture_root = args.fixture_root.resolve()
    server_root = oracle_root / "server"
    fava_root = oracle_root / "fava-slim"
    sys.path[:0] = [str(server_root), str(fava_root)]

    from beancount import loader
    from fastapi.testclient import TestClient
    from fava.ledger import FavaLedger
    from gitea_py import ApiClient

    from app.clients.backend_v2 import BackendV2Client
    from app.clients.fava import FavaClient
    from app.clients.gitea_hooks import GiteaHookInstaller
    from app.clients.http import HTTPClient
    from app.core.config import Settings
    from app.deps.clients import (
        get_api_client_from_state,
        get_backend_v2_client_from_state,
        get_fava_ledger_client_from_state,
        get_gitea_hook_installer_from_state,
        get_http_client_from_state,
    )
    from app.deps.config import get_settings_from_state
    from main import server

    entries, errors, options = loader.load_file(str(fixture_root / "main.bean"))
    if errors:
        raise RuntimeError(f"Oracle fixture does not parse cleanly: {errors!r}")
    ledger = FavaLedger(entries, errors, options)

    settings = MagicMock(spec=Settings)
    settings.gitea_base_url = "http://test-gitea.local"
    settings.gitea_username = "test_user"
    settings.gitea_password = "test_password"
    settings.gitea_admin_token = "test_token"
    settings.WEBHOOK_TOKEN = "shadow-token"
    api_client = MagicMock(spec=ApiClient)
    api_client.configuration = MagicMock()
    fava_client = MagicMock(spec=FavaClient)
    fava_client.get_ledger.return_value = ledger

    def fixed(value: Any):
        def dependency() -> Any:
            return value

        return dependency

    server.dependency_overrides.update(
        {
            get_settings_from_state: fixed(settings),
            get_api_client_from_state: fixed(api_client),
            get_fava_ledger_client_from_state: fixed(fava_client),
            get_http_client_from_state: fixed(MagicMock(spec=HTTPClient)),
            get_gitea_hook_installer_from_state: fixed(MagicMock(spec=GiteaHookInstaller)),
            get_backend_v2_client_from_state: fixed(MagicMock(spec=BackendV2Client)),
        }
    )

    auth = base64.b64encode(b"test_user:test_password").decode()
    headers = {"Authorization": f"Basic {auth}"}
    base = "/reports/alice/shadow"
    requests = {
        "getLedgerAttributes": (f"{base}/attributes", {}),
        "getLedgerOptions": (f"{base}/options", {}),
        "getLedgerFavaOptions": (f"{base}/fava-options", {}),
        "getLedgerBcioOptions": (f"{base}/beancountio-options", {}),
        "getLedgerPlugins": (f"{base}/plugins", {}),
        "getLedgerSourceFiles": (f"{base}/source-files", {}),
        "getLedgerCommodities": (f"{base}/commodities", {}),
        "getLedgerPayeeTransactions": (f"{base}/payee-transactions", {"payee": "Cafe"}),
        "getLedgerNarrationTransactions": (f"{base}/narration-transactions", {"narration": "Lunch"}),
        "getLedgerPayeeAccounts": (f"{base}/payee-accounts", {"payee": "Cafe"}),
        "getLedgerEvents": (f"{base}/events", {"time": "2024"}),
        "getLedgerDocuments": (f"{base}/documents", {"time": "2024"}),
        "getLedgerPayees": (f"{base}/payees", {}),
        "getLedgerNarrations": (f"{base}/narrations", {}),
        "getLedgerAccounts": (f"{base}/accounts", {}),
        "getLedgerLinks": (f"{base}/links", {}),
        "getLedgerYears": (f"{base}/years", {}),
        "getLedgerCurrencies": (f"{base}/currencies", {}),
        "getLedgerTags": (f"{base}/tags", {}),
        "getLedgerErrors": (f"{base}/errors", {}),
        "getLedgerAccountLastEntries": (f"{base}/account_last_entries", {"time": "2024"}),
        "getLedgerEntriesCountPerType": (f"{base}/entries_count_per_type", {"time": "2024"}),
        "getLedgerHierarchy": (
            f"{base}/hierarchy",
            {"account_name": "Actifs", "conversion": "USD"},
        ),
        "getLedgerIntervalTotals": (
            f"{base}/interval-totals",
            {"account_name": "Depenses", "conversion": "USD", "interval": "month", "time": "2024"},
        ),
        "getLedgerAccountReport": (
            f"{base}/account_report",
            {"account_name": "Actifs", "conversion": "USD", "interval": "month", "time": "2024"},
        ),
        "getLedgerOverview": (f"{base}/overview", {"conversion": "USD", "interval": "month", "time": "2024"}),
        "getLedgerIncomeStatement": (
            f"{base}/income-statement",
            {"conversion": "USD", "interval": "month", "time": "2024"},
        ),
        "getLedgerBalanceSheet": (
            f"{base}/balance-sheet",
            {"conversion": "USD", "interval": "month", "time": "2024"},
        ),
        "getLedgerTrialBalance": (f"{base}/trial-balance", {"conversion": "USD", "time": "2024"}),
        "getJournal": ("/journal/alice/shadow", {"time": "2024", "limit": 100}),
        "plaintextJournal": ("/journal/alice/shadow/plaintext", {"time": "2024"}),
        "getAccountJournal": (
            "/journal/alice/shadow/account-journal",
            {"account": "Actifs:Cash", "conversion": "units", "time": "2024", "limit": 100},
        ),
        "queryShell": (
            "/shell/alice/shadow/query",
            {"query": "SELECT date, account, number WHERE account ~ 'Depenses' ORDER BY date"},
        ),
        "queryShellText": (
            "/shell/alice/shadow/query-text",
            {"query": "SELECT date, account, number WHERE account ~ 'Depenses' ORDER BY date"},
        ),
    }

    responses: dict[str, Any] = {}
    with TestClient(server) as client:
        for operation, (path, params) in requests.items():
            response = client.get(path, params=params, headers=headers)
            if response.status_code != 200:
                raise RuntimeError(f"{operation} returned {response.status_code}: {response.text}")
            body = response.json()
            responses[operation] = body["data"]

    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=oracle_root, text=True
    ).strip()
    artifact = canonical(portable(
        {
            "schema_version": 1,
            "oracle": {"commit": commit, "service": "backend-cluster/beancount-ledger"},
            "responses": responses,
        },
        fixture_root,
    ))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")
    server.dependency_overrides.clear()
    print(f"Captured {len(responses)} endpoint responses from {commit}")


if __name__ == "__main__":
    main()
