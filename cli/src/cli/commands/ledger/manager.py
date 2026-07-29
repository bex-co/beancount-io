from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path

from cli.api.gql_client import Client


@dataclass
class LedgerInfo:
    id: str
    name: str
    full_name: str
    http_url: str
    ssh_url: str
    private: bool
    empty: bool
    created_at: str
    updated_at: str


def create_ledger(
    client: Client,
    name: str,
    description: str | None = None,
    private: bool = False,
) -> LedgerInfo:
    result = client.create_ledger(name=name, description=description, private=private)
    lg = result.create_ledger
    return LedgerInfo(
        id=lg.id,
        name=lg.name,
        full_name=lg.full_name,
        http_url=lg.http_url,
        ssh_url=lg.ssh_url,
        private=lg.private,
        empty=lg.empty,
        created_at=lg.created_at,
        updated_at=lg.updated_at,
    )


def list_ledgers(client: Client, limit: int = 50, page: int = 1) -> list[LedgerInfo]:
    result = client.list_ledgers(limit=float(limit), page=float(page))
    return [
        LedgerInfo(
            id=lg.id,
            name=lg.name,
            full_name=lg.full_name,
            http_url=lg.http_url,
            ssh_url=lg.ssh_url,
            private=lg.private,
            empty=lg.empty,
            created_at=lg.created_at,
            updated_at=lg.updated_at,
        )
        for lg in result.list_ledgers
    ]


def get_ledger(client: Client, full_name: str) -> LedgerInfo:
    from cli.utils import full_name_to_ledger_id

    result = client.get_ledger(ledger_id=full_name_to_ledger_id(full_name))
    lg = result.get_ledger
    return LedgerInfo(
        id=lg.id,
        name=lg.name,
        full_name=lg.full_name,
        http_url=lg.http_url,
        ssh_url=lg.ssh_url,
        private=lg.private,
        empty=lg.empty,
        created_at=lg.created_at,
        updated_at=lg.updated_at,
    )


def delete_ledger(client: Client, full_name: str) -> str:
    from cli.utils import full_name_to_ledger_id

    result = client.delete_ledger(ledger_id=full_name_to_ledger_id(full_name))
    return result.delete_ledger.ledger_id


def clone_ledger(git_remote_url: str, target_dir: Path) -> None:
    result = subprocess.run(["git", "clone", git_remote_url, str(target_dir)])
    if result.returncode != 0:
        raise CloneError(git_remote_url)


class CloneError(Exception):
    def __init__(self, git_remote_url: str) -> None:
        self.git_remote_url = git_remote_url
        super().__init__(git_remote_url)
