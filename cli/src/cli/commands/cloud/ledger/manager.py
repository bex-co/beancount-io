from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path

from cli.api.client import unwrap
from cli.api.rest_client.api.ledger_v_1 import (
    create_ledger as create_ledger_op,
)
from cli.api.rest_client.api.ledger_v_1 import (
    get_ledger as get_ledger_op,
)
from cli.api.rest_client.client import AuthenticatedClient
from cli.api.rest_client.models.create_ledger_body import CreateLedgerBody
from cli.api.rest_client.models.create_ledger_response_200 import CreateLedgerResponse200
from cli.api.rest_client.models.get_ledger_response_200 import GetLedgerResponse200
from cli.utils import owner_and_name


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


def _to_info(lg: CreateLedgerResponse200 | GetLedgerResponse200) -> LedgerInfo:
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


def create_ledger(
    client: AuthenticatedClient,
    name: str,
    description: str | None = None,
    private: bool = False,
) -> LedgerInfo:
    body = CreateLedgerBody(name=name, description=description, private=private)
    return _to_info(unwrap(create_ledger_op.sync_detailed(client=client, body=body)))


def get_ledger(client: AuthenticatedClient, full_name: str) -> LedgerInfo:
    owner, name = owner_and_name(full_name)
    return _to_info(unwrap(get_ledger_op.sync_detailed(owner, name, client=client)))


def clone_ledger(git_remote_url: str, target_dir: Path, *, quiet: bool = False) -> None:
    """Clone the ledger's repository, keeping git's chatter off stdout when it is a JSON channel."""
    result = subprocess.run(["git", "clone", git_remote_url, str(target_dir)], capture_output=quiet)
    if result.returncode != 0:
        raise CloneError(git_remote_url)


class CloneError(Exception):
    def __init__(self, git_remote_url: str) -> None:
        self.git_remote_url = git_remote_url
        super().__init__(git_remote_url)
