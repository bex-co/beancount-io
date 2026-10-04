"""Server endpoints, read from the `BEA_*` environment.

Kept in its own module so that importing it — and with it `pydantic_settings`,
whose plugin loader pulls in logfire, OpenTelemetry, protobuf and requests — is
something only the commands that talk to a server ever do. Reach it through
`cli.config.settings()`, never with a module-level import.
"""

from __future__ import annotations

from urllib.parse import urlsplit

from pydantic import ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_url: str = "https://api.v3.beancount.io"
    dashboard_url: str = "https://beancount.io"

    # An empty `BEA_API_URL=` means "use the default", as an empty `BEA_FILE`
    # does, rather than an empty base URL that fails as a network outage.
    model_config = SettingsConfigDict(env_prefix="BEA_", extra="ignore", env_ignore_empty=True)

    @field_validator("api_url", "dashboard_url")
    @classmethod
    def _http_url(cls, value: str, info: ValidationInfo) -> str:
        """Refuse a value httpx would only reject later, as a misleading transport error.

        Raises `UsageError`, which pydantic propagates unwrapped (it collects
        only `ValueError`/`AssertionError`), so the caller sees exit 2 naming
        the variable instead of "Could not reach the server".
        """
        try:
            parts = urlsplit(value)
            _ = parts.port  # raises ValueError for a malformed or out-of-range port
            valid = parts.scheme in {"http", "https"} and bool(parts.hostname)
        except ValueError:
            valid = False
        if not valid:
            from cli.errors import UsageError

            variable = f"BEA_{(info.field_name or '').upper()}"
            raise UsageError(f"{variable} must be an http(s) URL with a host, got {value!r}.")
        return value
