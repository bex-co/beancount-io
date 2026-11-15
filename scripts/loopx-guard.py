#!/usr/bin/env python3
"""Keep `/loopx` running while its workstream still has actionable work.

The rule — never stop while a next pick exists — is stated four times in
`.agents/skills/loopx/SKILL.md`, and was still broken once: the loop wrote an
end-of-run summary and treated writing it as a turn boundary, naming the next
pick in the same breath. Prose cannot enforce itself. This can.

Each mark belongs to the Claude Code session that armed it: `start` reads the
caller's `CLAUDE_CODE_SESSION_ID`, and the Stop hook consults only the mark of
the session that is stopping. Several sessions can therefore share one
checkout, each running its own loop or none, without blocking each other. (An
earlier version kept one mark per repository and bound it to whichever session
stopped first, so an unrelated session was held to a loop it never started
while the real loop lost its guard.)

A drained loop listens by default: `wait` polls `origin/main` with `git fetch`
and exponential backoff, costs no model tokens, and exits only when the
workstream gains an actionable item, the idle limit passes, or fetch keeps
failing. While that `wait` process is alive the Stop hook lets the turn end and
keeps the mark; a drained loop that is *not* listening is held until it starts
one. `--no-listen` restores the old behaviour: drained means done.

While the orchestrator waits for a background worker, `dispatch <label>` marks
the loop in flight and the Stop hook lets turns end until `settle` (or a
12-hour safety expiry); otherwise every idle turn during a long worker run
would be handed straight back.

A drained workstream may also run routines listed in
`.pm/<wN>/routine/README.md` on origin/main. A routine is a named row holding
any command: a slash command with its arguments, a shell command, or a task in
plain words; the guard schedules it and never interprets it. `wait` exits 5
when one is due: its interval has passed, and the day's routine budget is not
spent. A row runs on its own schedule: `when: always` (the default) means
every interval, whatever changed; `when: changed` also requires one of the
row's `paths` (any path when it lists none) to have changed since the last
run, and
`routine-done` doubles such a row's interval after an empty run (capped at 14
days), resetting it after a run that shipped something. `wait` never sleeps
past the next routine's due time, so a schedule holds even while the board
poll is backed off; board work still wins whenever both are ready. Run state stays in `.git/loopx/`, never on
the public board.

Modes:

    loopx-guard.py start <wN> [--no-listen]
                                arm a loop for the calling Claude Code session
    loopx-guard.py end          disarm the calling session's loop (a genuine Exit)
    loopx-guard.py wait <wN> [--min S] [--max S] [--give-up S] [--chunk S]
                     [--fetch-failures N]
                                block until origin/main gives <wN> actionable work;
                                exit 0 work, 5 routine due, 3 idle limit,
                                4 fetch failing, 10 chunk elapsed (call again)
    loopx-guard.py outcome <wN> <id>
                                where <id> sits on origin/main (JSON)
    loopx-guard.py dispatch <label>
                                mark the calling session's loop as waiting on
                                a background worker (Stop hook lets turns end)
    loopx-guard.py settle       clear the in-flight mark once its worker is verified
    loopx-guard.py routine-due <wN>
                                the next due routine on origin/main (JSON)
    loopx-guard.py routine-done <wN> <name> found|empty
                                record a routine run and reschedule it
    loopx-guard.py              Stop hook: reads the hook payload on stdin and
                                blocks the stop while this session's loop has work
    loopx-guard.py forget       SessionEnd hook: drop the ending session's mark

Outside Claude Code there is no session id and no Stop hook (Codex has
neither), so `start` arms nothing and says so; `wait` and `outcome` work the
same everywhere, and the skill's exit rules still apply.
"""

from __future__ import annotations

import json
import os
import pathlib
import random
import re
import subprocess
import sys
import time

# A stop attempt that makes no progress may repeat; bound it rather than spin.
MAX_BLOCKS_WITHOUT_PROGRESS = 25
# A mark this old belongs to a session that ended without SessionEnd (a crash).
STALE_SECONDS = 7 * 24 * 3600

