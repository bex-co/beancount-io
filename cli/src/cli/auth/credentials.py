from __future__ import annotations

import json
import os
import stat
from dataclasses import dataclass
from datetime import UTC, datetime

from cli.config import config_dir, credentials_path
from cli.errors import AuthError

ENVIRONMENT = "environment"
FILE = "file"


@dataclass
class Credentials:
    token: str
    expire_at: str | None
    source: str = FILE

    def is_expired(self) -> bool:
        # A token supplied by the environment carries no expiry we can read; the
        # server is the authority on it, so we do not pre-emptively reject it.
        if self.expire_at is None:
            return False
        try:
            return datetime.fromisoformat(self.expire_at) < datetime.now(tz=UTC)
        except ValueError:
            return True


def save_credentials(token: str, expire_at: str) -> None:
    # Create the file as 0600 inside a 0700 directory from the start — a
    # write-then-chmod sequence leaks the token under a permissive umask.
    directory = config_dir()
    path = credentials_path()
    directory.mkdir(parents=True, exist_ok=True)
    directory.chmod(stat.S_IRWXU)
    payload = json.dumps({"token": token, "expireAt": expire_at}, indent=2)
    tmp_path = path.with_name(path.name + ".tmp")
    tmp_path.unlink(missing_ok=True)
    fd = os.open(tmp_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, stat.S_IRUSR | stat.S_IWUSR)
    try:
        with os.fdopen(fd, "w") as fh:
            fh.write(payload)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_path, path)
    finally:
        tmp_path.unlink(missing_ok=True)


def load_credentials() -> Credentials | None:
    """Return the active credential: `$BEA_TOKEN` if set, otherwise the stored one.

    An unattended job exports `BEA_TOKEN` and never touches the disk, so a CI
    runner needs no browser ceremony and leaves no credential behind.
    """
    token = os.environ.get("BEA_TOKEN")
    if token:
        return Credentials(token=token, expire_at=None, source=ENVIRONMENT)
    try:
        data = json.loads(credentials_path().read_text())
        return Credentials(token=data["token"], expire_at=data["expireAt"], source=FILE)
    except Exception:
        return None


def clear_credentials() -> None:
    try:
        credentials_path().unlink()
    except FileNotFoundError:
        pass


def require_credentials() -> Credentials:
    creds = load_credentials()
    if creds is None:
        raise AuthError("Not logged in. Run 'bea cloud login', or set BEA_TOKEN.")
    if creds.is_expired():
        raise AuthError("Session expired. Run 'bea cloud login' to re-authenticate.")
    return creds
