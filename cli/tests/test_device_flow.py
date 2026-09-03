"""Tests for the browser device-authorization flow."""

from types import SimpleNamespace
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from cli.auth.device_flow import run_device_flow

DEVICE_CODE = "device-code-kept-in-this-process"
USER_CODE = "BCDF-GHJK"


def _status(value: str) -> SimpleNamespace:
    return SimpleNamespace(get_cli_auth_session=SimpleNamespace(status=SimpleNamespace(value=value)))


def _client(*statuses: str) -> MagicMock:
    client = MagicMock()
    client.create_cli_auth_session.return_value = SimpleNamespace(
        create_cli_auth_session=SimpleNamespace(
            device_code=DEVICE_CODE,
            user_code=USER_CODE,
            expires_at="2026-01-01T00:10:00.000Z",
            poll_interval_seconds=2,
        )
    )
    client.get_cli_auth_session.side_effect = [_status(value) for value in statuses]
    client.consume_cli_auth_session.return_value = SimpleNamespace(
        consume_cli_auth_session=SimpleNamespace(token="jwt-token", expire_at="2026-01-31T00:00:00.000Z")
    )
    return client


@pytest.fixture(autouse=True)
def _no_waiting_or_browsing() -> Any:
    with (
        patch("cli.auth.device_flow.time.sleep"),
        patch("cli.auth.device_flow.webbrowser.open") as browser,
        patch("cli.auth.device_flow.save_credentials") as save,
    ):
        yield SimpleNamespace(browser=browser, save=save)


class TestRunDeviceFlow:
    def test_opens_a_verification_url_that_carries_no_secret(
        self, _no_waiting_or_browsing: Any, capsys: pytest.CaptureFixture[str]
    ) -> None:
        run_device_flow(_client("AUTHORIZED"), "https://beancount.io/")

        opened = _no_waiting_or_browsing.browser.call_args[0][0]
        assert opened == "https://beancount.io/auth/login/device"
        # The device code is this process's private verifier: a URL that carried
        # it would put the credential in history, referrers, and analytics.
        assert DEVICE_CODE not in opened
        assert USER_CODE not in opened

    def test_prints_the_user_code_for_the_person_to_type(self, capsys: pytest.CaptureFixture[str]) -> None:
        run_device_flow(_client("AUTHORIZED"), "https://beancount.io")

        printed = capsys.readouterr().out
        assert USER_CODE in printed
        assert DEVICE_CODE not in printed

    def test_polls_and_redeems_with_the_device_code(self) -> None:
        client = _client("PENDING", "AUTHORIZED")

        token, expire_at = run_device_flow(client, "https://beancount.io")

        assert token == "jwt-token"
        assert expire_at == "2026-01-31T00:00:00.000Z"
        client.get_cli_auth_session.assert_called_with(device_code=DEVICE_CODE)
        client.consume_cli_auth_session.assert_called_once_with(device_code=DEVICE_CODE)

    def test_saves_the_credential_it_was_granted(self, _no_waiting_or_browsing: Any) -> None:
        run_device_flow(_client("AUTHORIZED"), "https://beancount.io")

        _no_waiting_or_browsing.save.assert_called_once_with("jwt-token", "2026-01-31T00:00:00.000Z")

    def test_reports_the_device_it_is_asking_from(self) -> None:
        client = _client("AUTHORIZED")

        run_device_flow(client, "https://beancount.io")

        reported = client.create_cli_auth_session.call_args.kwargs["client"]
        assert reported.name == "beancount-cli"
        assert reported.device_label

    def test_raises_when_the_person_denies(self) -> None:
        with pytest.raises(RuntimeError, match="denied"):
            run_device_flow(_client("DENIED"), "https://beancount.io")

    @pytest.mark.parametrize("status", ["EXPIRED", "CONSUMED"])
    def test_raises_when_the_session_is_no_longer_usable(self, status: str) -> None:
        with pytest.raises(RuntimeError, match="expired or already used"):
            run_device_flow(_client(status), "https://beancount.io")