# `wait` defaults: 2 min first poll, doubling, capped at 30 min, 24 h idle limit.
WAIT_MIN = 120.0
WAIT_MAX = 1800.0
WAIT_GIVE_UP = 24 * 3600.0
WAIT_FETCH_FAILURES = 5
EXIT_WORK, EXIT_GAVE_UP, EXIT_FETCH, EXIT_ROUTINE, EXIT_CHUNK = 0, 3, 4, 5, 10

# A worker marked in flight longer than this is presumed lost.
INFLIGHT_MAX = 12 * 3600.0
# Routines: runs allowed per rolling 24 h, and the cap for a backed-off interval.
ROUTINE_BUDGET = 4
ROUTINE_MAX_INTERVAL = 14 * 24 * 3600.0
# A routine row's name: its identity in run state and in `routine-done`.
ROUTINE_NAME = re.compile(r"[a-z0-9][a-z0-9-]{0,63}")
WHEN = ("changed", "always")
DURATION = re.compile(r"(\d+(?:\.\d+)?)\s*(m|h|d|w)")
DURATION_UNITS = {"m": 60, "h": 3600, "d": 86400, "w": 7 * 86400}

SESSION_ID = re.compile(r"[A-Za-z0-9_-]{1,128}")
WORKSTREAM = re.compile(r"w\d+")
ITEM_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}")
REMOTE_REF = "origin/main"


def project_dir() -> pathlib.Path:
    return pathlib.Path(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())


def state_dir() -> pathlib.Path:
    """Runtime state, never project content: `.git/` is inherently untracked."""
    git = project_dir() / ".git"
    if git.is_dir():
        return git / "loopx"
    # Worktrees and odd checkouts: fall back to a per-repo temp directory.
    import hashlib
    import tempfile

    key = hashlib.sha256(str(project_dir()).encode()).hexdigest()[:16]
    return pathlib.Path(tempfile.gettempdir()) / f"loopx-{key}"


def mark_path(session: object) -> pathlib.Path | None:
    """The session's mark, or None for a missing or unsafe session id."""
    if not isinstance(session, str) or not SESSION_ID.fullmatch(session):
        return None
    return state_dir() / f"{session}.json"


def wait_path(workstream: str) -> pathlib.Path:
    """The listener's state for a workstream: idle start, pid, gave_up."""
    return state_dir() / f"wait-{workstream}.state"


def calling_session() -> pathlib.Path | None:
    return mark_path(os.environ.get("CLAUDE_CODE_SESSION_ID"))


def read_json(path: pathlib.Path) -> dict:
    try:
        data = json.loads(path.read_text())
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def write_json(path: pathlib.Path, data: dict) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data))
    except OSError:
        pass


def sweep() -> None:
    """Drop marks left by crashed sessions, and the old one-per-repo mark."""
    legacy = project_dir() / ".git" / "loopx-active.json"
    stale = [legacy]
    if state_dir().is_dir():
        cutoff = time.time() - STALE_SECONDS
        stale += [p for p in state_dir().glob("*.json") if p.stat().st_mtime < cutoff]
    for path in stale:
        try:
            path.unlink()
        except OSError:
            pass


def classify(entries: list[tuple[str, bool]]) -> tuple[list[str], list[str]]:
    """Open milestones and inbox notes among (name, is_dir) top-level entries.

    `done/` and `blocked/` are directories that are not `m*`, so work that
    moved there never counts.
    """
    milestones = sorted(name for name, is_dir in entries if is_dir and name.startswith("m"))
    notes = sorted(
        name
        for name, is_dir in entries
        if not is_dir and name.endswith(".md") and name.lower() != "readme.md"
    )
    return milestones, notes


def actionable(workstream: str) -> tuple[list[str], list[str]]:
    """Open milestones and open inbox notes in the working tree, in pick order."""
    root = project_dir() / ".pm" / workstream
    if not root.is_dir():
        return [], []
    return classify([(p.name, p.is_dir()) for p in root.iterdir()])


def git(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        cwd=project_dir(),
        capture_output=True,
        text=True,
        check=False,
    )


