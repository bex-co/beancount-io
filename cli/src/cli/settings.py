"""Server endpoints, read from the `BEA_*` environment.

Kept in its own module so that importing it — and with it `pydantic_settings`,
whose plugin loader pulls in logfire, OpenTelemetry, protobuf and requests — is
something only the commands that talk to a server ever do. Reach it through
`cli.config.settings()`, never with a module-level import.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_url: str = "https://api.v3.beancount.io"
    dashboard_url: str = "https://beancount.io"

    model_config = SettingsConfigDict(env_prefix="BEA_", extra="ignore")

    @property
    def graphql_endpoint(self) -> str:
        return f"{self.api_url.rstrip('/')}/api-gateway/"
