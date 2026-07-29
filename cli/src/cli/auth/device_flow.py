from __future__ import annotations

import time
import webbrowser
from typing import TYPE_CHECKING

from cli.auth.credentials import save_credentials

if TYPE_CHECKING:
    from cli.api.gql_client import Client

POLL_INTERVAL_SECONDS = 2


def run_device_flow(client: Client, dashboard_url: str) -> tuple[str, str]:
    result = client.create_cli_auth_session()
    session_id = result.create_cli_auth_session.session_id

    device_url = f"{dashboard_url.rstrip('/')}/auth/login/device?session_id={session_id}"
    print(f"Opening browser to: {device_url}")
    print("Waiting for authorization (press Ctrl+C to cancel)...")
    webbrowser.open(device_url)

    while True:
        time.sleep(POLL_INTERVAL_SECONDS)
        status_result = client.get_cli_auth_session(session_id=session_id)
        status = status_result.get_cli_auth_session.status.value

        if status == "AUTHORIZED":
            consume_result = client.consume_cli_auth_session(session_id=session_id)
            token = consume_result.consume_cli_auth_session.token
            expire_at = consume_result.consume_cli_auth_session.expire_at
            save_credentials(token, expire_at)
            return token, expire_at
        elif status == "DENIED":
            raise RuntimeError("Authorization was denied.")
        elif status in ("EXPIRED", "CONSUMED"):
            raise RuntimeError("Session expired or already used. Run 'beancount auth login' again.")
