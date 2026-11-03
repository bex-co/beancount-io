"""Error categories and the exit codes they map to.

One table, used by every command, so a caller can branch on the exit status
without parsing messages:

| code | category     | meaning                                                       |
| ---- | ------------ | ------------------------------------------------------------- |
| 0    | —            | success                                                       |
| 1    | `validation` | ledger or validation error (also the catch-all runtime error) |
| 2    | `usage`      | bad arguments, missing target, missing extra, input needed    |
| 3    | `auth`       | authentication or permission                                  |
| 4    | `conflict`   | conflict, or a write whose outcome is unknown                 |

There is no sixth category: every exit code in that table maps to exactly one
category name, so a caller can branch on either and get the same answer.
"""

from __future__ import annotations

import json
import os
from collections.abc import Mapping
from typing import Any

EXIT_VALIDATION = 1
EXIT_USAGE = 2
EXIT_AUTH = 3
EXIT_CONFLICT = 4


class BeaError(Exception):
    """An error with a documented category and exit code.

    The base class is the catch-all, and it answers `validation`/1 rather than
    inventing a category the table above does not list — an undocumented value
    in this field is worse than a coarse one, because a script branching on it
    has nothing to match.
    """

    category = "validation"
    exit_code = EXIT_VALIDATION
    #: Not one of bea's own refusals: a Python exception the frontend did not
    #: expect, whose traceback only `--debug` shows.
    unexpected = False
    #: The HTTP status of the server answer this error reports, when there was one.
    http_status: int | None = None

    def __init__(
        self,
        message: str,
        *,
        request_id: str | None = None,
        details: list[str] | None = None,
        result: dict[str, Any] | None = None,
        traceback: str | None = None,
    ) -> None:
        super().__init__(message)
        self.request_id = request_id
        self.details = details or []
        self.result = result
        self.traceback = traceback


class LedgerError(BeaError):
    """The ledger does not load, or a directive failed validation."""

    category = "validation"
    exit_code = EXIT_VALIDATION


class UsageError(BeaError):
    """The invocation is wrong: bad arguments, no target, a missing extra, or input needed."""

    category = "usage"
    exit_code = EXIT_USAGE


def refuse_json(command: str, *, hint: str, when: str = "") -> None:
    """Raise UsageError when global ``--json`` was set for a text-only command.

    ``when`` narrows the refusal to the one form of the command that is text-only.
    """
    from cli import context

    if context.current().json_output:
        scope = f" {when}" if when else ""
        raise UsageError(f"bea {command} has no JSON output{scope}. {hint}")


class AuthError(BeaError):
    """Not authenticated, or not permitted."""

    category = "auth"
    exit_code = EXIT_AUTH


class SignalError(BeaError):
    """The engine was killed by a signal and produced no result.

    A `BeaError` by category and exit code; the subclass exists so a batched
    call can tell a signal death — which a per-file rerun can isolate — from
    any other engine failure.
    """

    def __init__(
        self,
        message: str,
        *,
        signal_name: str,
        hint: str,
        request_id: str | None = None,
        details: list[str] | None = None,
    ) -> None:
        super().__init__(message, request_id=request_id, details=details)
        self.signal_name = signal_name
        self.hint = hint


class ConflictError(BeaError):
    """The server rejected a stale change, or a write's outcome is unknown."""

    category = "conflict"
    exit_code = EXIT_CONFLICT


class EngineError(BeaError):
    """The managed Beancount engine is missing or damaged.

    A `BeaError` by category and exit code; the subclass exists so a fail-open
    pre-check can tell an unusable managed engine — which its fallback needs
    too, so falling through would only install it twice or crash the same
    way — from a ledger finding (w5/784, w5/785). A broken `$BEA_ENGINE_PYTHON`
    override stays a plain `BeaError`: the native tool beside it may still
    work when only the helper's import fails.
    """

    category = "validation"
    exit_code = EXIT_VALIDATION


BY_CATEGORY: dict[str, type[BeaError]] = {
    "validation": LedgerError,
    "usage": UsageError,
    "auth": AuthError,
    "conflict": ConflictError,
}
"""The table above, as code. The engine reports the same category names, so one
crossing the process boundary is looked up here rather than translated into a
second vocabulary."""


def request_id_from(headers: Any) -> str | None:
    """Pull the backend's request id out of response headers so support can trace the call."""
    if headers is None:
        return None
    for name in ("x-request-id", "x-amzn-requestid", "cf-ray"):
        value = headers.get(name)
        if value:
            return str(value)
    return None


