"""Tests for credential storage."""

import json
import os
import stat
from pathlib import Path

import pytest

from cli.auth.credentials import (
    ENVIRONMENT,
    Credentials,
    clear_credentials,
    load_credentials,
    require_credentials,
    save_credentials,
)
from cli.errors import AuthError


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

    def test_is_expired_with_naive_datetime(self) -> None:
        creds = Credentials(token="tok", expire_at="2000-01-01T00:00:00")
        assert creds.is_expired()

    def test_require_credentials_treats_naive_stored_expiry_as_expired(self, bea_config_dir: Path) -> None:
        _write_stored(bea_config_dir, "t", "2000-01-01T00:00:00")
        with pytest.raises(AuthError, match="expired"):
            require_credentials()

    @pytest.mark.parametrize(
        "token",
        ["value\n", "value\t", "value ", " value", "val ue", "value\r"],
        ids=["newline", "tab", "trailing-space", "leading-space", "inner-space", "carriage-return"],
    )
    def test_require_credentials_rejects_token_with_whitespace(
        self, bea_config_dir: Path, monkeypatch: pytest.MonkeyPatch, token: str
    ) -> None:
        monkeypatch.setenv("BEA_TOKEN", "qa-synthetic-" + token)
        with pytest.raises(AuthError, match="Invalid BEA_TOKEN"):
            require_credentials()

    def test_require_credentials_accepts_a_plain_token(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("BEA_TOKEN", "qa-synthetic-value.with-dashes_and.dots")
        assert require_credentials().token == "qa-synthetic-value.with-dashes_and.dots"


def _write_stored(config_dir: Path, token: str, expire_at: str) -> Path:
    config_dir.mkdir(parents=True, exist_ok=True)
    path = config_dir / "credentials.json"
    path.write_text(json.dumps({"token": token, "expireAt": expire_at}))
    return path


class TestSaveLoadClear:
    def test_save_and_load(self, bea_config_dir: Path) -> None:
        save_credentials("my-token", "2099-01-01T00:00:00Z")

        cred_path = bea_config_dir / "credentials.json"
        assert cred_path.exists()
        assert stat.S_IMODE(cred_path.stat().st_mode) == stat.S_IRUSR | stat.S_IWUSR

        loaded = load_credentials()
        assert loaded is not None
        assert loaded.token == "my-token"
        assert loaded.expire_at == "2099-01-01T00:00:00Z"
        assert loaded.source == "file"

    def test_save_is_0600_under_permissive_umask(self, bea_config_dir: Path) -> None:
        old_umask = os.umask(0o022)
        try:
            save_credentials("my-token", "2099-01-01T00:00:00Z")
        finally:
            os.umask(old_umask)

        cred_path = bea_config_dir / "credentials.json"
        assert stat.S_IMODE(cred_path.stat().st_mode) == stat.S_IRUSR | stat.S_IWUSR
        assert stat.S_IMODE(bea_config_dir.stat().st_mode) == stat.S_IRWXU
        assert not cred_path.with_name(cred_path.name + ".tmp").exists()

    def test_save_tightens_existing_loose_file(self, bea_config_dir: Path) -> None:
        cred_path = _write_stored(bea_config_dir, "old-token", "2099-01-01T00:00:00Z")
        cred_path.chmod(0o644)

        save_credentials("new-token", "2099-01-01T00:00:00Z")

        assert stat.S_IMODE(cred_path.stat().st_mode) == stat.S_IRUSR | stat.S_IWUSR
        loaded = load_credentials()
        assert loaded is not None
        assert loaded.token == "new-token"

    def test_load_returns_none_if_missing(self, bea_config_dir: Path) -> None:
        assert load_credentials() is None

    def test_environment_token_wins_and_reports_its_source(
        self, bea_config_dir: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _write_stored(bea_config_dir, "stored-token", "2099-01-01T00:00:00Z")
        monkeypatch.setenv("BEA_TOKEN", "ci-token")

        loaded = load_credentials()

        assert loaded is not None
        assert loaded.token == "ci-token"
        assert loaded.source == ENVIRONMENT
        assert not loaded.is_expired()

    def test_environment_token_writes_nothing(self, bea_config_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("BEA_TOKEN", "ci-token")

        assert load_credentials() is not None
        assert not (bea_config_dir / "credentials.json").exists()

    def test_clear_removes_file(self, bea_config_dir: Path) -> None:
        cred_path = _write_stored(bea_config_dir, "t", "2099-01-01T00:00:00Z")
        clear_credentials()
        assert not cred_path.exists()

    def test_clear_noop_if_missing(self, bea_config_dir: Path) -> None:
        clear_credentials()  # should not raise


class TestRequireCredentials:
    def test_raises_if_not_logged_in(self, bea_config_dir: Path) -> None:
        with pytest.raises(AuthError, match="Not logged in"):
            require_credentials()

    def test_raises_if_expired(self, bea_config_dir: Path) -> None:
        _write_stored(bea_config_dir, "t", "2020-01-01T00:00:00Z")
        with pytest.raises(AuthError, match="expired"):
            require_credentials()

    def test_returns_valid_credentials(self, bea_config_dir: Path) -> None:
        _write_stored(bea_config_dir, "valid-token", "2099-01-01T00:00:00Z")
        creds = require_credentials()
        assert creds.token == "valid-token"
