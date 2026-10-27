"""No-code OFX/QFX import through upstream beangulp's OFX example.

`bea-engine import --ofx` drives this importer instead of a Python CONFIG:
statements are found and dated by the importer beangulp itself ships as
`examples/importers/ofx.py`, and bea completes each row with a counter leg
(`--rules`, `--default-account`, or the `!` review queue, exactly as the
CSV path does) and a stable import-id. Parsing stays upstream on purpose
— OFX dialects are its problem — while legs and identity stay bea
semantics.

Only bank and credit-card statements import this way: the upstream
example reads `STMTRS` blocks, so a file holding nothing else is refused
with a pointer at `--config`, as is a file mixing several source accounts
(upstream matches one account per importer). A source account is its
`ACCTID` together with the `BANKID` of its account aggregate: two banks
can issue the same account number (w5/1031). Ledger balances are
ignored entirely in v1 — no `Balance` directive is emitted, and
`LEDGERBAL` is not even parsed.
"""

from __future__ import annotations

import codecs
import re
import unicodedata
import warnings
from pathlib import Path
from typing import Any

from bea_engine.csv_mapper import CsvRule, match_rule
from bea_engine.ledger.text import require_commodity
from bea_engine.protocol import UsageError

OFX_SUFFIXES = (".ofx", ".qfx")

#: Upstream `find_acctids`' `<ACCTID>` pattern plus the `<BANKID>` and
#: account-aggregate tags around it, case-insensitive: the multi-account
#: refusal must see the same statements the lowercasing soup parser will.
#: The frontend's memory key (`cli.commands.import_._ofx_identities`) reads
#: the same identity; the two scans are kept identical by hand (ADR014).
_ACCOUNT_TAGS = re.compile(r"<(/?)(BANKACCTFROM|BANKACCTTO|CCACCTFROM|CCACCTTO|BANKID|ACCTID)>([^<]*)", re.IGNORECASE)


def _source_accounts(text: str) -> list[tuple[str | None, str]]:
    """The distinct (BANKID or None, ACCTID) source accounts in the text, in order.

    Each `<ACCTID>` pairs with the `<BANKID>` read since its account
    aggregate opened; an aggregate boundary or a consumed ACCTID clears it.
    Card statements carry no BANKID. Values are read raw, newlines
    included, so `1` and `1\n` are stripped to one id; an empty ACCTID is
    no account.
    """
    accounts: list[tuple[str | None, str]] = []
    bankid: str | None = None
    # A transfer's `BANKACCTTO`/`CCACCTTO` names the recipient, not a second
    # source: counted, it refused a single-account statement (w5/1069).
    recipient = False
    for match in _ACCOUNT_TAGS.finditer(text):
        tag = match.group(2).upper()
        value = match.group(3).strip()
        if tag not in ("BANKID", "ACCTID"):
            bankid = None
            recipient = tag.endswith("ACCTTO") and not match.group(1)
        elif recipient:
            continue
        elif match.group(1):
            continue  # OFX 2's `</BANKID>` closes the element, not the aggregate.
        elif tag == "BANKID":
            bankid = value or None
        else:
            if value:
                accounts.append((bankid, value))
            bankid = None
    return list(dict.fromkeys(accounts))


# Mirrors `cli.engine.launch.require_feature`'s message for direct engine
# callers; the frontend cannot be imported from here (ADR014), so the two
# texts are kept identical by hand. Update both together.
BEANGULP_HINT = "Engine feature 'beangulp' is not enabled. Run: bea engine enable beangulp"

# `CHARSET:` values the OFX spec allows, to the codec that reads them.
# Unknown values are refused rather than guessed: a wrong guess rewords
# narrations, and reworded narrations mint new content-hash import-ids.
_OFX_CHARSETS = {
    "utf-8": "utf-8-sig",
    "usascii": "ascii",
    "us-ascii": "ascii",
    "iso-8859-1": "latin-1",
    "windows-1252": "cp1252",
    "1252": "cp1252",
}

# Tags `extract` reads, directly or through `build_transaction`: present
# but empty they crash upstream's `contents[0]` with an IndexError, so
# they are dropped from the soup first and read as absent instead.
_OFX_ROW_TAGS = ("name", "memo", "trntype", "dtposted", "trnamt")


