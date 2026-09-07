from __future__ import annotations

from cli.api.gql_client import Client


def make_client(token: str | None = None) -> Client:
    from cli.config import settings

    headers: dict[str, str] = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return Client(url=settings().graphql_endpoint, headers=headers)


def authenticated_client() -> Client:
    """The client every hosted command needs: the stored or environment credential, attached."""
    from cli.auth.credentials import require_credentials

    return make_client(require_credentials().token)