def redirect_error(status: int, headers: Mapping[str, str] | None) -> BeaError:
    """A redirect instead of the API, with its target but no query or fragment.

    Shared by cloud commands and the assistant's SDK response translation so
    a proxy or captive portal never reads as a rejected credential or a lost
    connection.
    """
    from urllib.parse import urlsplit, urlunsplit

    from cli.utils import single_line

    location = headers.get("location") if headers is not None else None
    target = ""
    if location:
        parts = urlsplit(location)
        target = f" to {single_line(urlunsplit((parts.scheme, parts.netloc, parts.path, '', '')))}"
    return BeaError(
        f"Unexpected redirect (HTTP {status}){target}; bea does not follow redirects. "
        "Check that BEA_API_URL, if set, names the API with https:// and the right host, "
        "and that no proxy or captive portal is answering for it.",
        request_id=request_id_from(headers),
    )


def server_message(body: object) -> str | None:
    """Read a sentence from nested API/SDK envelopes without printing raw JSON.

    Gateways can put an encoded error envelope inside another error's message.
    Bound the unwrapping; unsupported, malformed, or deeper bodies leave the
    caller's HTTP-status fallback intact.
    """
    raw = isinstance(body, str)
    for _ in range(8):
        if isinstance(body, Mapping):
            raw = False
            message = body.get("message")
            body = message if isinstance(message, str) and message.strip() else body.get("error")
        elif isinstance(body, str):
            # A leading byte-order mark is no whitespace to `strip()`, so a
            # marked HTML page passed as the message (w5/649).
            sentence = body.lstrip("\ufeff").strip()
            if not sentence:
                return None
            try:
                body = json.loads(sentence)
            except ValueError:
                if sentence.startswith(("{", "<")):
                    return None
                # A proxy's HTML or text error page is no sentence: printed
                # whole, the user read 18 lines of markup instead of the
                # status (w5/482). A short plain-text line still passes.
                if raw and ("\n" in sentence or len(sentence) > _RAW_SENTENCE_LIMIT):
                    return None
                return sentence
            except RecursionError:
                return None
        else:
            return None
    return None


_RAW_SENTENCE_LIMIT = 200


def error_code(body: object) -> str | None:
    """The v1 envelope's `error.code`, when the body carries one."""
    error = body.get("error") if isinstance(body, Mapping) else None
    code = error.get("code") if isinstance(error, Mapping) else None
    return code if isinstance(code, str) else None


def _metadata_text(body: object, key: str) -> str | None:
    """One string field of the v1 envelope's `error.metadata`."""
    error = body.get("error") if isinstance(body, Mapping) else None
    metadata = error.get("metadata") if isinstance(error, Mapping) else None
    value = metadata.get(key) if isinstance(metadata, Mapping) else None
    return value if isinstance(value, str) else None


def limit_owner(body: object) -> str | None:
    """Whose plan set a limit, from the v1 envelope's `error.metadata`."""
    return _metadata_text(body, "limitOwner")


def quota_scope(body: object) -> str | None:
    """Which AI quota refused a request: `account_monthly` or `shared_service` (w3/m52)."""
    return _metadata_text(body, "quotaScope")


def blocked_until(body: object) -> str | None:
    """When a refused quota reopens, as the server's ISO timestamp."""
    return _metadata_text(body, "blockedUntil")


# What to do about a limit, by whose plan set it. A limit no plan sets has none.
_LIMIT_NEXT_STEPS = {
    "REQUESTER": "Your plan sets this limit; upgrading raises it.",
    "LEDGER_OWNER": "The ledger owner's plan sets this limit, so only they can raise it.",
}