def _decode_ofx(source: Path) -> str:
    """The file's text, decoded per its OFX header rather than the locale.

    OFX 1.x declares its charset in the `KEY:VALUE` block before the first
    tag; OFX 2.x declares it in the XML prolog, defaulting to UTF-8.
    """
    raw = source.read_bytes()
    # One leading UTF-8 signature, as some exporters write before the XML
    # prolog: read as part of the ASCII header it refused the file (w5/1032).
    signed = raw.startswith(codecs.BOM_UTF8)
    head, sep, _ = raw[len(codecs.BOM_UTF8) if signed else 0 :].partition(b"<")
    if not sep:
        raise UsageError(f"{source} is not an OFX file: no OFX header or XML prolog found.")
    try:
        headers = head.decode("ascii")
    except UnicodeDecodeError:
        raise UsageError(f"{source} is not an OFX file: cannot read its header.") from None
    match = re.search(r"^charset\s*:\s*(\S+)", headers, re.IGNORECASE | re.MULTILINE)
    declared = match.group(1).strip().lower() if match else None
    if declared is None:
        prolog = re.search(r'<\?xml[^?]*encoding\s*=\s*["\']([^"\']+)', raw[:500].decode("ascii", "ignore"))
        declared = prolog.group(1).strip().lower() if prolog else "utf-8"
    codec = _OFX_CHARSETS.get(declared)
    if codec is None:
        raise UsageError(f"{source} declares OFX CHARSET {declared!r}, which bea cannot decode; re-export as UTF-8.")
    if signed and codec not in ("utf-8-sig", "ascii"):
        raise UsageError(
            f"{source} starts with a UTF-8 byte-order mark but declares OFX CHARSET {declared}; "
            "re-export it in one encoding."
        )
    if signed:
        codec = "utf-8-sig"
    try:
        return raw.decode(codec)
    except UnicodeDecodeError as exc:
        raise UsageError(f"{source} cannot be decoded as {codec} (OFX CHARSET {declared}): {exc}.") from None


def _tag_text(stmttrn: Any, name: str) -> str | None:
    """The tag's stripped text, or None when the tag is absent or empty."""
    node = stmttrn.find(name)
    if node is None or not node.contents:
        return None
    text = node.contents[0]
    if not isinstance(text, str):
        return None
    return text.strip()


def _drop_empty_tags(stmttrn: Any) -> None:
    """Drop present-but-empty row tags so upstream reads them as absent.

    An empty `<MEMO></MEMO>` means what an absent memo means, but
    upstream's `contents[0]` raises IndexError on it; a nested tag rather
    than text raises AttributeError on `.strip()`. Dropping them first
    turns both into the absent-tag behavior each tag already has: name,
    memo, and trntype fall out of the narration, while an empty DTPOSTED
    or TRNAMT fails the presence check with the row named.
    """
    for name in _OFX_ROW_TAGS:
        node = stmttrn.find(name)
        if node is None:
            continue
        text = node.contents[0] if node.contents else None
        if not isinstance(text, str):
            node.decompose()


