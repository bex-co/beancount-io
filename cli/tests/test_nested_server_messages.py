"""SDK and REST errors extract the same bounded, readable server message."""

from __future__ import annotations

import json

import pytest

from cli.api.client import _error_message
from cli.api.rest_client.models.v1_error import V1Error
from cli.api.rest_client.models.v1_error_error import V1ErrorError
from cli.ask.agent import _server_message

SENTENCE = "Too many requests; retry in 60s"
NESTED = {"error": {"message": SENTENCE}}


@pytest.mark.parametrize(
    "body",
    [
        {"message": SENTENCE},
        NESTED,
        json.dumps(NESTED),
        {"message": json.dumps(NESTED)},
        {"ok": False, "error": {"code": "PROXY_ERROR", "message": json.dumps(NESTED)}},
        SENTENCE,
        {"message": SENTENCE, "error": {"code": "RATE_LIMITED"}},
        {"message": SENTENCE, "error": "Bad Request"},
    ],
    ids=[
        "message",
        "error-message",
        "encoded-body",
        "encoded-message",
        "proxy-envelope",
        "plain-text",
        "sibling-code",
        "sibling-label",
    ],
)
@pytest.mark.parametrize("reader", ["ask", "cloud"])
def test_both_error_readers_unwrap_to_the_sentence(body: object, reader: str) -> None:
    actual = _server_message(body) if reader == "ask" else _error_message(None, json.dumps(body).encode())

    assert actual == SENTENCE


def test_parsed_cloud_error_unwraps_its_message_too() -> None:
    parsed = V1Error(ok=False, error=V1ErrorError(code="PROXY_ERROR", message=json.dumps(NESTED)))

    assert _error_message(parsed, b"") == SENTENCE


def test_bracketed_plain_diagnostic_is_preserved() -> None:
    message = "[Errno 13] Permission denied"
    parsed = V1Error(ok=False, error=V1ErrorError(code="IO_ERROR", message=message))

    assert _server_message({"message": message}) == message
    assert _error_message(parsed, b"") == message


@pytest.mark.parametrize(
    "body",
    [None, {}, [], 42, "", "  ", {"message": ""}, {"message": [SENTENCE]}, '{"error":', {"message": '{"error":'}],
)
@pytest.mark.parametrize("reader", ["ask", "cloud"])
def test_unusable_messages_fall_back_without_printing_an_envelope(body: object, reader: str) -> None:
    actual = _server_message(body) if reader == "ask" else _error_message(None, json.dumps(body).encode())

    assert actual is None


def test_excessive_nesting_falls_back() -> None:
    body: object = {"message": SENTENCE}
    for _ in range(20):
        body = {"error": body}

    assert _server_message(body) is None
    assert _error_message(None, json.dumps(body).encode()) is None
