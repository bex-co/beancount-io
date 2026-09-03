from __future__ import annotations

import platform
import socket
import time
import webbrowser
from importlib.metadata import PackageNotFoundError, version
from typing import TYPE_CHECKING

from cli.api.gql_client.input_types import CliAuthClientInfoInput
from cli.auth.credentials import save_credentials

if TYPE_CHECKING:
    from cli.api.gql_client import Client

FALLBACK_POLL_INTERVAL_SECONDS = 2


def _client_info() -> CliAuthClientInfoInput:
    """Describe this device so the browser can show who is asking.

    Everything here is self-reported, and the consent screen says so. It exists
    so the person approving sees "beancount-cli on <their machine>" instead of
    an anonymous request they have no way to tell apart from someone else's.
    """
    try:
        cli_version = version("beancount-cli")
    except PackageNotFoundError:
        cli_version = None

    return CliAuthClientInfoInput(
        name="beancount-cli",
        version=cli_version,
        deviceLabel=socket.gethostname(),
        platform=f"{platform.system()} {platform.release()}".strip(),
    )


def run_device_flow(client: Client, dashboard_url: str) -> tuple[str, str]:
    """Authorize this CLI in the browser and store the credential it is granted.

    Two codes, and only one of them travels: the device code stays in this
    process and is what polls and redeems, while the user code is printed for
    the person to type into the browser. The verification URL therefore carries
    no secret — opening it, or having it opened for you, authorizes nothing.
    """
    result = client.create_cli_auth_session(client=_client_info())
    session = result.create_cli_auth_session

    verification_url = f"{dashboard_url.rstrip('/')}/auth/login/device"
    print(f"\n  Your one-time code: {session.user_code}\n")
    print(f"Open {verification_url} and enter the code to authorize this device.")
    print("Waiting for authorization (press Ctrl+C to cancel)...")
    webbrowser.open(verification_url)

    poll_seconds = session.poll_interval_seconds or FALLBACK_POLL_INTERVAL_SECONDS

    while True:
        time.sleep(poll_seconds)
        status_result = client.get_cli_auth_session(device_code=session.device_code)
        status = status_result.get_cli_auth_session.status.value

        if status == "AUTHORIZED":
            consume_result = client.consume_cli_auth_session(device_code=session.device_code)
            token = consume_result.consume_cli_auth_session.token
            expire_at = consume_result.consume_cli_auth_session.expire_at
            save_credentials(token, expire_at)
            return token, expire_at
        elif status == "DENIED":
            raise RuntimeError("Authorization was denied.")
        elif status in ("EXPIRED", "CONSUMED"):
            raise RuntimeError("Session expired or already used. Run 'beancount auth login' again.")