def error_from_status(
    status: int,
    message: str | None,
    *,
    request_id: str | None = None,
    code: str | None = None,
    owner: str | None = None,
) -> BeaError:
    """Map a v1 HTTP status to the documented category, keeping the server's words.

    One deterministic table, so a script can branch on the exit code and a
    person reads the server's own message rather than a paraphrase.
    """
    detail = message or f"HTTP {status}"
    # A plan limit answers 403, but it is not a credential problem: the
    # server's sentence names the limit and the count, and `owner` says who
    # can change it.
    if code == "RESOURCE_LIMIT_REACHED":
        next_step = _LIMIT_NEXT_STEPS.get(owner or "")
        return BeaError(f"{detail} {next_step}" if next_step else detail, request_id=request_id)
    if status == 401:
        return AuthError(f"Not authorized ({detail}). {_auth_remedy()}", request_id=request_id)
    if status == 403:
        return AuthError(
            f"Not authorized ({detail}). Check that your account and credential have permission for this action.",
            request_id=request_id,
        )
    if status == 409:
        return ConflictError(detail, request_id=request_id)
    if status == 400:
        return UsageError(detail, request_id=request_id)
    if status == 429:
        return BeaError(f"Rate limited ({detail}). Wait a moment and retry.", request_id=request_id)
    if status in _GATEWAY_TIMEOUTS:
        return GatewayTimeout(f"Server error ({detail}).", status=status, request_id=request_id)
    if status in {521, 523}:
        # Cloudflare could not connect to the origin, unlike 522, which can
        # also mean a request went unacknowledged on an established connection.
        connection = f"HTTP {status}" if detail == f"HTTP {status}" else f"HTTP {status}: {detail}"
        return BeaError(f"Could not reach the server ({connection}).", request_id=request_id)
    if status >= 500:
        return BeaError(f"Server error ({detail}).", request_id=request_id)
    return BeaError(detail, request_id=request_id)


def _auth_remedy() -> str:
    """What to do about a rejected credential, which depends on which one is in use.

    `BEA_TOKEN` takes precedence over the stored file unconditionally, so
    telling that caller to log in sends them through a browser ceremony to
    write a `credentials.json` the next command will not read — and an
    unattended runner cannot follow it at all. `bea cloud logout` already words
    this case correctly; this is the same sentence for the rejection path.

    Building a message must never be what fails, so a credential store that
    cannot be read falls back to the advice that suits the common case.
    """
    from cli.auth.credentials import ENVIRONMENT, load_credentials

    try:
        creds = load_credentials()
    except Exception:
        creds = None
    if creds is not None and creds.source == ENVIRONMENT:
        return (
            "BEA_TOKEN is the credential in use, and 'bea cloud login' does not change that: "
            "correct or unset BEA_TOKEN, or mint a new token."
        )
    return "Run 'bea cloud login'."


#: bea's global options, each with a command line that places it (w5/243).
_PLACEMENTS = {
    "-f": "bea -f main.bean check",
    "--file": "bea --file main.bean check",
    "--json": "bea --json list transaction",
    "--debug": "bea --debug import statement.csv",
    "--no-input": "bea --no-input check",
    "--yes": "bea --yes COMMAND",
    "-y": "bea -y COMMAND",
    "--strict": "bea --strict balance",
    "--offline": "bea --offline balance",
    "--strict-prices": "bea --strict-prices check",
}


def placement_hint(option: str) -> str | None:
    """Where a bea global option goes, when `option` is one."""
    example = _PLACEMENTS.get(option)
    return f"Place {option} before the command, for example: {example}." if example else None


def refuse_misplaced_global(
    command: str, args: list[str], defined: frozenset[str], *, reads: str | None = None, json_output: bool = True
) -> None:
    """Refuse a bea global option after a forwarded command that does not define it itself.

    Upstream answered with its own "No such option" and no hint, where every
    bea-owned command says where the option goes (w5/416).

    A command that ignores `--file` names what it reads instead in `reads`
    (`""` when it reads no ledger), and one without JSON output passes
    `json_output=False`. The generic "Place -f before the command" sent
    `doctor`, `treeify` and `example` to a form that failed (w5/620).
    """
    for index, arg in enumerate(args):
        if arg == "--":
            return
        name = arg.split("=", 1)[0]
        if name in defined:
            continue
        if name in ("-f", "--file") and reads is not None:
            raise UsageError(_file_as_argument(command, args, index, reads))
        if name == "--json" and not json_output:
            raise UsageError(f"bea {command} has no JSON output; drop --json.")
        hint = placement_hint(name)
        if hint is not None:
            raise UsageError(f"{name} is a bea option, not one of bea {command}'s. {hint}")


def _file_as_argument(command: str, args: list[str], index: int, reads: str) -> str:
    """The refusal of `--file` on a command that takes its file as an argument, with that form."""
    import shlex

    name, given, value = args[index].partition("=")
    if not reads:
        return f"bea {command} reads no ledger, so {name} does nothing here; drop it."
    taken = 1 if given else 2
    if not given:
        value = args[index + 1] if index + 1 < len(args) else "FILE"
    rest = [*args[:index], *args[index + taken :]]
    # No sentence period after the command: `… main.bean .` read `..` (w5/839).
    suggested = shlex.join(["bea", *command.split(), value, *rest])
    return f"bea {command} takes {reads} as an argument, not {name}: {suggested}"