class OfxImporter:
    """A beangulp-shaped importer over upstream's OFX example (w22/m2).

    A plain class like `CsvImporter`: the import pipeline only calls
    `account()` and `extract()`. The beangulp import stays inside
    `extract()` so the engine answers its missing-feature hint instead of
    failing to load where the feature is not installed.
    """

    def __init__(self, account: str, rules: list[CsvRule] | None = None, default_account: str = "") -> None:
        self._account = account
        self._rules = rules or []
        self._default_account = default_account
        # 1-based OFX row numbers without a FITID, for the import-id note.
        self.missing_fitids: list[int] = []

    def identify(self, filepath: str) -> bool:
        return filepath.lower().endswith(OFX_SUFFIXES)

    def account(self, filepath: str) -> str:
        return self._account

    def extract(self, filepath: str, existing: Any) -> list[Any]:
        from beancount.core.amount import Amount
        from beancount.core.data import Posting, new_metadata

        source = Path(filepath)
        text = _decode_ofx(source)
        try:
            from examples.importers import ofx as upstream
        except ImportError:
            raise UsageError(BEANGULP_HINT) from None
        # Upstream's `find_acctids` matches `<ACCTID>` case-sensitively, but
        # the soup parser lowercases tags, so a mixed-case second account
        # would parse yet escape the refusal. Scan case-insensitively so the
        # refusal sees every statement the parser will. Two banks' statements
        # under one account number are two accounts too (w5/1031); one
        # account's statements in several currencies are not.
        accounts = _source_accounts(text)
        if len(accounts) > 1:
            numbers = [acctid for _bankid, acctid in accounts]
            reused = len(set(numbers)) < len(numbers)
            joined = ", ".join(
                f"{acctid} at bank {bankid}" if reused and bankid is not None else acctid for bankid, acctid in accounts
            )
            raise UsageError(
                f"{source} holds transactions for {len(accounts)} accounts ({joined}); import one "
                "account per run with --config and one importer per account."
            )
        try:
            from bs4 import BeautifulSoup, FeatureNotFound, XMLParsedAsHTMLWarning
        except ImportError:
            raise UsageError(BEANGULP_HINT) from None
        try:
            with warnings.catch_warnings():
                # OFX 1.x is SGML, not XML; parsed as HTML by design, as upstream does.
                warnings.simplefilter("ignore", XMLParsedAsHTMLWarning)
                soup = BeautifulSoup(text, "lxml")
        except FeatureNotFound:
            raise UsageError(BEANGULP_HINT) from None
        # Balances are ignored in v1, not even parsed: a malformed LEDGERBAL
        # must not fail a run that would never emit its Balance directive.
        for ledgerbal in soup.find_all("ledgerbal"):
            ledgerbal.decompose()
        self._refuse_currencyless_statements(source, soup)

        rows: list[Any] = []
        lineno = 0
        row = 0
        for _acctid, currency, transactions, _balance in upstream.find_statement_transactions(soup):
            try:
                currency = require_commodity(unicodedata.normalize("NFC", currency.strip()))
            except ValueError as exc:
                raise UsageError(f"{source}: statement currency {exc}") from None
            for stmttrn in transactions:
                row += 1
                _drop_empty_tags(stmttrn)
                fitid = _tag_text(stmttrn, "fitid")
                # A correction replaces or deletes a transaction the bank sent
                # before; built as an ordinary row it became another payment
                # (a 10 USD charge corrected to 12 booked 22), and a deletion
                # a zero one (w5/1053). Refused before anything is written.
                action = _tag_text(stmttrn, "correctaction")
                corrected = _tag_text(stmttrn, "correctfitid")
                if action or corrected:
                    raise UsageError(
                        f"{source}: transaction {row} (FITID {fitid or '(none)'}) is a bank correction "
                        f"({action or 'CORRECTACTION missing'} of FITID {corrected or '(none)'}), which bea import "
                        "does not apply. Reconcile it by hand (`bea update` or edit the original entry), or remove it "
                        "from the file and import the rest. Nothing was written."
                    )
                # A row-level CURRENCY says the amount is in another currency
                # at CURRATE; the upstream builder ignores it and booked 10 EUR
                # as 10 USD (w5/1061). ORIGCURRENCY (already converted) is fine.
                override = stmttrn.find("currency")
                if override is not None:
                    symbol = _tag_text(override, "cursym")
                    if symbol and symbol.upper() != currency:
                        rate = _tag_text(override, "currate")
                        raise UsageError(
                            f"{source}: transaction {row} (FITID {fitid or '(none)'}) states its amount in "
                            f"{symbol} at {rate or 'an unstated rate'} {currency} per {symbol}, which bea import "
                            f"does not convert; it would be booked as {currency}. Convert it in the file or record it "
                            "by hand, and import the rest. Nothing was written."
                        )
                if not fitid:
                    self.missing_fitids.append(row)
                base = self._build_row(source, row, upstream, stmttrn, currency)
                source_posting = base.postings[0]
                matched = match_rule(self._rules, base.narration)
                if matched is not None:
                    counter_account, flag = matched.account, "*"
                else:
                    counter_account, flag = self._default_account, "!"
                # `copy_negate` flips the sign without touching the
                # coefficient; unary minus would round through the decimal
                # context (see `csv_mapper._negated`).
                counter = Posting(
                    counter_account,
                    Amount(source_posting.units.number.copy_negate(), currency),
                    None,
                    None,
                    None,
                    None,
                )
                meta = new_metadata(filepath, lineno)
                lineno += 1
                if fitid:
                    meta["fitid"] = fitid
                # The preview loop's rule column pops this key, as it does for
                # CSV rows; the name is historical, the channel is no-code.
                meta["_csv_rule"] = matched.pattern if matched is not None else "unmatched"
                if matched is not None:
                    meta.update(matched.meta)
                rows.append(
                    base._replace(meta=meta, flag=flag, postings=[source_posting, counter]),
                )
        if not rows:
            hint = (
                " Brokerage and investment statements need a Python importer (--config)."
                if "invstmt" in text.lower()
                else ""
            )
            raise UsageError(f"{source} holds no bank or credit-card transactions to import.{hint}")
        return rows

    def _refuse_currencyless_statements(self, source: Path, soup: Any) -> None:
        """Refuse a bank statement upstream would silently skip for no CURDEF."""
        for stmtrs in soup.find_all(re.compile("^(cc)?stmtrs$")):
            if not _tag_text(stmtrs, "curdef"):
                raise UsageError(f"{source}: a bank statement names no CURDEF currency; cannot price its rows.")

    def _build_row(self, source: Path, row: int, upstream: Any, stmttrn: Any, currency: str) -> Any:
        """One single-legged transaction from upstream, with row-located errors."""
        from decimal import Decimal, InvalidOperation

        where = f"{source} OFX row {row}"
        if _tag_text(stmttrn, "dtposted") is None:
            raise UsageError(f"{where} has no DTPOSTED date; cannot place it.")
        raw_amount = _tag_text(stmttrn, "trnamt")
        if raw_amount is None:
            raise UsageError(f"{where} has no TRNAMT amount; cannot post it.")
        try:
            Decimal(raw_amount)
        except InvalidOperation:
            # Beancount's D, which upstream converts with, reports garbage
            # as ValueError — the same type a bad DTPOSTED raises — so the
            # amount is judged here, where the row names the right tag.
            raise UsageError(f"{where} has a TRNAMT beangulp cannot parse ({raw_amount!r}).") from None
        try:
            return upstream.build_transaction(stmttrn, "*", self._account, currency)
        except ValueError as exc:
            raise UsageError(f"{where} has a DTPOSTED beangulp cannot parse ({exc}).") from None
