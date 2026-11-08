from __future__ import annotations

import os
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from cli.api.client import call, unwrap
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
from cli.engine import launch
from cli.errors import BeaError, UsageError
from cli.utils import ledger_name, owner_and_name, single_line, snake_keys

# Cap captured Git diagnostics so a noisy clone failure cannot flood JSON stderr.
_MAX_GIT_DIAGNOSTIC = 500


@dataclass
class LedgerInfo:
    name: str
    full_name: str
    http_url: str
    ssh_url: str
    private: bool
    record: dict[str, Any]
    """Every field the server returned, snake_cased — the JSON `data`, exactly as `show` emits it."""


def _to_info(lg: CreateLedgerResponse200 | GetLedgerResponse200) -> LedgerInfo:
    return LedgerInfo(
        name=lg.name,
        full_name=lg.full_name,
        http_url=lg.http_url,
        ssh_url=lg.ssh_url,
        private=lg.private,
        record=snake_keys(lg.to_dict()),
    )


def create_ledger(
    client: AuthenticatedClient,
    name: str,
    description: str | None = None,
    private: bool = False,
    preset: str | None = None,
    title: str | None = None,
    currency: str | None = None,
    date: str | None = None,
    modules: list[str] | None = None,
    property_name: str | None = None,
    property_module: str | None = None,
) -> LedgerInfo:
    # A requestId on every create (ADR026): if this request is retried in
    # flight with the same id, the server returns the original ledger
    # instead of creating a second one.
    from uuid import uuid4

    from cli.api.rest_client.models.create_ledger_body_setup_type_0 import CreateLedgerBodySetupType0
    from cli.api.rest_client.models.create_ledger_body_setup_type_0_modules_item import (
        CreateLedgerBodySetupType0ModulesItem,
    )
    from cli.api.rest_client.models.create_ledger_body_setup_type_0_modules_item_id import (
        CreateLedgerBodySetupType0ModulesItemId,
    )
    from cli.api.rest_client.models.create_ledger_body_setup_type_0_preset import (
        CreateLedgerBodySetupType0Preset,
    )
    from cli.api.rest_client.types import UNSET, Unset

    setup: CreateLedgerBodySetupType0 | Unset = UNSET
    if preset is not None:
        setup = CreateLedgerBodySetupType0(
            preset=CreateLedgerBodySetupType0Preset(preset),
            title=title if title is not None else UNSET,
            operating_currency=currency if currency is not None else UNSET,
            history_start=date if date is not None else UNSET,
            modules=[
                CreateLedgerBodySetupType0ModulesItem(
                    id=CreateLedgerBodySetupType0ModulesItemId(module_id),
                    property_name=property_name if module_id == property_module and property_name else UNSET,
                )
                for module_id in modules
            ]
            if modules
            else UNSET,
        )
    body = CreateLedgerBody(name=name, description=description, private=private, setup=setup, request_id=str(uuid4()))
    return _to_info(unwrap(call(create_ledger_op.sync_detailed, client=client, body=body)))


def get_ledger(client: AuthenticatedClient, full_name: str) -> LedgerInfo:
    owner, name = owner_and_name(full_name)
    return _to_info(unwrap(call(get_ledger_op.sync_detailed, owner, name, client=client)))


def ensure_git_available(use: str = "--clone") -> None:
    """Fail before any request when Git cannot be launched for a clone."""
    from cli.errors import UsageError

    if shutil.which("git") is None:
        raise UsageError(f"git executable not found on PATH; install Git before using {use}")


# SSH programs git drives with their own option syntax (git's `ssh.variant`);
# `-o BatchMode=yes` is OpenSSH's, so these are left as configured.
_NON_OPENSSH = {"plink", "putty", "tortoiseplink"}


def _ssh_command_in_effect(env: dict[str, str]) -> str:
    """The SSH command `git clone` would run, in git's own precedence order.

    `GIT_SSH_COMMAND`, then `core.sshCommand`, then the `GIT_SSH` program,
    then `ssh`. The config is read the way clone reads it: global, system and
    `-c`/`GIT_CONFIG_*` values, never the repository the caller stands in.
    """
    import subprocess

    if command := env.get("GIT_SSH_COMMAND"):
        return command
    try:
        configured = subprocess.run(
            ["git", f"--git-dir={os.devnull}", "config", "--get", "core.sshCommand"],
            env=env,
            capture_output=True,
            text=True,
            stdin=subprocess.DEVNULL,
            timeout=30,
        )
    except (OSError, subprocess.TimeoutExpired):
        configured = None
    if configured is not None and configured.returncode == 0 and configured.stdout.strip():
        return configured.stdout.strip()
    if program := env.get("GIT_SSH"):
        import shlex

        return shlex.quote(program)
    return "ssh"