def to_bea_error(exc: BaseException | str) -> BeaError:
    """Classify anything a command can raise into one documented category."""
    if isinstance(exc, str):
        return BeaError(_redact_secrets(exc))
    if isinstance(exc, BeaError):
        return exc

    # Typer vendors its own copy of click, so this must be typer's class, not
    # the one an `import click` would resolve to.
    import typer

    if isinstance(exc, typer.BadParameter):
        return UsageError(exc.format_message())
    # The parent class works with both standalone Click (older Typer) and
    # Typer's vendored Click, without a dependency on either private module.
    click_usage_error: type[Any] = typer.BadParameter.__bases__[0]
    if isinstance(exc, click_usage_error):
        missing_subcommand = _missing_subcommand_message(exc)
        if missing_subcommand is not None:
            return UsageError(missing_subcommand)
        option = getattr(exc, "option_name", None)
        placement = placement_hint(option) if isinstance(option, str) else None
        hint = f" {placement}" if placement else ""
        # `format_message`, not `str`: only it carries Click's "(Possible
        # options: --account)" for a misspelled option (w5/444).
        return UsageError(exc.format_message() + hint + _unknown_command_hint(exc))

    import httpx

    if isinstance(exc, httpx.TransportError):
        # httpx transport errors frequently stringify to nothing at all, which
        # would leave the caller an empty message and no clue the network failed.
        # Never echo the exception text: LocalProtocolError can embed a Bearer
        # token that failed header validation.
        return BeaError(f"Could not reach the server ({type(exc).__name__}).")

    if isinstance(exc, FileNotFoundError):
        return UsageError(_redact_secrets(str(exc)))

    error = BeaError(_redact_secrets(str(exc) or f"{type(exc).__name__} (no detail)."))
    error.unexpected = True
    return error


def _missing_subcommand_message(exc: Any) -> str | None:
    """A bare group in JSON mode names its choices instead of embedding help."""
    # This exception exists in standalone and vendored Click. Recognize it
    # after the UsageError check without importing either private namespace.
    if type(exc).__name__ != "NoArgsIsHelpError":
        return None
    from cli import context

    ctx = getattr(exc, "ctx", None)
    if not context.current().json_output or ctx is None:
        return None
    names = [
        name
        for name in ctx.command.list_commands(ctx)
        if (command := ctx.command.get_command(ctx, name)) is not None and not command.hidden
    ]
    return f"Missing subcommand: choose one of {', '.join(names)}." if names else "Missing subcommand."


# Names other tools and docs use for a bea subcommand, suggested only where
# the group has that command (w5/444).
_COMMAND_ALIASES = {
    "bs": "balance-sheet",
    "is": "income-statement",
    "pnl": "income-statement",
    "tb": "trial-balance",
    "account": "open",
    "accounts": "open",
    "txn": "transaction",
    "txns": "transaction",
    "transactions": "transaction",
}


def _unknown_command_hint(exc: Any) -> str:
    """A next step for "No such command" when Click found no close match.

    `bea report bs` and `bea help` ended at a bare "No such command" (w5/444).
    """
    import ast
    import re

    match = re.fullmatch(r"No such command ('.*'|\".*\")\.", exc.message)
    ctx = getattr(exc, "ctx", None)
    if match is None or ctx is None:
        return ""
    name = ast.literal_eval(match.group(1))
    # Named `bea` however it was started (`python -m cli.main` in a checkout).
    path = " ".join(["bea", *ctx.command_path.split()[len(ctx.find_root().command_path.split()) :]])
    if name.lower() == "help":
        return f" Did you mean '{path} --help'?"
    alias = _COMMAND_ALIASES.get(name.lower())
    if alias is not None and alias in ctx.command.list_commands(ctx):
        return f" Did you mean '{alias}'?"
    return f" Run '{path} --help' to list its commands."


def _redact_secrets(text: str) -> str:
    """Strip credential-shaped fragments out of exception text before display."""
    import os
    import re

    redacted = text
    token = os.environ.get("BEA_TOKEN")
    if token:
        redacted = redacted.replace(token, "[redacted]")
        redacted = redacted.replace(repr(token.encode()), "[redacted]")
        redacted = redacted.replace(repr(f"Bearer {token}".encode()), "[redacted]")
    # Generic Bearer spill even when the env var was already cleared.
    return re.sub(r"Bearer [^\s'\"]+", "Bearer [redacted]", redacted)


