from __future__ import annotations

import json
import os
import re
import stat
from dataclasses import dataclass
from datetime import UTC, datetime

from cli.config import config_dir, credentials_path
from cli.errors import AuthError

ENVIRONMENT = "environment"
FILE = "file"

# HTTP header values reject control characters; a pasted token with a trailing
# newline must fail here rather than leak through httpx/h11 into the error text.
_INVALID_TOKEN = re.compile(r"[\x00-\x1f\x7f]")


def _validate_token(token: str) -> str:
    if not token or _INVALID_TOKEN.search(token):
        raise AuthError(
            "Invalid BEA_TOKEN or stored credential (contains whitespace or "
            "control characters). Fix the environment value or run "
            "'bea cloud login'."
        )
    return token


def _parse_expire_at(expire_at: str) -> datetime:
    """Parse a stored expiry into aware UTC, or raise ValueError if unusable."""
    if not isinstance(expire_at, str):
        raise ValueError("expireAt must be a string")
    parsed = datetime.fromisoformat(expire_at)
    if parsed.tzinfo is None:
        raise ValueError("expireAt must include a timezone")
    return parsed.astimezone(UTC)


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
            return _parse_expire_at(self.expire_at) < datetime.now(tz=UTC)
        except (TypeError, ValueError):
            return True


def save_credentials(token: str, expire_at: str) -> None:
    # Create the file as 0600 inside a 0700 directory from the start — a
    # write-then-chmod sequence leaks the token under a permissive umask.
    token = _validate_token(token)
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
    if token is not None:
        return Credentials(token=_validate_token(token), expire_at=None, source=ENVIRONMENT)
    try:
        data = json.loads(credentials_path().read_text())
        expire_at = data["expireAt"]
        if not isinstance(expire_at, str):
            # Malformed stored state is treated as expired so require_credentials
            # prompts for a fresh login rather than comparing incompatible types.
            expire_at = "invalid"
        return Credentials(
            token=_validate_token(str(data["token"])),
            expire_at=expire_at,
            source=FILE,
        )
    except AuthError:
        raise
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
