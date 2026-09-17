"""Upstream compatibility shims, installed when this package is imported.

The frontend (`cli.*`) never imports this package — it reaches the engine
across a process boundary — so a shim here cannot slow or break the command
surface. Every `bea-engine` invocation imports this package first, which is
what makes one installation point cover every helper command.
"""

from __future__ import annotations

import io
import os
import unicodedata
from typing import Any

UTF8_BOM = b"\xef\xbb\xbf"
"""The three bytes several Windows editors prepend to a UTF-8 ledger."""


def install() -> None:
    """Teach Beancount's parser to skip a leading BOM and read NFC on any ledger file.

    The loader funnels the entry file and every include through
    `parser.parse_file`, so one wrapper there covers `check`, `list`,
    `query`, `report`, `add`, and `import` in a single place. A path is read
    and re-offered as a byte stream with the real filename kept for error
    reports; anything else — stdin, an open stream — passes through untouched.
    """
    from beancount.parser import parser as beancount_parser

    original = beancount_parser.parse_file
    if getattr(original, "__bea_bom_wrapped__", False):
        return

    def parse_file(file: Any, *args: Any, **kwargs: Any) -> Any:
        if file != "-" and not isinstance(file, io.IOBase):
            try:
                with open(file, "rb") as stream:
                    raw = stream.read()
            except OSError:
                return original(file, *args, **kwargs)
            raw = _canonical_bytes(raw)
            name = os.fspath(file)
            if isinstance(name, str):
                kwargs.setdefault("report_filename", name)
            return original(io.BytesIO(raw), *args, **kwargs)
        return original(file, *args, **kwargs)

    parse_file.__bea_bom_wrapped__ = True  # type: ignore[attr-defined]
    beancount_parser.parse_file = parse_file


def _canonical_bytes(raw: bytes) -> bytes:
    """Ledger bytes with the BOM stripped and the text NFC-normalized.

    Editors on different platforms emit different normalizations of identical
    text; without this, Beancount reads NFC and NFD account names as two
    accounts and reports a false unknown-account error. Normalizing before
    the text reaches the parser merges them into one, while the file on disk
    keeps whatever bytes the editor wrote. Amounts, dates, and metadata keys
    are ASCII and pass through byte-identical; bytes that are not UTF-8 at
    all ride a surrogate round-trip back out unchanged.
    """
    if raw.startswith(UTF8_BOM):
        # The mark would survive normalization as U+FEFF and glue itself to
        # the first keyword again, so it is stripped as bytes first.
        raw = raw[len(UTF8_BOM) :]
    text = raw.decode("utf-8", errors="surrogateescape")
    return unicodedata.normalize("NFC", text).encode("utf-8", errors="surrogateescape")