class UnreadableSuccess(BeaError):
    """A success status whose body bea could not read.

    A read reports it like any other unreadable answer. A write most likely
    took effect, so the write paths say the outcome is unknown instead: called
    a plain failure, the natural retry hit 409 or 404 (w5/422).
    """

    def __init__(self, message: str, *, status: int, request_id: str | None = None) -> None:
        super().__init__(message, request_id=request_id)
        self.status = status


#: Gateway failures that cannot establish whether a write took effect.
#: Cloudflare 522 includes both connection and resource-request ACK timeouts.
_GATEWAY_TIMEOUTS = frozenset({504, 520, 522, 524})


class GatewayTimeout(BeaError):
    """A gateway failure that leaves the origin's write outcome unknown.

    A read reports it as the server error it is. A write may have taken effect,
    so the write paths say the outcome is unknown, as for bea's own timeout:
    called a plain "Server error", the retry hit 409 or 404 (w5/517).
    """

    def __init__(self, message: str, *, status: int, request_id: str | None = None) -> None:
        super().__init__(message, request_id=request_id)
        self.status = status


def unknown_write_outcome(operation: str, exc: BaseException) -> ConflictError:
    """A write that timed out, lost its connection, or got an answer bea could not read.

    The caller is told the outcome is unknown, and how to find out, rather than
    being handed a success or a plain failure that invites a blind retry.
    """
    if isinstance(exc, GatewayTimeout):
        return ConflictError(
            f"{operation} was not confirmed by the server's gateway (HTTP {exc.status}). "
            "The outcome is unknown — check the current state before retrying.",
            request_id=exc.request_id,
        )
    if isinstance(exc, UnreadableSuccess):
        return ConflictError(
            f"{operation} was answered with HTTP {exc.status}, but the response could not be read. "
            "It most likely took effect, but the outcome is unknown — check the current state before retrying.",
            request_id=exc.request_id,
        )
    return ConflictError(
        f"{operation} did not complete cleanly ({type(exc).__name__}). "
        f"The outcome is unknown — check the current state before retrying."
    )


_PROXY_VARIABLES = frozenset({"all_proxy", "https_proxy", "http_proxy"})


def proxy_refusal(exc: Exception) -> UsageError | None:
    """Name unusable proxy settings without exposing their credential-bearing URLs.

    Match httpx's effective proxy selection and parsing before attributing a
    constructor failure to proxies. Shadowed settings and NO_PROXY=* must not
    disguise unrelated errors. The remedy clears every unusable spelling so
    removing one does not reveal another (w5/518, w5/699).
    """
    from importlib.util import find_spec
    from urllib.request import getproxies

    from httpx import InvalidURL, Proxy

    missing_socks = isinstance(exc, ImportError) and "socksio" in str(exc).lower()
    if not missing_socks and not isinstance(exc, (ValueError, InvalidURL)):
        return None
    effective = getproxies()
    if "*" in {host.strip() for host in effective.get("no", "").split(",")}:
        return None

    def parsed(value: str) -> Proxy:
        return Proxy(value if "://" in value else f"http://{value}")

    caused = False
    for scheme in ("http", "https", "all"):
        if not (value := effective.get(scheme)):
            continue
        try:
            proxy = parsed(value)
        except (ValueError, InvalidURL) as problem:
            caused |= type(exc) is type(problem) and str(exc) == str(problem)
        else:
            caused |= missing_socks and proxy.url.scheme in {"socks5", "socks5h"}
    if not caused:
        return None

    no_socks = missing_socks or find_spec("socksio") is None
    named = []
    socks_only = True
    for name, value in sorted(os.environ.items()):
        if name.lower() not in _PROXY_VARIABLES or not value:
            continue
        try:
            proxy = parsed(value)
        except (ValueError, InvalidURL):
            pass
        else:
            if not (no_socks and proxy.url.scheme in {"socks5", "socks5h"}):
                continue
        named.append(name)
        socks_only &= value.lower().startswith("socks")
    if not named:
        return UsageError(
            "The system proxy configuration is unsupported or invalid. Correct it, or use an HTTP(S) proxy for bea."
        )
    plural = len(named) > 1
    setting = " and ".join(named)
    if socks_only:
        reason = (
            f"{setting} {'name SOCKS proxies' if plural else 'names a SOCKS proxy'}, "
            "which bea's HTTP client does not support."
        )
    else:
        reason = (
            f"{setting} {'name unsupported or invalid proxies' if plural else 'names an unsupported or invalid proxy'}."
        )
    clearing = " ".join(f"{name}=" for name in named)
    return UsageError(
        f"{reason} Unset {'them' if plural else 'it'} for bea "
        f"(for example {clearing} bea …), or use an HTTP(S) proxy instead."
    )
