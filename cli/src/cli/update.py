"""Telling a person — never a script — that a newer `bea` has been published.

The rules are the ones the sibling bex CLI settled on, and every one of them
exists to keep this out of the way of automation: the notice needs a terminal,
it is silent under `--json`, `--no-input` and `CI`, `BEA_NO_UPDATE_NOTIFIER`
turns it off outright, the index is asked at most once a day, and *any* failure
prints nothing at all. A CI job must never be interrupted, slowed, or failed by
a courtesy message.

Nothing here rewrites an installed file. The notice points at `bea upgrade`,
which hands the work to whichever package manager owns the install.
"""

from __future__ import annotations

import json
import os
import re
import sys
import threading
import time
from collections.abc import Sequence
from pathlib import Path

from cli.config import config_dir, package_version
from cli.context import env_flag

PROJECT = "beancount-io"

#: Where releases are announced. `BEA_UPDATE_API_URL` repoints it at a fake in tests.
DEFAULT_INDEX_URL = "https://pypi.org"
INDEX_URL_ENV = "BEA_UPDATE_API_URL"
TAP_URL = "https://raw.githubusercontent.com/bex-co/homebrew-tap/main/Formula/bea.rb"
TAP_URL_ENV = "BEA_TAP_FORMULA_URL"
DISABLE_ENV = "BEA_NO_UPDATE_NOTIFIER"

#: One check a day, whatever the outcome was.
CACHE_MAX_AGE_SECONDS = 24 * 60 * 60

#: The whole budget for the check: the socket timeout, and the longest a
#: command will wait for the answer before giving up and printing nothing.
TIMEOUT_SECONDS = 3.0


def cache_path(channel: str = "pypi") -> Path:
    return config_dir() / ("update-check-homebrew.json" if channel == "homebrew" else "update-check.json")


def release_parts(version: str) -> tuple[int, int, int] | None:
    """A canonical `X.Y.Z` release, or `None` for anything else.

    The release channel only ever publishes canonical semver — `release-check.sh`
    refuses to build a tag that is not — so anything else is something this
    module cannot reason about: `0+unknown` from a package with no metadata, a
    checkout's `.dev` version, a local version segment, a pre-release. Those
    stay silent rather than guess, which is also how a development install
    ends up never checking at all.
    """
    parts = version.split(".")
    if len(parts) != 3 or not all(p.isascii() and p.isdigit() for p in parts):
        return None
    major, minor, patch = (int(p) for p in parts)
    return major, minor, patch


def is_release(version: str) -> bool:
    return release_parts(version) is not None


def newer(current: str, latest: str) -> bool:
    """Whether `latest` is strictly newer. Anything unreadable is never newer."""
    here, there = release_parts(current), release_parts(latest)
    return here is not None and there is not None and there > here


def hint(current: str, latest: str) -> str:
    """The one line both the passive notice and `bea --version` print, so they cannot drift."""
    return f"bea {latest} is available (you have {current}) — run 'bea upgrade' to update."


def _stderr_is_a_terminal() -> bool:
    """Whether a person is reading. A redirected or closed stderr counts as nobody."""
    try:
        return sys.stderr.isatty()
    except (AttributeError, ValueError):
        return False


def muted(*, json_output: bool, no_input: bool) -> bool:
    """Every reason to stay quiet that costs nothing to check.

    Deliberately cheap and checked first: resolving the installed version and
    starting a thread are work that a scripted run should never pay for.
    """
    return json_output or no_input or env_flag(DISABLE_ENV) or env_flag("CI") or not _stderr_is_a_terminal()


def read_cache(channel: str = "pypi") -> tuple[float, str] | None:
    """The last check: when it happened, and what it found (`""` for nothing)."""
    try:
        entry = json.loads(cache_path(channel).read_text())
        return float(entry["checked_at"]), str(entry["version"])
    except (OSError, ValueError, KeyError, TypeError):
        return None


def write_cache(checked_at: float, version: str, channel: str = "pypi") -> None:
    """Remember the outcome. Best effort: a read-only home must not break a command."""
    try:
        path = cache_path(channel)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({"checked_at": checked_at, "version": version}))
    except OSError:
        pass


