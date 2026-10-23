"""Upstream compatibility shims, installed when this package is imported.

The frontend (`cli.*`) never imports this package — it reaches the engine
across a process boundary — so a shim here cannot slow or break the command
surface. Every `bea-engine` invocation imports this package first, which is
what makes one installation point cover every helper command.
"""

from __future__ import annotations

import functools
import io
import os
import unicodedata
from collections.abc import Callable
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
            canonical = _canonical_bytes(raw)
            name = os.fspath(file)
            if isinstance(name, str):
                kwargs.setdefault("report_filename", name)
            result = original(io.BytesIO(canonical), *args, **kwargs)
            if b"include" in raw and not raw.endswith(canonical):
                _restore_include_paths(raw, result[2])
            return result
        return original(file, *args, **kwargs)

    parse_file.__bea_bom_wrapped__ = True  # type: ignore[attr-defined]
    beancount_parser.parse_file = parse_file
    _install_lexer()
    _install_source_locations()
    _install_account_walk()


def _install_account_walk() -> None:
    """Name a document folder's account in NFC, the form the ledger's accounts are read in (w5/984).

    Upstream's `account.walk` normalizes to NFKC, which rewrites `Of\ufb01ce`
    (a ligature) as `Office`: the folder of a declared account was then a name
    no account carries, its receipts were skipped by automatic discovery, and
    `doctor directories` reported the folder as undeclared. The loader reads
    ledger text as NFC (`_canonical_bytes`), so the walk does too.
    """
    from beancount.core import account

    original = account.walk
    if getattr(original, "__bea_nfc_walk__", False):
        return

    def walk(root_directory: str, followlinks: bool = True) -> Any:
        for root, dirs, files in os.walk(root_directory, followlinks=followlinks):
            dirs.sort()
            files.sort()
            relroot = root[len(root_directory) + 1 :]
            name = unicodedata.normalize("NFC", relroot.replace(os.sep, account.sep))
            if account.is_valid(name):
                yield root, name, dirs, files

    walk.__bea_nfc_walk__ = True  # type: ignore[attr-defined]
    account.walk = walk


def _install_lexer() -> None:
    """Give `lexer.lex_iter` the same reading, for `doctor lex`.

    The token dump is the one diagnostic that never reaches `parse_file`, so
    it alone reported the mark as an error token glued to the first keyword
    while every other command read the file cleanly (w5/135).
    """
    from beancount.parser import lexer

    original: Any = lexer.lex_iter

    def lex_iter(file: Any, *args: Any, **kwargs: Any) -> Any:
        if not isinstance(file, io.IOBase):
            try:
                with open(file, "rb") as stream:
                    file = io.BytesIO(_canonical_bytes(stream.read()))
            except OSError:
                pass
        return original(file, *args, **kwargs)

    lexer.lex_iter = lex_iter


#: The metadata keys Beancount fills with where a directive is written.
LOCATION_KEYS = ("filename", "lineno")

_DIRECTIVES = (
    "open",
    "close",
    "commodity",
    "pad",
    "balance",
    "event",
    "query",
    "price",
    "note",
    "document",
    "custom",
    "transaction",
)


def _install_source_locations() -> None:
    """Keep each directive's `filename` and `lineno`, and report metadata that names either.

    Beancount fills both keys with where the directive is written, then merges
    the directive's own metadata, or a `pushmeta`, over them without a word.
    `filename: "scan-0042.pdf"` is a natural note for a receipt, and it moved
    the entry to a file that does not exist: `list --on-disk` hid it, `list`
    called it generated, `import` and `add balance` wrote it again, and a date
    there failed every `list` (w5/630). The location stays, and the key is an
    error at its directive, as bulk input already refuses it (w3/284). Every
    parse goes through the builder, so one patch covers every reader.
    """
    from beancount.parser import grammar

    builder: Any = grammar.Builder
    if getattr(builder, "_bea_keeps_locations", False):
        return
    builder.transaction = _keeping_posting_locations(builder.transaction)
    for name in _DIRECTIVES:
        setattr(builder, name, _keeping_location(getattr(builder, name)))
    builder.pushmeta = _refusing_location(builder.pushmeta, report=True)
    builder.popmeta = _refusing_location(builder.popmeta, report=False)
    builder._bea_keeps_locations = True


