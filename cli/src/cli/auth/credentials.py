from __future__ import annotations

import json
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
    CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
    CREDENTIALS_PATH.write_text(json.dumps({"token": token, "expireAt": expire_at}, indent=2))
    CREDENTIALS_PATH.chmod(stat.S_IRUSR | stat.S_IWUSR)


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