def tree_entries(ref: str, directory: str) -> list[tuple[str, bool]] | None:
    """(name, is_dir) for each entry of DIRECTORY at REF; None if git failed."""
    result = git("ls-tree", ref, "--", f"{directory}/")
    if result.returncode != 0:
        return None
    entries = []
    for line in result.stdout.splitlines():
        meta, _, path = line.partition("\t")
        parts = meta.split()
        if len(parts) >= 2 and path:
            entries.append((path.rsplit("/", 1)[-1], parts[1] == "tree"))
    return entries


def actionable_at(ref: str, workstream: str) -> tuple[list[str], list[str]] | None:
    entries = tree_entries(ref, f".pm/{workstream}")
    return None if entries is None else classify(entries)


def next_pick(workstream: str, milestones: list[str], notes: list[str]) -> str:
    return f"{workstream}/{milestones[0]}" if milestones else f"{workstream}/{notes[0]}"


def pid_alive(pid: object) -> bool:
    if not isinstance(pid, int) or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return False
    return True


def parse_duration(text: str) -> float | None:
    match = DURATION.fullmatch(text.strip().lower())
    if not match:
        return None
    seconds = float(match.group(1)) * DURATION_UNITS[match.group(2)]
    return seconds if seconds > 0 else None


def parse_routines(text: str) -> tuple[list[dict], int, list[str]]:
    """Routines, the daily budget, and problems from a routine README.

    Rows look like `| cli-qa | /qa-find-bugs-cli w1 SHIP=1 | 30m | always | |`:
    a name, any command, an interval, an optional `when` (`always`, the
    default, or `changed`), and optional comma-separated `paths` that gate a
    `changed` row. A line like `Budget: 4 runs/day` overrides the default
    budget. The command is opaque here: the routine worker runs it.
    """
    routines, problems, seen = [], [], set()
    budget = ROUTINE_BUDGET
    for line in text.splitlines():
        found = re.match(r"\s*\**budget:?\**:?\s*(\d+)", line, re.IGNORECASE)
        if found:
            budget = int(found.group(1))
            continue
        if not line.strip().startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        name = cells[0].strip("`")
        if name.lower() == "name" or not name or set(name) <= set("-: "):
            continue  # the header or its separator
        if len(cells) < 3:
            problems.append(f"{name!r}: a row needs name, command, and every")
            continue
        command = cells[1].strip("`").strip()
        every = cells[2].strip("`")
        when = (cells[3].strip("`") if len(cells) > 3 and cells[3] else "always").lower()
        paths = [p.strip().strip("`").rstrip("/") for p in (cells[4] if len(cells) > 4 else "").split(",")]
        paths = [p for p in paths if p]
        interval = parse_duration(every)
        if not ROUTINE_NAME.fullmatch(name):
            problems.append(f"{name!r} is not a routine name like cli-qa (lowercase, digits, dashes)")
        elif not command:
            problems.append(f"{name}: no command")
        elif interval is None:
            problems.append(f"{name}: {every!r} is not an interval like 24h or 3d")
        elif when not in WHEN:
            problems.append(f"{name}: when must be changed or always, not {when!r}")
        elif any(p.startswith(("/", "-")) or ".." in p.split("/") for p in paths):
            problems.append(f"{name}: paths must be repository-relative, not {', '.join(paths)!r}")
        elif name in seen:
            problems.append(f"{name}: listed twice")
        else:
            seen.add(name)
            routines.append({"name": name, "command": command, "every": interval, "when": when, "paths": paths})
    return routines, budget, problems


def routine_state_path(workstream: str) -> pathlib.Path:
    return state_dir() / f"routine-{workstream}.state"


