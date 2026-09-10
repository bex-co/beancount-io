from __future__ import annotations

import os
import shutil
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

# Cap captured Git diagnostics so a noisy clone failure cannot flood JSON stderr.
_MAX_GIT_DIAGNOSTIC = 500


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


def ensure_git_available() -> None:
    """Fail before a remote mutation when Git cannot be launched for --clone."""
    from cli.errors import UsageError

    if shutil.which("git") is None:
        raise UsageError("git executable not found on PATH; install Git before using --clone")


def _git_env(*, unattended: bool) -> dict[str, str]:
    env = os.environ.copy()
    if not unattended:
        return env
    # BatchMode refuses host-key and password prompts so --no-input/--json never
    # hang on a PTY-owned ssh child (RFC-friendly for agents).
    existing = env.get("GIT_SSH_COMMAND", "ssh")
    env["GIT_SSH_COMMAND"] = f"{existing} -o BatchMode=yes"
    env.setdefault("GIT_TERMINAL_PROMPT", "0")
    return env


def _sanitize_git_output(text: str, git_remote_url: str) -> str:
    cleaned = text.strip()
    if git_remote_url:
        cleaned = cleaned.replace(git_remote_url, "<remote>")
    if len(cleaned) > _MAX_GIT_DIAGNOSTIC:
        cleaned = cleaned[:_MAX_GIT_DIAGNOSTIC].rstrip() + "…"
    return cleaned


def clone_ledger(
    git_remote_url: str,
    target_dir: Path,
    *,
    quiet: bool = False,
    unattended: bool = False,
) -> None:
    """Clone the ledger's repository, keeping git's chatter off stdout when it is a JSON channel."""
    try:
        result = subprocess.run(
            ["git", "clone", git_remote_url, str(target_dir)],
            capture_output=True,
            text=True,
            env=_git_env(unattended=unattended or quiet),
        )
    except OSError as exc:
        raise CloneError(
            git_remote_url,
            diagnostic=f"could not start git ({exc})",
        ) from exc
    if result.returncode != 0:
        diagnostic = _sanitize_git_output(
            "\n".join(part for part in (result.stderr, result.stdout) if part),
            git_remote_url,
        )
        raise CloneError(git_remote_url, diagnostic=diagnostic or None)


class CloneError(Exception):
    def __init__(self, git_remote_url: str, *, diagnostic: str | None = None) -> None:
        self.git_remote_url = git_remote_url
        self.diagnostic = diagnostic
        super().__init__(diagnostic or git_remote_url)