def _ssh_program(command: str) -> str:
    """The SSH command's program name, as git's variant detection reads it."""
    import shlex

    try:
        words = shlex.split(command)
    except ValueError:
        words = command.split()
    return Path(words[0]).name.removesuffix(".exe").lower() if words else ""


def _git_env(*, unattended: bool) -> dict[str, str]:
    env = os.environ.copy()
    if not unattended:
        return env
    # BatchMode refuses host-key and password prompts so --no-input/--json never
    # hang on a PTY-owned ssh child (RFC-friendly for agents). It is appended
    # to the command git would use anyway: GIT_SSH_COMMAND outranks
    # core.sshCommand and GIT_SSH, so setting it to a bare `ssh` dropped the
    # user's key or agent wrapper in exactly these modes (w5/370).
    command = _ssh_command_in_effect(env)
    env["GIT_SSH_COMMAND"] = command if _ssh_program(command) in _NON_OPENSSH else f"{command} -o BatchMode=yes"
    env.setdefault("GIT_TERMINAL_PROMPT", "0")
    return env


def _sanitize_git_output(text: str, git_remote_url: str) -> str:
    cleaned = text.strip()
    if git_remote_url:
        cleaned = cleaned.replace(git_remote_url, "<remote>")
    if len(cleaned) > _MAX_GIT_DIAGNOSTIC:
        cleaned = cleaned[:_MAX_GIT_DIAGNOSTIC].rstrip() + "…"
    return cleaned


class UnsafeCloneSource(BeaError):
    """The server described a clone URL or directory name this CLI will not use.

    Both values come from the API, so a compromised server or a hostile
    `BEA_API_URL` controls them: a URL starting with `-` is parsed by git as an
    option (`--upload-pack=<command>` runs a local command), and a name such as
    `../x` or `.` would put the clone outside, or on top of, the current
    directory. Exit 1, as for any other unexpected server response.
    """


# `git@host:owner/name.git`: the scp-like form the service hands out. The user
# part is required so `ext::<command>`-style transports cannot match.
_SCP_LIKE_URL = re.compile(r"[A-Za-z0-9._-]+@[A-Za-z0-9][A-Za-z0-9.-]*:[^\s-]\S*")
_URL_SCHEMES = {"ssh", "https"}


def check_clone_url(git_remote_url: str) -> str:
    """The server's clone URL, if it is an `ssh://`, `https://` or `user@host:path` remote."""
    if _SCP_LIKE_URL.fullmatch(git_remote_url):
        return git_remote_url
    try:
        parts = urlsplit(git_remote_url)
        scheme, hostname = parts.scheme, parts.hostname
    except ValueError:
        scheme, hostname = "", None
    if scheme in _URL_SCHEMES and hostname and not hostname.startswith("-") and not re.search(r"\s", git_remote_url):
        return git_remote_url
    raise UnsafeCloneSource(
        f"Unexpected server response: the clone URL {single_line(git_remote_url)!r} is not an ssh://, "
        "https:// or user@host:path remote; refusing to pass it to git."
    )


def default_clone_dir(name: str) -> Path:
    """`./<name>` for a server-supplied ledger name, only when it is a valid ledger slug."""
    try:
        return Path.cwd() / ledger_name(name)
    except UsageError:
        raise UnsafeCloneSource(
            f"Unexpected server response: the ledger name {single_line(name)!r} is not a valid ledger name; "
            "refusing to use it as a directory. Pass --dir to choose one."
        ) from None


def refuse_occupied_clone_target(target: Path, *, nothing: str = "created") -> None:
    """Refuse a clone target `git clone` will refuse: a file, or a directory that is not empty."""
    if not (target.exists() or target.is_symlink()):
        return
    try:
        occupied = not target.is_dir() or any(target.iterdir())
    except OSError:
        occupied = True
    if occupied:
        raise UsageError(
            f"Clone target '{single_line(str(target))}' already exists and is not an empty directory; "
            f"nothing was {nothing}. Pass --dir to choose another, or move it aside."
        )


def clone_ledger(
    git_remote_url: str,
    target_dir: Path,
    *,
    quiet: bool = False,
    unattended: bool = False,
) -> None:
    """Clone the ledger's repository, keeping git's chatter off stdout when it is a JSON channel."""
    check_clone_url(git_remote_url)
    try:
        # Stopping `bea` stops git too, which then removes the half-made
        # directory itself; left running, it finished the clone and the
        # retry failed on an existing directory (w5/437).
        result = launch.run_captured(
            # `--` ends option parsing: the URL and directory are operands only.
            ["git", "clone", "--", git_remote_url, str(target_dir)],
            env=_git_env(unattended=unattended or quiet),
            stdin_closed=unattended or quiet,
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