def due_routine(workstream: str, ref: str = REMOTE_REF) -> dict:
    """The first due routine at REF, or why none is: {"due": {...} | None, ...}."""
    shown = git("show", f"{ref}:.pm/{workstream}/routine/README.md")
    if shown.returncode != 0:
        return {"due": None, "reason": "no routine list", "problems": [], "next_in": None}
    routines, budget, problems = parse_routines(shown.stdout)
    if not routines:
        return {"due": None, "reason": "routine list is empty", "problems": problems, "next_in": None}

    state = read_json(routine_state_path(workstream))
    now = time.time()
    runs = [t for t in state.get("runs", []) if isinstance(t, (int, float)) and now - t < 86400]
    if len(runs) >= budget:
        return {
            "due": None,
            "reason": f"daily budget of {budget} routine runs is spent",
            "problems": problems,
            # The budget frees up as the oldest run in the window ages out.
            "next_in": max(min(runs) + 86400 - now, 0.0),
        }

    entries = state.get("routines", {}) if isinstance(state.get("routines"), dict) else {}
    waiting = []
    next_in = None  # seconds until the soonest routine's interval passes
    for routine in routines:
        name, paths = routine["name"], routine["paths"]
        missing = [p for p in paths if git("cat-file", "-e", f"{ref}:{p}").returncode != 0]
        if missing:
            problems.append(f"{name}: no {', '.join(missing)} on {ref}")
            continue
        entry = entries.get(name, {})
        interval = entry.get("interval") if isinstance(entry.get("interval"), (int, float)) else routine["every"]
        if routine["when"] == "always":
            interval = routine["every"]  # fixed cadence: no backoff
        last_run, last_sha = entry.get("last_run"), entry.get("last_sha")
        if isinstance(last_run, (int, float)) and now - last_run < interval:
            remaining = interval - (now - last_run)
            next_in = remaining if next_in is None else min(next_in, remaining)
            waiting.append(f"{name}: next in {remaining / 3600:.1f} h")
            continue
        if routine["when"] == "changed" and isinstance(last_sha, str) and last_sha:
            changed = git("log", "-1", "--format=%H", f"{last_sha}..{ref}", "--", *paths)
            # An unknown SHA (history rewritten, shallow clone) counts as changed.
            if changed.returncode == 0 and not changed.stdout.strip():
                waiting.append(f"{name}: no change since {last_sha[:9]}")
                continue
        return {
            "due": {
                "name": name,
                "command": routine["command"],
                "when": routine["when"],
                "paths": paths,
                "interval_hours": round(interval / 3600, 2),
            },
            "problems": problems,
        }
    # A `changed` row waiting only for a commit has no time to wake for: the
    # board poll notices the commit.
    return {"due": None, "reason": "; ".join(waiting) or "nothing due", "problems": problems, "next_in": next_in}


def allow(path: pathlib.Path | None = None) -> None:
    """Let the stop through, removing PATH (the session's mark) when given."""
    if path is not None:
        try:
            path.unlink()
        except OSError:
            pass
    print("{}")
    sys.exit(0)


def read_payload() -> dict:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return {}
    return payload if isinstance(payload, dict) else {}


def check_workstream(workstream: str) -> None:
    if not WORKSTREAM.fullmatch(workstream):
        print(f"loopx guard: {workstream!r} is not a workstream id like w2", file=sys.stderr)
        sys.exit(2)


def cmd_start(workstream: str, listen: bool) -> None:
    check_workstream(workstream)
    sweep()
    try:
        wait_path(workstream).unlink()  # a new run starts a fresh idle window
    except OSError:
        pass
    path = calling_session()
    if path is None:
        print(
            "loopx guard not armed: no Claude Code session id here, so no Stop hook "
            "can hold this loop. Follow the skill's exit rules."
        )
        return
    others = [
        p.stem
        for p in state_dir().glob("*.json")
        if p != path and read_json(p).get("workstream") == workstream
    ] if state_dir().is_dir() else []
    if others:
        print(
            f"loopx guard warning: another session ({', '.join(sorted(others))}) has a "
            f"loop armed on {workstream}; two loops on one queue will race for the "
            "same items."
        )
    write_json(
        path,
        {
            "workstream": workstream,
            "started": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "listen": listen,
            "blocks": 0,
            "remaining": None,
        },
    )
    mode = "listens when drained" if listen else "ends when drained (--no-listen)"
    print(f"loopx guard armed for {workstream} in this session only; it {mode}")


def cmd_end() -> None:
    sweep()
    path = calling_session()
    if path is not None and path.is_file():
        workstream = read_json(path).get("workstream")
        path.unlink()
        if isinstance(workstream, str) and WORKSTREAM.fullmatch(workstream):
            try:
                wait_path(workstream).unlink()
            except OSError:
                pass
        print("loopx guard cleared for this session")
    else:
        print("loopx guard was not armed in this session")


