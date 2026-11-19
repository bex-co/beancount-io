from __future__ import annotations

import json
import os
import re
import stat
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from cli.config import credentials_path
from cli.errors import AuthError

ENVIRONMENT = "environment"
FILE = "file"

# A bearer token is printable ASCII without whitespace: HTTP header values
# reject control characters, and httpx encodes headers as ASCII. A pasted
# token with a trailing newline, a space, an accented letter or a zero-width
# space must fail here, as an auth error, rather than reach httpx/h11 and
# surface as a transport failure or a raw codec error.
_INVALID_TOKEN = re.compile(r"[^\x21-\x7e]")


def _validate_token(token: str, *, source: str) -> str:
    if _INVALID_TOKEN.search(token):
        label = "BEA_TOKEN" if source == ENVIRONMENT else "stored credential"
        remedy = "Fix or unset BEA_TOKEN." if source == ENVIRONMENT else "Run 'bea cloud login' to replace it."
        raise AuthError(f"Invalid {label} (contains whitespace, control or non-ASCII characters). {remedy}")
    if not token:
        raise AuthError("Not logged in. Run 'bea cloud login', or set BEA_TOKEN.")
    return token


def _parse_expire_at(expire_at: str) -> datetime:
    """Parse a stored expiry into aware UTC, or raise ValueError if unusable."""
    if not isinstance(expire_at, str):
        raise ValueError("expireAt must be a string")
    parsed = datetime.fromisoformat(expire_at)
    if parsed.tzinfo is None:
        raise ValueError("expireAt must include a timezone")
    return parsed.astimezone(UTC)


def grant_expiry(expire_at: object) -> datetime:
    """The aware-UTC expiry of a freshly granted session, or ValueError when it could not be read later.

    The same rules `Credentials.is_expired` applies to the stored file, so a
    grant is judged before it replaces the credential rather than refused by
    the next command (w5/894).
    """
    if not isinstance(expire_at, str):
        raise ValueError("expireAt must be a string")
    return _parse_expire_at(expire_at)


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
    token = _validate_token(token, source=FILE)
    write_private(credentials_path(), json.dumps({"token": token, "expireAt": expire_at}, indent=2))


def write_private(path: Path, payload: str) -> None:
    """Write a secret into the configuration directory, readable by its owner alone.

    Create the file as 0600 inside a 0700 directory from the start — a
    write-then-chmod sequence leaks the token under a permissive umask.
    """
    directory = path.parent
    directory.mkdir(parents=True, exist_ok=True)
    directory.chmod(stat.S_IRWXU)
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


#: Far beyond a token and its expiry, and small enough that a mistaken huge
#: file is refused instead of read into memory on every engine launch.
_MAX_STORED_BYTES = 64 * 1024


def read_private(path: Path) -> str | None:
    """The stored credential's text, or None when there is no file.

    Every local command reads this at engine launch, so it must never wait:
    `read_text()` blocked forever on a FIFO and grew without bound on a link to
    `/dev/zero` (w5/589). The open does not block, and only a regular file of
    sane size is read.
    """
    flags = os.O_RDONLY | getattr(os, "O_NONBLOCK", 0) | getattr(os, "O_CLOEXEC", 0)
    try:
        fd = os.open(path, flags)
    except FileNotFoundError:
        return None
    except NotADirectoryError as exc:
        raise AuthError(
            f"The bea configuration directory {path.parent} is not a directory, so it holds no credential. "
            "Point BEA_CONFIG_DIR at a directory."
        ) from exc
    except OSError as exc:
        if not _searchable(path.parent):
            # A symbolic-link loop or an unsearchable directory is the
            # directory's fault, not the credential's (w5/811).
            raise AuthError(
                f"The bea configuration directory {path.parent} cannot be used ({exc.strerror}), so no credential "
                "can be read from it. Point BEA_CONFIG_DIR at a directory you can open."
            ) from exc
        raise UnusableCredentials(path, f"it cannot be read ({type(exc).__name__})") from exc
    try:
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            raise UnusableCredentials(path, "it is not a regular file")
        data = b""
        while len(data) <= _MAX_STORED_BYTES and (chunk := os.read(fd, _MAX_STORED_BYTES + 1 - len(data))):
            data += chunk
    except OSError as exc:
        raise UnusableCredentials(path, f"it cannot be read ({type(exc).__name__})") from exc
    finally:
        os.close(fd)
    if len(data) > _MAX_STORED_BYTES:
        raise UnusableCredentials(path, f"it is larger than {_MAX_STORED_BYTES // 1024} KiB")
    try:
        return data.decode()
    except UnicodeDecodeError as exc:
        raise UnusableCredentials(path, f"it cannot be read ({type(exc).__name__})") from exc


def _searchable(directory: Path) -> bool:
    try:
        return stat.S_ISDIR(os.stat(directory).st_mode) and os.access(directory, os.X_OK)
    except OSError:
        return False


def load_credentials() -> Credentials | None:
    """Return the active credential: `$BEA_TOKEN` if set, otherwise the stored one.

    An unattended job exports `BEA_TOKEN` and never touches the disk, so a CI
    runner needs no browser ceremony and leaves no credential behind.
    """
    token = os.environ.get("BEA_TOKEN")
    # Empty BEA_TOKEN= is the same as unset: fall through to the stored file
    # (or "Not logged in"), rather than a whitespace-oriented auth error.
    if token:
        return Credentials(token=_validate_token(token, source=ENVIRONMENT), expire_at=None, source=ENVIRONMENT)
    path = credentials_path()
    text = read_private(path)
    if text is None:
        return None
    # A file that is present but unusable is not "logged out": that answer let
    # `bea cloud logout` report success over a token left on disk (w5/297).
    try:
        data = json.loads(text)
    except (ValueError, RecursionError) as exc:
        # Deep nesting exhausts the decoder's recursion, which is still just bad JSON (w5/589).
        raise UnusableCredentials(path, "it is not valid JSON") from exc
    if not isinstance(data, dict):
        raise UnusableCredentials(path, "it is not a JSON object")
    token = data.get("token")
    if not isinstance(token, str):
        raise UnusableCredentials(path, "its token is missing or not a string")
    if "expireAt" not in data:
        raise UnusableCredentials(path, "its expireAt is missing")
    expire_at = data["expireAt"]
    if not isinstance(expire_at, str):
        # Malformed stored state is treated as expired so require_credentials
        # prompts for a fresh login rather than comparing incompatible types.
        expire_at = "invalid"
    # A stored token bea could not have saved is an unusable file too, which
    # logout removes: "Not logged in" and "Invalid stored credential" left it
    # on disk, and logout exited 3 over it (w5/811).
    if not token:
        raise UnusableCredentials(path, "its token is empty")
    if _INVALID_TOKEN.search(token):
        raise UnusableCredentials(path, "its token contains whitespace, control or non-ASCII characters")
    return Credentials(token=token, expire_at=expire_at, source=FILE)


class UnusableCredentials(AuthError):
    """A stored credential file that exists but cannot be used."""

    def __init__(self, path: Path, reason: str) -> None:
        self.path = path
        self.reason = reason
        super().__init__(
            f"The stored credential {path} is unusable: {reason}. "
            "Run 'bea cloud login' to replace it, or 'bea cloud logout' to remove it."
        )


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
