from __future__ import annotations

from cli.api.gql_client import Client


def make_client(token: str | None = None) -> Client:
    from cli.config import settings

    headers: dict[str, str] = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return Client(url=settings.graphql_endpoint, headers=headers)