def cmd_forget() -> None:
    path = mark_path(read_payload().get("session_id"))
    allow(path)


def cmd_dispatch(label: str) -> None:
    path = calling_session()
    if path is None or not path.is_file():
        print("loopx guard: no loop armed in this session; nothing marked in flight")
        return
    state = read_json(path)
    state["inflight"] = {"label": label, "since": time.time()}
    state["blocks"] = 0
    write_json(path, state)
    print(f"loopx guard: {label} in flight; turns may end until `settle`")


def cmd_settle() -> None:
    path = calling_session()
    if path is None or not path.is_file():
        print("loopx guard: no loop armed in this session")
        return
    state = read_json(path)
    label = (state.pop("inflight", None) or {}).get("label")
    write_json(path, state)
    print(f"loopx guard: settled {label}" if label else "loopx guard: nothing was in flight")


def cmd_routine_due(workstream: str) -> None:
    check_workstream(workstream)
    print(json.dumps(due_routine(workstream)))


def cmd_routine_done(workstream: str, name: str, result: str) -> None:
    check_workstream(workstream)
    if not ROUTINE_NAME.fullmatch(name) or result not in ("found", "empty"):
        print("loopx guard: usage: routine-done <wN> <name> found|empty", file=sys.stderr)
        sys.exit(2)
    shown = git("show", f"{REMOTE_REF}:.pm/{workstream}/routine/README.md")
    routines, _, _ = parse_routines(shown.stdout) if shown.returncode == 0 else ([], 0, [])
    row = next((r for r in routines if r["name"] == name), None)
    if row is None:
        print(f"loopx guard: {name} is not in .pm/{workstream}/routine/README.md", file=sys.stderr)
        sys.exit(2)

    base = row["every"]
    path = routine_state_path(workstream)
    state = read_json(path)
    now = time.time()
    entries = state.get("routines") if isinstance(state.get("routines"), dict) else {}
    entry = entries.get(name, {})
    previous = entry.get("interval") if isinstance(entry.get("interval"), (int, float)) else base
    if row["when"] == "always" or result == "found":
        interval = base
    else:
        interval = min(max(previous, base) * 2, ROUTINE_MAX_INTERVAL)
    sha = git("rev-parse", REMOTE_REF).stdout.strip()
    entries[name] = {
        "last_run": now,
        "last_sha": sha,
        "interval": interval,
        "empty_runs": 0 if result == "found" else int(entry.get("empty_runs", 0)) + 1,
    }
    runs = [t for t in state.get("runs", []) if isinstance(t, (int, float)) and now - t < 86400]
    write_json(path, {"routines": entries, "runs": [*runs, now]})
    if row["when"] == "always":
        gate = ""
    else:
        gate = f" and only after {', '.join(row['paths']) or 'the repository'} changes"
    print(f"loopx guard: {name} recorded as {result}; next eligible in {interval / 3600:.1f} h{gate}")


