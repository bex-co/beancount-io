"""Tests for credential storage."""

import json
import stat
from pathlib import Path
from unittest.mock import patch

import pytest

from cli.auth.credentials import (
    Credentials,
    clear_credentials,
    load_credentials,
    require_credentials,
    save_credentials,
)


class TestCredentials:
    def test_is_expired_with_past_date(self) -> None:
        creds = Credentials(token="tok", expire_at="2020-01-01T00:00:00Z")
        assert creds.is_expired()

    def test_is_not_expired_with_future_date(self) -> None:
        creds = Credentials(token="tok", expire_at="2099-01-01T00:00:00Z")
        assert not creds.is_expired()

    def test_is_expired_with_invalid_date(self) -> None:
        creds = Credentials(token="tok", expire_at="not-a-date")
        assert creds.is_expired()


class TestSaveLoadClear:
    def test_save_and_load(self, tmp_path: Path) -> None:
        cred_path = tmp_path / "credentials.json"
        with (
            patch("cli.auth.credentials.CREDENTIALS_DIR", tmp_path),
            patch("cli.auth.credentials.CREDENTIALS_PATH", cred_path),
        ):
            save_credentials("my-token", "2099-01-01T00:00:00Z")
            assert cred_path.exists()
            perms = stat.S_IMODE(cred_path.stat().st_mode)
            assert perms == stat.S_IRUSR | stat.S_IWUSR

            loaded = load_credentials()
            assert loaded is not None
            assert loaded.token == "my-token"
            assert loaded.expire_at == "2099-01-01T00:00:00Z"

    def test_load_returns_none_if_missing(self, tmp_path: Path) -> None:
        cred_path = tmp_path / "credentials.json"
        with patch("cli.auth.credentials.CREDENTIALS_PATH", cred_path):
            assert load_credentials() is None

    def test_clear_removes_file(self, tmp_path: Path) -> None:
        cred_path = tmp_path / "credentials.json"
        cred_path.write_text(json.dumps({"token": "t", "expireAt": "2099-01-01T00:00:00Z"}))
        with patch("cli.auth.credentials.CREDENTIALS_PATH", cred_path):
            clear_credentials()
            assert not cred_path.exists()

    def test_clear_noop_if_missing(self, tmp_path: Path) -> None:
        cred_path = tmp_path / "missing.json"
        with patch("cli.auth.credentials.CREDENTIALS_PATH", cred_path):
            clear_credentials()  # should not raise


class TestRequireCredentials:
    def test_raises_if_not_logged_in(self, tmp_path: Path) -> None:
        cred_path = tmp_path / "missing.json"
        with patch("cli.auth.credentials.CREDENTIALS_PATH", cred_path):
            with pytest.raises(RuntimeError, match="Not logged in"):
                require_credentials()

    def test_raises_if_expired(self, tmp_path: Path) -> None:
        cred_path = tmp_path / "credentials.json"
        cred_path.write_text(json.dumps({"token": "t", "expireAt": "2020-01-01T00:00:00Z"}))
        with (
            patch("cli.auth.credentials.CREDENTIALS_PATH", cred_path),
            patch("cli.auth.credentials.CREDENTIALS_DIR", tmp_path),
        ):
            with pytest.raises(RuntimeError, match="expired"):
                require_credentials()

    def test_returns_valid_credentials(self, tmp_path: Path) -> None:
        cred_path = tmp_path / "credentials.json"
        cred_path.write_text(json.dumps({"token": "valid-token", "expireAt": "2099-01-01T00:00:00Z"}))
        with (
            patch("cli.auth.credentials.CREDENTIALS_PATH", cred_path),
            patch("cli.auth.credentials.CREDENTIALS_DIR", tmp_path),
        ):
            creds = require_credentials()
            assert creds.token == "valid-token"
