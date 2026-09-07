from __future__ import annotations

import platform
import socket
import time
import webbrowser
from typing import TYPE_CHECKING

from cli.api.client import unwrap
from cli.api.rest_client.api.ledger_v_1 import (
    consume_cli_auth_session,
    create_cli_auth_session,
    get_cli_auth_session,
)
from cli.api.rest_client.models.create_cli_auth_session_body import CreateCliAuthSessionBody
from cli.api.rest_client.models.create_cli_auth_session_body_client import CreateCliAuthSessionBodyClient
from cli.auth.credentials import save_credentials
from cli.config import package_version
from cli.errors import AuthError

if TYPE_CHECKING:
    from cli.api.rest_client.client import AuthenticatedClient

FALLBACK_POLL_INTERVAL_SECONDS = 2


def _client_info() -> CreateCliAuthSessionBodyClient:
    """Describe this device so the browser can show who is asking.

    Everything here is self-reported, and the consent screen says so. It exists
    so the person approving sees "bea on <their machine>" instead of an
    anonymous request they have no way to tell apart from someone else's.
    """
    return CreateCliAuthSessionBodyClient(
        name="bea",
        version=package_version(),
        device_label=socket.gethostname(),
        platform=f"{platform.system()} {platform.release()}".strip(),
    )


def run_device_flow(client: AuthenticatedClient, dashboard_url: str) -> tuple[str, str]:
    """Authorize this CLI in the browser and store the credential it is granted.

    Two codes, and only one of them travels: the device code stays in this
    process and is what polls and redeems, while the user code is printed for
    the person to type into the browser. The verification URL therefore carries
    no secret — opening it, or having it opened for you, authorizes nothing.
    """
    session = unwrap(
        create_cli_auth_session.sync_detailed(
            client=client,
            body=CreateCliAuthSessionBody(client=_client_info()),
        )
    )

    verification_url = f"{dashboard_url.rstrip('/')}/auth/login/device"
    print(f"\n  Your one-time code: {session.user_code}\n")
    print(f"Open {verification_url} and enter the code to authorize this device.")
    print("Waiting for authorization (press Ctrl+C to cancel)...")
    webbrowser.open(verification_url)

    poll_seconds = session.poll_interval_seconds or FALLBACK_POLL_INTERVAL_SECONDS

    while True:
        time.sleep(poll_seconds)
        status_result = unwrap(get_cli_auth_session.sync_detailed(session.device_code, client=client))
        status = status_result.status.value

        if status == "AUTHORIZED":
            grant = unwrap(consume_cli_auth_session.sync_detailed(session.device_code, client=client))
            save_credentials(grant.token, grant.expire_at)
            return grant.token, grant.expire_at
        elif status == "DENIED":
            raise AuthError("Authorization was denied.")
        elif status in ("EXPIRED", "CONSUMED"):
            raise AuthError("Session expired or already used. Run 'bea cloud login' again.")