def cmd_wait(workstream: str, options: dict[str, float]) -> None:
    check_workstream(workstream)
    floor, cap = options["min"], max(options["max"], options["min"])
    give_up, chunk = options["give-up"], options["chunk"]
    fetch_limit = int(options["fetch-failures"])

    state_file = wait_path(workstream)
    state = read_json(state_file)
    now = time.time()  # wall clock: a sleeping laptop still ages the idle window
    since = state.get("since") if isinstance(state.get("since"), (int, float)) else now
    state = {"since": since, "pid": os.getpid()}
    write_json(state_file, state)

    def finish(code: int, message: str, **extra: object) -> None:
        latest = read_json(state_file)
        latest.pop("pid", None)
        latest.update(extra)
        if code in (EXIT_WORK, EXIT_ROUTINE):
            latest.pop("since", None)
        write_json(state_file, latest)
        print(message)
        sys.exit(code)

    started = time.time()
    delay = floor
    failures = 0
    routine_in = None
    while True:
        fetched = git("fetch", "-q", "origin", "main").returncode == 0
        found = actionable_at(REMOTE_REF, workstream) if fetched else None
        if found is None:
            failures += 1
            if failures >= fetch_limit:
                finish(
                    EXIT_FETCH,
                    f"loopx wait: git fetch origin main failed {failures} times in a "
                    "row; check network and push credentials.",
                )
        else:
            failures = 0
            milestones, notes = found
            if milestones or notes:
                count = len(milestones) + len(notes)
                finish(
                    EXIT_WORK,
                    f"loopx wait: {workstream} has {count} actionable item(s) on "
                    f"{REMOTE_REF}; next pick {next_pick(workstream, milestones, notes)}. "
                    "Run `git pull --rebase`, then pick it.",
                )
            # Board work was checked first and always wins; only then a routine.
            schedule = due_routine(workstream)
            due = schedule["due"]
            routine_in = schedule.get("next_in")
            if due:
                finish(
                    EXIT_ROUTINE,
                    f"loopx wait: routine due for {workstream}: {due['name']} ({due['command']}). "
                    "Run `git pull --rebase`, recheck the board, then dispatch it.",
                )

        now = time.time()
        idle = now - since
        if idle >= give_up and routine_in is None:
            finish(
                EXIT_GAVE_UP,
                f"loopx wait: {workstream} stayed idle for {idle / 3600:.1f} h; "
                "the listen window is over.",
                gave_up=True,
            )
        spent = now - started
        if chunk > 0 and spent >= chunk:
            finish(
                EXIT_CHUNK,
                f"loopx wait: no work for {workstream} after this {chunk:.0f} s chunk "
                f"(idle {idle / 60:.0f} min); run wait again.",
            )

        pause = delay * random.uniform(0.8, 1.2)
        if routine_in is not None:
            # Never sleep past a routine's due time; the backoff only paces the board poll.
            pause = min(pause, routine_in + 1.0)
        else:
            pause = min(pause, give_up - idle)
        if chunk > 0:
            pause = min(pause, chunk - spent)
        time.sleep(max(pause, 0.0))
        delay = min(delay * 2, cap)


def cmd_outcome(workstream: str, item: str) -> None:
    check_workstream(workstream)
    if not ITEM_ID.fullmatch(item):
        print(f"loopx guard: {item!r} is not an item id like m12 or 089", file=sys.stderr)
        sys.exit(2)
    fetched = git("fetch", "-q", "origin", "main").returncode == 0
    stem = item.removesuffix(".md")

    def matches(name: str) -> bool:
        return name == stem or name.removesuffix(".md") == stem or name.startswith(f"{stem}-")

    where = "absent"
    for place, directory in (
        ("open", f".pm/{workstream}"),
        ("done", f".pm/{workstream}/done"),
        ("blocked", f".pm/{workstream}/blocked"),
    ):
        entries = tree_entries(REMOTE_REF, directory) or []
        if any(matches(name) for name, _ in entries):
            where = place
            break

    head = git("rev-parse", "HEAD").stdout.strip()
    remote = git("rev-parse", REMOTE_REF).stdout.strip()
    clean = git("status", "--porcelain").stdout.strip() == ""
    print(
        json.dumps(
            {
                "item": f"{workstream}/{item}",
                "where": where,
                "fetched": fetched,
                "pushed": bool(head) and head == remote,
                "clean": clean,
                "head": head[:12],
            }
        )
    )