_RESERVED = "is reserved for Beancount's source location; choose another key."


def is_reserved_location(error: Any) -> bool:
    """Whether a load error is metadata naming a location key, which native bean-check accepts."""
    message = str(getattr(error, "message", ""))
    return message.startswith("Metadata key ") and message.endswith(_RESERVED)


def _reserved(builder: Any, filename: str, lineno: int, key: str) -> None:
    # Upstream's own error type, so Beancount's load cache stays readable by upstream tools.
    from beancount.parser.grammar import ParserError

    builder.errors.append(ParserError({"filename": filename, "lineno": lineno}, f"Metadata key {key!r} {_RESERVED}"))


def _keeping_location(method: Callable[..., Any]) -> Callable[..., Any]:
    @functools.wraps(method)
    def directive(self: Any, filename: str, lineno: int, *args: Any) -> Any:
        entry = method(self, filename, lineno, *args)
        meta = getattr(entry, "meta", None)
        if isinstance(meta, dict):
            for key, value in zip(LOCATION_KEYS, (filename, lineno), strict=True):
                written = meta.get(key)
                if written is not value and (type(written) is not type(value) or written != value):
                    _reserved(self, filename, lineno, key)
                    meta[key] = value
        return entry

    return directive


def _keeping_posting_locations(method: Callable[..., Any]) -> Callable[..., Any]:
    """Report a posting's own `filename:` or `lineno:` as reserved, at that posting, and keep its location.

    The grammar fills each posting's location first, so the key read as a
    second value: "Duplicate posting metadata field" for a key written once
    (w5/852).
    """
    from beancount.core.data import Posting
    from beancount.parser.grammar import KeyValue

    @functools.wraps(method)
    def transaction(self: Any, filename: str, lineno: int, *args: Any) -> Any:
        *head, items = args
        if items:
            kept: list[Any] = []
            posting = None
            for item in items:
                if isinstance(item, Posting):
                    posting = item
                elif isinstance(item, KeyValue) and posting is not None and item.key in LOCATION_KEYS:
                    where = posting.meta or {}
                    _reserved(self, where.get("filename", filename), where.get("lineno", lineno), item.key)
                    continue
                kept.append(item)
            items = kept
        return method(self, filename, lineno, *head, items)

    return transaction


def _refusing_location(method: Callable[..., Any], *, report: bool) -> Callable[..., Any]:
    """`pushmeta` reports a location key once, at its own line, and never pushes it; `popmeta` drops it."""

    @functools.wraps(method)
    def stack(self: Any, filename: str, lineno: int, key: Any) -> Any:
        name = key if isinstance(key, str) else key[0]
        if name in LOCATION_KEYS:
            if report:
                _reserved(self, filename, lineno, name)
            return None
        return method(self, filename, lineno, key)

    return stack


def _restore_include_paths(raw: bytes, options: dict[str, Any]) -> None:
    """Put each parsed include target back in the spelling the file has it in.

    Normalization is for the names a ledger declares; an include target names
    a file, and the loader opens and reports it under exactly that string.
    Read as NFC, a path with a decomposed component came back respelled: the
    include lines `bea` stages with absolute paths then reported every
    included file under a name no map-back table held, so a write took an
    error already in the books for a new one and quoted the staged copy
    (w5/144), and a normalization-sensitive volume could not open it at all.
    """
    from bea_engine.ledger.text import iter_includes

    written = [span.target for span in iter_includes(raw)]
    restored = []
    for target in options.get("include") or ():
        same = next((name for name in written if unicodedata.normalize("NFC", name) == target), None)
        if same is not None:
            written.remove(same)
        restored.append(target if same is None else same)
    options["include"] = restored


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