def _fetch_latest(channel: str) -> str:
    """Ask the index for the newest published version. Raises on any failure."""
    # Imported here so that `bea --help` never loads urllib, and so nothing in
    # this module pulls in an HTTP client the default install would rather skip.
    import urllib.request

    base = os.environ.get(INDEX_URL_ENV) or DEFAULT_INDEX_URL
    url = (
        (os.environ.get(TAP_URL_ENV) or TAP_URL) if channel == "homebrew" else f"{base.rstrip('/')}/pypi/{PROJECT}/json"
    )
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": f"bea/{package_version()}"},
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        if channel == "homebrew":
            formula = response.read().decode("utf-8")
            match = re.search(r'^\s*version "(\d+\.\d+\.\d+)"\s*$', formula, re.MULTILINE)
            if not match:
                match = re.search(r"beancount_io-(\d+\.\d+\.\d+)\.tar\.gz", formula)
            return match.group(1) if match else ""
        payload = json.load(response)
    return str(payload["info"]["version"])


def latest_version(*, use_cache: bool = True, now: float | None = None, channel: str = "pypi") -> str | None:
    """The newest published release, or `None` when there is nothing to report.

    Every outcome — a version, an empty answer, a failed fetch — is cached for a
    day, so an offline machine pays one timeout per day rather than one per
    command. `use_cache=False` is for the paths where the user explicitly asked
    (`bea upgrade --check`) and deserves a fresh answer.
    """
    checked_at = time.time() if now is None else now
    if use_cache:
        cached = read_cache(channel)
        if cached is not None and 0 <= checked_at - cached[0] < CACHE_MAX_AGE_SECONDS:
            return cached[1] or None

    try:
        version = _fetch_latest(channel)
    except Exception:
        # A courtesy check has no failure mode worth showing anyone: a bad
        # network, a rate limit, a changed payload all mean "say nothing".
        version = ""
    write_cache(checked_at, version, channel)
    return version or None


_pending: tuple[str, threading.Thread, list[str | None]] | None = None


def start(*, json_output: bool, no_input: bool, channel: str = "pypi") -> None:
    """Begin the daily check alongside the command, so a person waits for nothing."""
    global _pending
    _pending = None
    if muted(json_output=json_output, no_input=no_input):
        return
    version = package_version()
    if not is_release(version):
        return

    found: list[str | None] = [None]

    def check() -> None:
        found[0] = latest_version(channel=channel)

    thread = threading.Thread(target=check, daemon=True)
    thread.start()
    _pending = (version, thread, found)


def suppress() -> None:
    """Drop a check in flight, for a command that speaks about versions itself.

    `bea upgrade` is the case: after it runs, this process still reports the
    version it started with, so the notice would announce a release the user
    just installed.
    """
    global _pending
    _pending = None


def print_notice() -> None:
    """Print the notice after the command's own output, or print nothing.

    Only a run that missed the day's cache can wait here at all, and it waits no
    longer than the fetch's own timeout: a hung index costs the timeout once a
    day and simply skips the notice, because the thread still writes the cache
    that the next run reads.
    """
    global _pending
    pending, _pending = _pending, None
    if pending is None:
        return
    version, thread, found = pending
    thread.join(TIMEOUT_SECONDS)
    latest = found[0]
    if latest is not None and newer(version, latest):
        print(hint(version, latest), file=sys.stderr)


def print_version_hint(version: str, argv: Sequence[str], *, channel: str = "pypi") -> None:
    """The hint `bea --version` may add — from the day's cache, never from the network.

    `--version` is an eager flag: it answers before the root callback has built
    the run context, so the two machine-mode flags are read from `argv` here
    instead. The hint goes to stderr so that stdout stays exactly one parseable
    `bea X.Y.Z` line.
    """
    if muted(json_output="--json" in argv, no_input="--no-input" in argv):
        return
    # Whatever the last check found, however old: a stale answer here can only
    # be wrong in the harmless direction, because once the user has upgraded
    # `newer()` stops reporting it.
    cached = read_cache(channel)
    latest = cached[1] if cached is not None else ""
    if latest and newer(version, latest):
        print(hint(version, latest), file=sys.stderr)