def cmd_hook() -> None:
    path = mark_path(read_payload().get("session_id"))
    if path is None or not path.is_file():
        allow()  # this session runs no loop

    try:
        state = json.loads(path.read_text())
        workstream = state["workstream"]
        if not WORKSTREAM.fullmatch(workstream):
            raise ValueError(workstream)
    except Exception:
        allow(path)

    inflight = state.get("inflight")
    if isinstance(inflight, dict):
        since = inflight.get("since")
        if isinstance(since, (int, float)) and time.time() - since < INFLIGHT_MAX:
            state["blocks"] = 0
            write_json(path, state)
            print("{}")  # a background worker is running; its notification wakes the loop
            sys.exit(0)
        state.pop("inflight", None)  # presumed lost: hold the loop again

    listen = state.get("listen", True) is not False
    milestones, notes = actionable(workstream)
    remaining = len(milestones) + len(notes)

    if remaining == 0:
        if not listen:
            allow(path)  # genuinely Done
        listener = read_json(wait_path(workstream))
        if listener.get("gave_up"):
            try:
                wait_path(workstream).unlink()
            except OSError:
                pass
            allow(path)  # the listen window ran out: Done
        if pid_alive(listener.get("pid")):
            state["blocks"] = 0
            state["remaining"] = 0
            write_json(path, state)
            print("{}")  # listening: the background wait wakes this session
            sys.exit(0)

    # Reset the spin counter whenever the queue actually got shorter.
    previous = state.get("remaining")
    blocks = 0 if previous is None or remaining < previous else int(state.get("blocks", 0))
    blocks += 1
    if blocks > MAX_BLOCKS_WITHOUT_PROGRESS:
        # Something is wrong beyond a missed pick; let the turn end and say so.
        print(
            json.dumps(
                {
                    "systemMessage": (
                        f"loopx guard stood down after {blocks} stop attempts with no "
                        f"progress on {workstream}. Clear it with "
                        "`python3 scripts/loopx-guard.py end`."
                    )
                }
            )
        )
        sys.exit(0)

    state["blocks"] = blocks
    state["remaining"] = remaining
    write_json(path, state)

    if remaining == 0:
        reason = (
            f"/loopx {workstream} is drained but not listening. If a wait just reported "
            "work, run `git pull --rebase` and pick it. Otherwise write the drained "
            f"report, then start `python3 scripts/loopx-guard.py wait {workstream}` as a "
            "background command and end the turn; it wakes this session when new work "
            "lands. If the loop genuinely ends, run `python3 scripts/loopx-guard.py end`."
        )
    else:
        nxt = next_pick(workstream, milestones, notes)
        reason = (
            f"/loopx {workstream} is still running: {remaining} item(s) remain "
            f"and the next pick is {nxt}. This is not one of the three exits — "
            "nothing is blocked and a progress summary is not an exit. Pick "
            f"{nxt}, dispatch it to a worker, and continue. If every remaining "
            "item really is blocked, move them with /pm block; when the loop "
            "genuinely ends, run `python3 scripts/loopx-guard.py end`."
        )
    print(json.dumps({"decision": "block", "reason": reason}))


def parse_wait_options(args: list[str]) -> dict[str, float]:
    options = {
        "min": WAIT_MIN,
        "max": WAIT_MAX,
        "give-up": WAIT_GIVE_UP,
        "chunk": 0.0,
        "fetch-failures": float(WAIT_FETCH_FAILURES),
    }
    it = iter(args)
    for flag in it:
        key = flag.removeprefix("--")
        if not flag.startswith("--") or key not in options:
            raise ValueError(flag)
        value = float(next(it))
        if value < 0:
            raise ValueError(flag)
        options[key] = value
    if options["fetch-failures"] < 1:
        raise ValueError("--fetch-failures")
    return options


def usage() -> None:
    print(__doc__, file=sys.stderr)
    sys.exit(2)


def main() -> None:
    args = sys.argv[1:]
    if not args:
        cmd_hook()
    elif args[0] == "start" and len(args) == 2:
        cmd_start(args[1], listen=True)
    elif args[0] == "start" and len(args) == 3 and args[2] == "--no-listen":
        cmd_start(args[1], listen=False)
    elif args == ["end"]:
        cmd_end()
    elif args == ["forget"]:
        cmd_forget()
    elif args[0] == "wait" and len(args) >= 2:
        try:
            options = parse_wait_options(args[2:])
        except (ValueError, StopIteration):
            usage()
        cmd_wait(args[1], options)
    elif args[0] == "outcome" and len(args) == 3:
        cmd_outcome(args[1], args[2])
    elif args[0] == "dispatch" and len(args) == 2:
        cmd_dispatch(args[1])
    elif args == ["settle"]:
        cmd_settle()
    elif args[0] == "routine-due" and len(args) == 2:
        cmd_routine_due(args[1])
    elif args[0] == "routine-done" and len(args) == 4:
        cmd_routine_done(*args[1:])
    else:
        usage()


if __name__ == "__main__":
    main()
