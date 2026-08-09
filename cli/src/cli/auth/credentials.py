from __future__ import annotations

import json
import os
import stat
from dataclasses import dataclass
from datetime import UTC, datetime

from cli.config import CREDENTIALS_DIR, CREDENTIALS_PATH


@dataclass
class Credentials:
    token: str
    expire_at: str

    def is_expired(self) -> bool:
        try:
            return datetime.fromisoformat(self.expire_at) < datetime.now(tz=UTC)
        except ValueError:
            return True


def save_credentials(token: str, expire_at: str) -> None:
    # Create the file as 0600 inside a 0700 directory from the start — a
    # write-then-chmod sequence leaks the token under a permissive umask.
    CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
    CREDENTIALS_DIR.chmod(stat.S_IRWXU)
    payload = json.dumps({"token": token, "expireAt": expire_at}, indent=2)
    tmp_path = CREDENTIALS_PATH.with_name(CREDENTIALS_PATH.name + ".tmp")
    tmp_path.unlink(missing_ok=True)
    fd = os.open(tmp_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, stat.S_IRUSR | stat.S_IWUSR)
    try:
        with os.fdopen(fd, "w") as fh:
            fh.write(payload)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_path, CREDENTIALS_PATH)
    finally:
        tmp_path.unlink(missing_ok=True)


def load_credentials() -> Credentials | None:
    try:
        data = json.loads(CREDENTIALS_PATH.read_text())
        return Credentials(token=data["token"], expire_at=data["expireAt"])
    except Exception:
        return None


def clear_credentials() -> None:
    try:
        CREDENTIALS_PATH.unlink()
    except FileNotFoundError:
        pass


def require_credentials() -> Credentials:
    creds = load_credentials()
    if creds is None:
        raise RuntimeError("Not logged in. Run 'beancount auth login' first.")
    if creds.is_expired():
        raise RuntimeError("Session expired. Run 'beancount auth login' to re-authenticate.")
    return creds
