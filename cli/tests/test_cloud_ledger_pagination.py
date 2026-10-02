"""A hosted ledger page is truncated only when another accessible row exists."""

from __future__ import annotations

import json
from typing import Any

import httpx
import pytest
from pytest_httpx import HTTPXMock
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
WIRE_NAMES = {
    "fullName": "full_name",
    "httpUrl": "http_url",
    "sshUrl": "ssh_url",
    "createdAt": "created_at",
    "updatedAt": "updated_at",
}


@pytest.fixture(autouse=True)
def cloud_credentials(logged_in: None, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BEA_API_URL", "https://api.example")


def _catalog(count: int) -> list[dict[str, Any]]:
    return [
        {
            "id": str(index),
            "name": f"books-{index:03}",
            "fullName": f"alice/books-{index:03}",
            "httpUrl": f"https://example.test/alice/books-{index:03}",
            "sshUrl": f"git@example.test:alice/books-{index:03}.git",
            "private": True,
            "empty": False,
            "createdAt": "2026-01-01T00:00:00Z",
            "updatedAt": "2026-01-02T00:00:00Z",
            "size": index,
        }
        for index in range(1, count + 1)
    ]


def _page_response(catalog: list[dict[str, Any]], request: httpx.Request) -> httpx.Response:
    page = int(request.url.params["page"])
    limit = int(request.url.params["limit"])
    start = (page - 1) * limit
    return httpx.Response(200, json=catalog[start : start + limit])


def _request_pages(httpx_mock: HTTPXMock) -> list[tuple[int, int]]:
    requests = httpx_mock.get_requests()
    for request in requests:
        assert request.method == "GET"
        assert request.url.host == "api.example"
        assert request.url.path == "/api-gateway/v1/ledgers"
        assert request.headers["Authorization"] == "Bearer test-token"
    return [(int(request.url.params["page"]), int(request.url.params["limit"])) for request in requests]


@pytest.mark.parametrize(
    ("total", "page", "limit", "truncated"),
    [
        (7, 1, 6, True),
        (7, 1, 7, False),
        (9, 2, 3, True),
        (9, 3, 3, False),
        (3, 1, 1, True),
        (3, 3, 1, False),
        (100, 1, 100, False),
        (201, 2, 100, True),
        (7, 1, 8, False),
        (7, 2, 7, False),
        (0, 1, 50, False),
    ],
    ids=[
        "one-more",
        "seven-exact",
        "middle-page",
        "later-exact-final-page",
        "limit-one-more",
        "limit-one-final",
        "maximum-limit-final",
        "maximum-limit-later-page",
        "short-page",
        "past-final-page",
        "empty-catalog",
    ],
)
def test_json_pagination_preserves_the_requested_page_and_checks_only_the_next_row(
    httpx_mock: HTTPXMock, total: int, page: int, limit: int, truncated: bool
) -> None:
    catalog = _catalog(total)
    httpx_mock.add_callback(lambda request: _page_response(catalog, request), method="GET", is_reusable=True)

    result = runner.invoke(app, ["--json", "cloud", "ledger", "list", "--page", str(page), "--limit", str(limit)])

    assert result.exit_code == 0, result.stderr
    envelope = json.loads(result.stdout)
    start = (page - 1) * limit
    expected = [
        {WIRE_NAMES.get(key, key): value for key, value in row.items()} for row in catalog[start : start + limit]
    ]
    assert envelope["data"] == expected
    assert envelope["page"] == page
    assert envelope["limit"] == limit
    assert envelope["truncated"] is truncated
    expected_requests = [(page, limit)]
    if len(expected) == limit:
        expected_requests.append((page * limit + 1, 1))
    assert _request_pages(httpx_mock) == expected_requests


@pytest.mark.parametrize("failure", ["unavailable", "malformed-success", "empty-object", "empty-string"])
def test_a_failed_lookahead_reports_an_error_instead_of_guessing_truncation(
    httpx_mock: HTTPXMock, failure: str
) -> None:
    catalog = _catalog(7)

    def respond(request: httpx.Request) -> httpx.Response:
        if request.url.params["page"] == "7" and request.url.params["limit"] == "1":
            headers = {"X-Request-Id": "synthetic-pagination-probe"}
            if failure == "unavailable":
                return httpx.Response(
                    503,
                    json={"ok": False, "error": {"code": "SERVICE_UNAVAILABLE", "message": "Lookahead unavailable"}},
                    headers=headers,
                )
            body = {} if failure == "empty-object" else "" if failure == "empty-string" else [{}]
            return httpx.Response(200, json=body, headers=headers)
        return _page_response(catalog, request)

    httpx_mock.add_callback(respond, method="GET", is_reusable=True)

    result = runner.invoke(app, ["--json", "cloud", "ledger", "list", "--page", "2", "--limit", "3"])

    assert result.exit_code == 1, result.stdout
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "validation"
    assert error["request_id"] == "synthetic-pagination-probe"
    expected_message = "Lookahead unavailable" if failure == "unavailable" else "HTTP 200"
    assert expected_message in error["message"]
    assert "truncated" not in result.stderr
    assert _request_pages(httpx_mock) == [(2, 3), (7, 1)]


@pytest.mark.parametrize("body", [{}, ""])
@pytest.mark.parametrize("as_json", [False, True])
def test_a_non_array_first_page_is_not_an_empty_catalog(httpx_mock: HTTPXMock, body: object, as_json: bool) -> None:
    httpx_mock.add_response(status_code=200, json=body, headers={"X-Request-Id": "synthetic-catalog-shape"})

    result = runner.invoke(app, [*(["--json"] if as_json else []), "cloud", "ledger", "list"])

    assert result.exit_code == 1, result.stdout
    assert result.stdout == ""
    assert "Unexpected server response (HTTP 200)" in result.stderr
    if as_json:
        error = json.loads(result.stderr)["error"]
        assert error["request_id"] == "synthetic-catalog-shape"
    assert _request_pages(httpx_mock) == [(1, 50)]


def test_human_listing_does_not_probe_beyond_the_requested_page(httpx_mock: HTTPXMock) -> None:
    catalog = _catalog(7)
    httpx_mock.add_callback(lambda request: _page_response(catalog, request), method="GET", is_reusable=True)

    result = runner.invoke(app, ["cloud", "ledger", "list", "--page", "2", "--limit", "3"])

    assert result.exit_code == 0, result.stderr
    assert all(f"alice/books-{index:03}" in result.stdout for index in (4, 5, 6))
    assert "alice/books-003" not in result.stdout
    assert "alice/books-007" not in result.stdout
    assert _request_pages(httpx_mock) == [(2, 3)]
