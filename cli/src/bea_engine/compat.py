"""Upstream compatibility shims, installed when this package is imported.

The frontend (`cli.*`) never imports this package — it reaches the engine
across a process boundary — so a shim here cannot slow or break the command
surface. Every `bea-engine` invocation imports this package first, which is
what makes one installation point cover every helper command.
"""

from __future__ import annotations

import io
import os
from typing import Any

UTF8_BOM = b"\xef\xbb\xbf"
"""The three bytes several Windows editors prepend to a UTF-8 ledger."""


def install() -> None:
    """Teach Beancount's parser to skip a leading BOM on any ledger file.

    The loader funnels the entry file and every include through
    `parser.parse_file`, so one wrapper there covers `check`, `list`,
    `query`, `report`, `add`, and `import` in a single place. A BOM-marked
    path is read and re-offered as a byte stream with the real filename kept
    for error reports; anything else — stdin, an open stream, a file without
    the mark — passes through untouched.
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
            if raw.startswith(UTF8_BOM):
                name = os.fspath(file)
                if isinstance(name, str):
                    kwargs.setdefault("report_filename", name)
                return original(io.BytesIO(raw[len(UTF8_BOM) :]), *args, **kwargs)
        return original(file, *args, **kwargs)

    parse_file.__bea_bom_wrapped__ = True  # type: ignore[attr-defined]
    beancount_parser.parse_file = parse_file
