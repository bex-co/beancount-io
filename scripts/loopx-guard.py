#!/usr/bin/env python3
"""Keep `/loopx` running while its workstream still has actionable work.

The rule — never stop while a next pick exists — is stated four times in
`.agents/skills/loopx/SKILL.md`, and was still broken once: the loop wrote an
end-of-run summary and treated writing it as a turn boundary, naming the next
pick in the same breath. Prose cannot enforce itself. This can.

This script answers questions of fact and keeps time; it never judges. What
"actionable" means, in every mode:

- An open inbox note (`.pm/<wN>/NNN.md`) is actionable.
- An open milestone (`.pm/<wN>/mN/`) is actionable when at least one of its
  open tasks has every written `depends_on` done. A milestone whose tasks all
  wait on unfinished work elsewhere is *waiting*: it neither holds the loop
  nor wakes the listener, and becomes actionable by itself once the work it
  names is done. Anything under `done/` or `blocked/` never counts.

Each mark belongs to the Claude Code session that armed it: `start` reads the
caller's `CLAUDE_CODE_SESSION_ID`, and the Stop hook consults only the mark of
the session that is stopping. Several sessions can therefore share one
checkout, each running its own loop or none, without blocking each other.

A drained loop listens by default: `wait` polls `origin/main` with `git fetch`
and exponential backoff, costs no model tokens, and exits when the workstream
gains actionable work, a routine falls due, one of the loop's own pushes
turned CI red, the idle limit passes, or fetch has failed for two hours
straight. One listener runs per workstream; a second `wait` exits at once.
While a listener is alive the Stop hook lets the turn end and keeps the mark;
a drained loop that is *not* listening is held until it starts one.
`--no-listen` restores the old behaviour: drained means done.

While the orchestrator waits for a background worker, `dispatch <label>` marks
the loop in flight and the Stop hook lets turns end. For a board item the hook
checks the facts itself: once the item has left the open tree and everything
is pushed, the worker is finished and the loop is held again, whether or not
anyone ran `settle`. Marks without a board signal (routines, CI fixes) expire
on a timer.

A drained workstream may also run routines listed in
`.pm/<wN>/routine/README.md` on origin/main. A routine is a named row holding
any command: a slash command with its arguments, a shell command, or a task in
plain words; the guard schedules it and never interprets it. `wait` exits 5
when one is due: its interval has passed, and the day's routine budget is not
spent. A row runs on its own schedule: `when: always` (the default) means
every interval, whatever changed; `when: changed` also requires one of the
row's `paths` (any path when it lists none) to have changed since the last
run, and `routine-done` doubles such a row's interval after an empty run
(capped at 14 days), resetting it after a run that shipped something. A row
that fails three runs in a row drops to one try a day until a run succeeds.
`wait` never sleeps past the next routine's due time, so a schedule holds even
while the board poll is backed off; board work still wins whenever both are
ready. Run state stays in `.git/loopx/`, never on the public board.

`/ship` ends at the push and nobody reads CI afterwards, so the guard does:
`outcome` records the commits a worker pushed, and `board` and `wait` ask `gh`
whether one of those commits is where a workflow on main first went red.
Red that started on someone else's commit is not reported. Without `gh` the
check is skipped and says so.

Modes:

    loopx-guard.py start <wN> [--no-listen]
                                arm a loop for the calling Claude Code session
    loopx-guard.py end          disarm the calling session's loop (a genuine Exit)
    loopx-guard.py board <wN>   the facts for the next pick (JSON): own CI
                                failures, ready and waiting items, blocked
                                items changed since they were last listed,
                                the due routine, and the default next step
    loopx-guard.py dispatch <label>
                                mark the calling session's loop as waiting on
                                a background worker (Stop hook lets turns end)
    loopx-guard.py outcome <wN> <id> [<sha>...]
                                verify a worker's result (JSON): where <id>
                                sits on origin/main, whether the listed
                                commits are there, nothing unpushed, tree
                                clean; clears the in-flight mark when it holds.
                                <id> is an item, `routine:<name>`, or `ci:<slug>`
    loopx-guard.py settle       clear the in-flight mark by hand
    loopx-guard.py routine-due <wN>
                                the next due routine on origin/main (JSON)
    loopx-guard.py routine-done <wN> <name> found|empty|failed
                                record a routine run and reschedule it
    loopx-guard.py wait <wN> [--min S] [--max S] [--give-up S] [--chunk S]
                     [--fetch-give-up S]
                                block until origin/main gives <wN> something to
                                do; exit 0 board work, 5 routine due, 6 own CI
                                failure, 3 idle limit, 4 fetch failing,
                                10 chunk elapsed (call again), 11 another
                                listener is already running
    loopx-guard.py              Stop hook: reads the hook payload on stdin and
                                blocks the stop while this session's loop has work
    loopx-guard.py forget       SessionEnd hook: drop the ending session's mark

Outside Claude Code there is no session id and no Stop hook (Codex has
neither), so `start` arms nothing and says so; `board`, `outcome`, `wait` and
the routine modes work the same everywhere, and the skill's exit rules still
apply.
"""

from __future__ import annotations

import json
import os
import pathlib
import random
import re
import shutil
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
# Fetch may fail this long in a row (a sleeping laptop, a flaky network) before
# the listener gives up; it keeps backing off normally meanwhile.
WAIT_FETCH_GIVE_UP = 2 * 3600.0
EXIT_WORK, EXIT_GAVE_UP, EXIT_FETCH, EXIT_ROUTINE, EXIT_CI, EXIT_CHUNK, EXIT_BUSY = 0, 3, 4, 5, 6, 10, 11

# A board item's worker marked in flight longer than this is presumed lost.
INFLIGHT_MAX = 12 * 3600.0
# A routine or CI-fix worker has no board signal, so only this timer ends its mark.
INFLIGHT_UNTRACKED_MAX = 3 * 3600.0
# Once an item has left the open tree, its worker has this long to finish shipping.
INFLIGHT_SHIP_GRACE = 30 * 60.0
# A routine that failed this many runs in a row retries once per paused interval.
ROUTINE_FAILURES_BEFORE_PAUSE = 3
ROUTINE_PAUSED_INTERVAL = 24 * 3600.0
# CI: how long a pushed commit is watched, and how many runs one `gh` call reads.
CI_WINDOW = 6 * 3600.0
CI_RUNS = 200
# While a pushed commit's CI is still running, poll at least this often.
CI_WATCH_PAUSE = 300.0
# A red workflow that has not run again for this long is no longer tracked.
CI_OWNED_MAX = 7 * 24 * 3600.0
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
# A worker with no board item: `routine:<name>` or `ci:<workflow slug>`.
PSEUDO_ID = re.compile(r"(?:routine|ci):[a-z0-9][a-z0-9-]{0,63}")
ITEM_LABEL = re.compile(r"(w\d+)/([A-Za-z0-9][A-Za-z0-9_.-]{0,127})")
COMMIT = re.compile(r"[0-9a-fA-F]{7,40}")
TASK_FILE = re.compile(r"t\d+[\w.-]*\.md")
DEP_TASK = re.compile(r"(w\d+)/(m[\w.]+)/(t[\w.-]+)")
DEP_MILESTONE = re.compile(r"(w\d+)/(m[\w.]+)")
DEP_NOTE = re.compile(r"(w\d+)/(\d[\w.-]*)")
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


def board_state_path(workstream: str) -> pathlib.Path:
    """Which blocked items `board` has already listed, by content hash."""
    return state_dir() / f"board-{workstream}.state"


def ci_state_path(workstream: str) -> pathlib.Path:
    """The loop's recent pushes, and the workflows one of them turned red."""
    return state_dir() / f"ci-{workstream}.state"


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


def natural(name: str) -> list:
    """Sort key that orders m9 before m10 and 089.md before 1014.md."""
    return [int(part) if part.isdigit() else part for part in re.split(r"(\d+)", name)]


def classify(entries: list[tuple[str, bool]]) -> tuple[list[str], list[str]]:
    """Open milestones and inbox notes among (name, is_dir) top-level entries.

    `done/` and `blocked/` are directories that are not `m*`, so work that
    moved there never counts.
    """
    milestones = sorted((name for name, is_dir in entries if is_dir and name.startswith("m")), key=natural)
    notes = sorted(
        (
            name
            for name, is_dir in entries
            if not is_dir and name.endswith(".md") and name.lower() != "readme.md"
        ),
        key=natural,
    )
    return milestones, notes


def git(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        cwd=project_dir(),
        capture_output=True,
        text=True,
        check=False,
    )


class Tree:
    """Everything under `.pm/`: in the working tree, or at a git ref."""

    def __init__(self, ref: str | None = None) -> None:
        self.ref = ref
        self.ok = True
        self.files: set[str] = set()
        self.kids: dict[str, dict[str, bool]] = {}
        if ref is None:
            base = project_dir()
            for dirpath, dirnames, filenames in os.walk(base / ".pm"):
                rel = pathlib.Path(dirpath).relative_to(base).as_posix()
                for name in dirnames:  # an empty directory is still an item
                    self._add(f"{rel}/{name}", True)
                for name in filenames:
                    self._add(f"{rel}/{name}", False)
            return
        listed = git("ls-tree", "-r", "-z", "--name-only", ref, "--", ".pm/")
        if listed.returncode != 0:
            self.ok = False
            return
        for path in listed.stdout.split("\0"):
            if path:
                self._add(path, False)

    def _add(self, path: str, is_dir: bool) -> None:
        if not is_dir:
            self.files.add(path)
        parent, _, name = path.rpartition("/")
        while parent:
            siblings = self.kids.setdefault(parent, {})
            siblings[name] = siblings.get(name, False) or is_dir
            is_dir = True
            parent, _, name = parent.rpartition("/")

    def children(self, directory: str) -> list[tuple[str, bool]]:
        """(name, is_dir) for each entry directly inside DIRECTORY."""
        return sorted(self.kids.get(directory, {}).items())

    def has_dir(self, path: str) -> bool:
        parent, _, name = path.rpartition("/")
        return self.kids.get(parent, {}).get(name) is True

    def read_many(self, paths: list[str]) -> dict[str, str]:
        """The text of each of PATHS that exists."""
        if not paths:
            return {}
        texts: dict[str, str] = {}
        if self.ref is None:
            for path in paths:
                try:
                    texts[path] = (project_dir() / path).read_text(encoding="utf-8", errors="replace")
                except OSError:
                    pass
            return texts
        batch = subprocess.run(
            ["git", "cat-file", "--batch"],
            cwd=project_dir(),
            input="".join(f"{self.ref}:{path}\n" for path in paths).encode(),
            capture_output=True,
            check=False,
        )
        data, at = batch.stdout, 0
        for path in paths:
            newline = data.find(b"\n", at)
            if newline < 0:
                break
            header = data[at:newline].split()
            at = newline + 1
            if len(header) != 3:  # "<name> missing"
                continue
            size = int(header[2])
            texts[path] = data[at : at + size].decode("utf-8", "replace")
            at += size + 1
        return texts


def frontmatter(text: str) -> dict[str, str]:
    """The leading `---` block's keys; a YAML list becomes comma-separated."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    meta: dict[str, str] = {}
    key = None
    for line in lines[1:80]:
        if line.strip() == "---":
            break
        found = re.match(r"([A-Za-z_]+):\s*(.*)$", line)
        if found:
            key = found.group(1)
            meta[key] = found.group(2).strip()
        elif key and line.strip().startswith("- "):
            meta[key] += "," + line.strip()[2:]
    return meta


def dep_ids(value: str) -> list[str]:
    ids = (part.strip().strip("\"'") for part in value.strip().strip("[]").split(","))
    return [dep for dep in ids if dep]


def dep_unmet(tree: Tree, dep: str) -> bool:
    """True while the task, milestone, or note DEP names is still open or blocked.

    A name that resolves to nothing (dropped, renamed, mistyped) never holds
    work back: the worker's triage deals with it.
    """
    found = DEP_TASK.fullmatch(dep)
    if found:
        queue, milestone, task = found.groups()
        return any(
            f".pm/{queue}/{place}{milestone}/{task}.md" in tree.files for place in ("", "blocked/")
        )
    found = DEP_MILESTONE.fullmatch(dep)
    if found:
        queue, milestone = found.groups()
        return any(tree.has_dir(f".pm/{queue}/{place}{milestone}") for place in ("", "blocked/"))
    found = DEP_NOTE.fullmatch(dep)
    if found:
        queue, note = found.groups()
        note = note.removesuffix(".md")
        return any(f".pm/{queue}/{place}{note}.md" in tree.files for place in ("", "blocked/"))
    return False


def board(tree: Tree, workstream: str) -> dict:
    """Ready milestones and notes in pick order, and what each waiting milestone waits on."""
    root = f".pm/{workstream}"
    milestones: dict[str, list[str]] = {}
    notes: list[str] = []
    for name, is_dir in tree.children(root):
        if is_dir and name.startswith("m"):
            milestones[name] = [
                task for task, nested in tree.children(f"{root}/{name}") if not nested and TASK_FILE.fullmatch(task)
            ]
        elif not is_dir and name.endswith(".md") and name.lower() != "readme.md":
            notes.append(name)
    texts = tree.read_many([f"{root}/{name}/{task}" for name, tasks in milestones.items() for task in tasks])

    ready: list[str] = []
    waiting: dict[str, list[str]] = {}
    for name, tasks in milestones.items():
        held: list[str] = []
        live = 0
        workable = False
        for task in tasks:
            meta = frontmatter(texts.get(f"{root}/{name}/{task}", ""))
            status = meta.get("status", "todo").lower()
            if status in ("done", "abandoned"):
                continue
            live += 1
            if status == "blocked":
                held.append(f"{workstream}/{name}/{task.removesuffix('.md')} (blocked)")
                continue
            unmet = [dep for dep in dep_ids(meta.get("depends_on", "")) if dep_unmet(tree, dep)]
            if not unmet:
                workable = True
                break
            held += unmet
        # No live task at all (no task files, or every one finished) still needs
        # a worker: to triage it, or to close it out.
        if workable or not live:
            ready.append(name)
        else:
            waiting[name] = sorted(set(held))
    return {
        "milestones": sorted(ready, key=natural),
        "notes": sorted(notes, key=natural),
        "waiting": {name: waiting[name] for name in sorted(waiting, key=natural)},
    }


def actionable(workstream: str) -> tuple[list[str], list[str]]:
    """Ready milestones and open inbox notes in the working tree, in pick order."""
    try:
        facts = board(Tree(), workstream)
        return facts["milestones"], facts["notes"]
    except Exception:
        # Never let a parsing surprise release the loop: fall back to "it exists".
        root = project_dir() / ".pm" / workstream
        if not root.is_dir():
            return [], []
        return classify([(p.name, p.is_dir()) for p in root.iterdir()])


def actionable_at(ref: str, workstream: str) -> dict | None:
    """`board` facts at REF, or None when git cannot read it."""
    tree = Tree(ref)
    return board(tree, workstream) if tree.ok else None


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


def listener_alive(state: dict) -> bool:
    """True when the pid in a listener's state is a running `wait`.

    A bare pid check is not enough: after a reboot or a long uptime the number
    belongs to some other process, and the loop would wait on it forever.
    """
    pid = state.get("pid")
    if not pid_alive(pid):
        return False
    try:
        shown = subprocess.run(
            ["ps", "-o", "command=", "-p", str(pid)], capture_output=True, text=True, timeout=5, check=False
        )
    except Exception:
        return True  # no `ps` here: the pid check is all there is
    return shown.returncode == 0 and "loopx-guard" in shown.stdout and " wait" in shown.stdout


def item_open_locally(workstream: str, item: str) -> bool:
    root = project_dir() / ".pm" / workstream
    stem = item.removesuffix(".md")
    return (root / stem).is_dir() or (root / f"{stem}.md").is_file() or any(root.glob(f"{stem}-*"))


def nothing_unpushed() -> bool:
    """True when every local commit is already on origin/main (as last fetched)."""
    return git("merge-base", "--is-ancestor", "HEAD", REMOTE_REF).returncode == 0


def tree_clean() -> bool:
    status = git("status", "--porcelain")
    return status.returncode == 0 and not status.stdout.strip()


def inflight_verdict(inflight: dict) -> str:
    """`running`, `finished`, or `lost` for a dispatched worker.

    Mutates INFLIGHT to remember when its item was first seen gone.
    """
    now = time.time()
    since = inflight.get("since")
    if not isinstance(since, (int, float)):
        return "lost"
    age = now - since
    found = ITEM_LABEL.fullmatch(str(inflight.get("label", "")))
    if not found or not inflight.get("was_open"):
        # A routine, a CI fix, or an item that was not open when dispatched
        # (a blocked one being revived): no board signal, only the timer.
        limit = INFLIGHT_MAX if found else INFLIGHT_UNTRACKED_MAX
        return "running" if age < limit else "lost"
    if age >= INFLIGHT_MAX:
        return "lost"
    if item_open_locally(*found.groups()):
        return "running"
    gone = inflight.get("gone_since")
    if not isinstance(gone, (int, float)):
        gone = inflight["gone_since"] = now
    if tree_clean() and nothing_unpushed():
        return "finished"
    return "running" if now - gone < INFLIGHT_SHIP_GRACE else "lost"


def settle_label(label: str) -> bool:
    """Clear the calling session's in-flight mark if it is for LABEL."""
    path = calling_session()
    if path is None or not path.is_file():
        return False
    state = read_json(path)
    current = str((state.get("inflight") or {}).get("label", ""))
    if not current or current.removesuffix(".md") != label.removesuffix(".md"):
        return False
    state.pop("inflight", None)
    write_json(path, state)
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
        if int(entry.get("failures", 0)) >= ROUTINE_FAILURES_BEFORE_PAUSE:
            interval = max(interval, ROUTINE_PAUSED_INTERVAL)  # it keeps failing: one try a day
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


def record_pushes(workstream: str, shas: list[str]) -> None:
    """Remember commits this loop pushed, so their CI results get read."""
    full = []
    for sha in shas:
        resolved = git("rev-parse", "--verify", "-q", f"{sha}^{{commit}}")
        if resolved.returncode == 0 and resolved.stdout.strip():
            full.append(resolved.stdout.strip())
    if not full:
        return
    path = ci_state_path(workstream)
    state = read_json(path)
    now = time.time()
    pushes = [p for p in state.get("pushes", []) if isinstance(p, dict) and now - p.get("at", 0) < CI_WINDOW]
    known = {p.get("sha") for p in pushes}
    pushes += [{"sha": sha, "at": now} for sha in full if sha not in known]
    state["pushes"] = pushes
    write_json(path, state)


def ci_slug(workflow: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", workflow.lower()).strip("-")[:60] or "workflow"


def gh_runs() -> list | None:
    """Recent workflow runs on main, oldest first; None when `gh` cannot say."""
    if not shutil.which("gh"):
        return None
    try:
        listed = subprocess.run(
            [
                "gh", "run", "list", "--branch", "main", "--limit", str(CI_RUNS),
                "--json", "databaseId,workflowName,headSha,status,conclusion,createdAt,url",
            ],
            cwd=project_dir(), capture_output=True, text=True, timeout=45, check=False,
        )
        runs = json.loads(listed.stdout) if listed.returncode == 0 else None
    except Exception:
        return None
    if not isinstance(runs, list):
        return None
    return sorted((r for r in runs if isinstance(r, dict)), key=lambda r: str(r.get("createdAt", "")))


def own_ci(workstream: str, mark: bool = False) -> dict:
    """Workflows on main that one of this loop's pushes turned red.

    A workflow is *ours* when the first failing run of its current red streak
    is on a commit this loop pushed. It stays ours until a run passes, and is
    reported again only when another of our commits (a fix attempt) fails too.
    Red that began on someone else's commit is theirs: never reported here.
    With MARK the reported runs are remembered, so the next call is quiet.
    """
    path = ci_state_path(workstream)
    state = read_json(path)
    now = time.time()
    pushes = [p for p in state.get("pushes", []) if isinstance(p, dict) and now - p.get("at", 0) < CI_WINDOW]
    owned = state.get("owned") if isinstance(state.get("owned"), dict) else {}
    owned = {
        workflow: entry
        for workflow, entry in owned.items()
        if isinstance(entry, dict) and isinstance(entry.get("reported"), list) and now - entry.get("at", now) < CI_OWNED_MAX
    }
    quiet = {"own_failures": [], "still_red": sorted(owned), "pending": 0, "watch": False}
    if not pushes and not owned:
        return {"checked": False, "reason": "no pushes to watch", **quiet}
    runs = gh_runs()
    if runs is None:
        return {"checked": False, "reason": "gh is missing or not signed in: CI was not checked", **quiet}

    ours = {p.get("sha") for p in pushes}
    by_workflow: dict[str, list[dict]] = {}
    for run in runs:
        by_workflow.setdefault(str(run.get("workflowName", "")), []).append(run)
    failures = []
    pending = 0
    for workflow, sequence in by_workflow.items():
        pending += sum(1 for r in sequence if r.get("status") != "completed" and r.get("headSha") in ours)
        settled = [r for r in sequence if r.get("status") == "completed" and r.get("conclusion") in ("success", "failure")]
        streak: list[dict] = []
        for run in reversed(settled):
            if run.get("conclusion") != "failure":
                break
            streak.insert(0, run)
        if not streak:
            if settled:
                owned.pop(workflow, None)  # green again
            continue
        entry = owned.get(workflow)
        if not isinstance(entry, dict):
            if streak[0].get("headSha") not in ours:
                continue  # it went red on someone else's commit
            entry = owned[workflow] = {"since": streak[0].get("headSha", ""), "reported": [], "at": now}
        fresh = [r for r in streak if r.get("headSha") in ours and r.get("databaseId") not in entry["reported"]]
        if fresh:
            failures.append(
                {
                    "workflow": workflow,
                    "label": f"ci:{ci_slug(workflow)}",
                    "since": str(entry.get("since", ""))[:9],
                    "run": fresh[-1].get("databaseId"),
                    "url": fresh[-1].get("url", ""),
                    "attempt": len(entry["reported"]) + 1,
                }
            )
            if mark:
                entry["reported"] += [r.get("databaseId") for r in fresh]
    state["pushes"] = pushes
    state["owned"] = owned
    write_json(path, state)
    recent = any(now - p.get("at", 0) < 1200 for p in pushes)
    return {
        "checked": True,
        "own_failures": failures,
        "still_red": sorted(owned),
        "pending": pending,
        "watch": bool(pending or recent),
    }


def blocked_review(workstream: str) -> tuple[list[str], int]:
    """Blocked items whose content changed since `board` last listed them, and the count of the rest."""
    listed = git("ls-tree", "HEAD", "--", f".pm/{workstream}/blocked/")
    current: dict[str, str] = {}
    if listed.returncode == 0:
        for line in listed.stdout.splitlines():
            meta, _, path = line.partition("\t")
            parts = meta.split()
            if len(parts) >= 3 and path:
                current[path.rsplit("/", 1)[-1]] = parts[2]
    path = board_state_path(workstream)
    seen = read_json(path).get("blocked")
    seen = seen if isinstance(seen, dict) else {}
    review = sorted((name for name, sha in current.items() if seen.get(name) != sha), key=natural)
    write_json(path, {"blocked": current})
    return review, len(current) - len(review)


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
    # A new run starts a fresh idle window and reviews every blocked item once.
    for stale in (wait_path(workstream), board_state_path(workstream)):
        try:
            stale.unlink()
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
    found = ITEM_LABEL.fullmatch(label)
    state["inflight"] = {
        "label": label,
        "since": time.time(),
        # Only an item that is open now can later be seen leaving the open tree.
        "was_open": bool(found) and item_open_locally(*found.groups()),
    }
    state["blocks"] = 0
    write_json(path, state)
    print(f"loopx guard: {label} in flight; launch its worker, then end the turn")


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
    if not ROUTINE_NAME.fullmatch(name) or result not in ("found", "empty", "failed"):
        print("loopx guard: usage: routine-done <wN> <name> found|empty|failed", file=sys.stderr)
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
    failures = int(entry.get("failures", 0)) + 1 if result == "failed" else 0
    if result == "failed":
        # The run never really happened: keep the cadence, and the last SHA a
        # `changed` row is gated on. Three in a row drops it to one try a day.
        interval = base if row["when"] == "always" else max(previous, base)
        if failures >= ROUTINE_FAILURES_BEFORE_PAUSE:
            interval = max(interval, ROUTINE_PAUSED_INTERVAL)
        sha = entry.get("last_sha", "")
        empty_runs = int(entry.get("empty_runs", 0))
    else:
        if row["when"] == "always" or result == "found":
            interval = base
        else:
            interval = min(max(previous, base) * 2, ROUTINE_MAX_INTERVAL)
        sha = git("rev-parse", REMOTE_REF).stdout.strip()
        empty_runs = 0 if result == "found" else int(entry.get("empty_runs", 0)) + 1
    entries[name] = {
        "last_run": now,
        "last_sha": sha,
        "interval": interval,
        "empty_runs": empty_runs,
        "failures": failures,
    }
    runs = [t for t in state.get("runs", []) if isinstance(t, (int, float)) and now - t < 86400]
    write_json(path, {"routines": entries, "runs": [*runs, now]})
    settle_label(f"routine:{name}")
    if result == "failed" and failures >= ROUTINE_FAILURES_BEFORE_PAUSE:
        print(
            f"loopx guard: {name} failed {failures} runs in a row; it now retries once every "
            f"{interval / 3600:.0f} h until a run succeeds. "
            + ("File one inbox note for it with /pm add." if failures == ROUTINE_FAILURES_BEFORE_PAUSE else "")
        )
        return
    if row["when"] == "always" or result == "failed":
        gate = ""
    else:
        gate = f" and only after {', '.join(row['paths']) or 'the repository'} changes"
    print(f"loopx guard: {name} recorded as {result}; next eligible in {interval / 3600:.1f} h{gate}")


def cmd_wait(workstream: str, options: dict[str, float]) -> None:
    check_workstream(workstream)
    floor, cap = options["min"], max(options["max"], options["min"])
    give_up, chunk = options["give-up"], options["chunk"]
    fetch_give_up = options["fetch-give-up"]

    state_file = wait_path(workstream)
    state = read_json(state_file)
    if state.get("pid") != os.getpid() and listener_alive(state):
        print(
            f"loopx wait: a listener (pid {state.get('pid')}) is already running for "
            f"{workstream} and will wake the loop. Do not start another; end the turn."
        )
        sys.exit(EXIT_BUSY)
    now = time.time()  # wall clock: a sleeping laptop still ages the idle window
    since = state.get("since") if isinstance(state.get("since"), (int, float)) else now
    state = {"since": since, "pid": os.getpid()}
    write_json(state_file, state)

    def finish(code: int, message: str, **extra: object) -> None:
        latest = read_json(state_file)
        latest.pop("pid", None)
        latest.update(extra)
        if code in (EXIT_WORK, EXIT_ROUTINE, EXIT_CI):
            latest.pop("since", None)
        write_json(state_file, latest)
        print(message)
        sys.exit(code)

    started = time.time()
    delay = floor
    failing_since = None
    while True:
        routine_in = None
        watch_ci = False
        facts = actionable_at(REMOTE_REF, workstream) if git("fetch", "-q", "origin", "main").returncode == 0 else None
        if facts is None:
            # Offline: keep backing off, and do not pace on a stale routine schedule.
            failing_since = failing_since or time.time()
            down = time.time() - failing_since
            if down >= fetch_give_up:
                finish(
                    EXIT_FETCH,
                    f"loopx wait: git fetch origin main has failed for {down / 60:.0f} min "
                    "straight; check network and push credentials.",
                )
        else:
            failing_since = None
            ci = own_ci(workstream)
            if ci["own_failures"]:
                first = ci["own_failures"][0]
                finish(
                    EXIT_CI,
                    f"loopx wait: one of this loop's pushes turned CI red: {first['workflow']} "
                    f"since {first['since']} ({first['url']}). Run `git pull --rebase`, then "
                    f"`board {workstream}`, and fix it before anything else.",
                )
            watch_ci = ci["watch"]
            milestones, notes = facts["milestones"], facts["notes"]
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
        if idle >= give_up and routine_in is None and failing_since is None:
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
        elif failing_since is None:
            pause = min(pause, give_up - idle)
        else:
            pause = min(pause, fetch_give_up - (now - failing_since))
        if watch_ci:
            pause = min(pause, CI_WATCH_PAUSE)  # a pushed commit's CI is still running
        if chunk > 0:
            pause = min(pause, chunk - spent)
        time.sleep(max(pause, 0.0))
        delay = min(delay * 2, cap)


def cmd_outcome(workstream: str, item: str, shas: list[str]) -> None:
    check_workstream(workstream)
    pseudo = bool(PSEUDO_ID.fullmatch(item))
    if not pseudo and not ITEM_ID.fullmatch(item):
        print(f"loopx guard: {item!r} is not an item id like m12 or 089, or routine:<name>, or ci:<slug>", file=sys.stderr)
        sys.exit(2)
    if any(not COMMIT.fullmatch(sha) for sha in shas):
        print("loopx guard: commits must be 7-40 hex digits", file=sys.stderr)
        sys.exit(2)
    fetched = git("fetch", "-q", "origin", "main").returncode == 0

    where = "n/a"
    if not pseudo:
        stem = item.removesuffix(".md")

        def matches(name: str) -> bool:
            return name == stem or name.removesuffix(".md") == stem or name.startswith(f"{stem}-")

        tree = Tree(REMOTE_REF)
        where = "absent"
        for place, directory in (
            ("open", f".pm/{workstream}"),
            ("done", f".pm/{workstream}/done"),
            ("blocked", f".pm/{workstream}/blocked"),
        ):
            if any(matches(name) for name, _ in tree.children(directory)):
                where = place
                break

    missing = [sha for sha in shas if git("merge-base", "--is-ancestor", sha, REMOTE_REF).returncode != 0]
    head = git("rev-parse", "HEAD").stdout.strip()
    # "Pushed" means nothing local is missing from origin/main. Another loop
    # pushing in the meantime moves origin/main ahead, and that is fine.
    pushed = bool(head) and nothing_unpushed()
    clean = tree_clean()
    ok = fetched and pushed and clean and not missing and where != "open"
    if shas and not missing:
        record_pushes(workstream, shas)
    label = item if pseudo else f"{workstream}/{item}"
    print(
        json.dumps(
            {
                "item": label,
                "ok": ok,
                "where": where,
                "fetched": fetched,
                "pushed": pushed,
                "clean": clean,
                "missing_commits": missing,
                "head": head[:12],
                "settled": settle_label(label) if ok else False,
            }
        )
    )


def cmd_board(workstream: str) -> None:
    check_workstream(workstream)
    facts = board(Tree(), workstream)
    ci = own_ci(workstream, mark=True)
    review, unchanged = blocked_review(workstream)
    schedule = due_routine(workstream)
    due = schedule["due"]

    if ci["own_failures"]:
        nxt = ci["own_failures"][0]["label"]
    elif facts["milestones"] or facts["notes"]:
        nxt = next_pick(workstream, facts["milestones"], facts["notes"])
    elif due:
        nxt = f"routine:{due['name']}"
    else:
        nxt = None
    routine = {"due": due, "next_in": schedule.get("next_in")}
    if schedule.get("problems"):
        routine["problems"] = schedule["problems"]
    print(
        json.dumps(
            {
                "workstream": workstream,
                "next": nxt,
                "ci": {k: ci[k] for k in ("checked", "own_failures", "still_red", "pending") if k in ci}
                | ({"reason": ci["reason"]} if "reason" in ci else {}),
                "ready": [*facts["milestones"], *facts["notes"]],
                "waiting": facts["waiting"],
                "blocked": {"review": review, "unchanged": unchanged},
                "routine": routine,
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

    note = ""
    inflight = state.get("inflight")
    if isinstance(inflight, dict):
        verdict = inflight_verdict(inflight)
        if verdict == "running":
            state["blocks"] = 0
            write_json(path, state)
            print("{}")  # a background worker is running; its notification wakes the loop
            sys.exit(0)
        label = inflight.get("label", "the worker")
        state.pop("inflight", None)
        if verdict == "finished":
            note = (
                f"The worker for {label} is finished: its item left the open tree and "
                "everything is pushed. Verify it with `outcome` if you have not, then continue. "
            )
        else:
            note = (
                f"The in-flight mark for {label} ran out without a finished outcome. Check "
                "on that worker before anything else: verify with `outcome`, or dispatch again. "
            )

    listen = state.get("listen", True) is not False
    milestones, notes = actionable(workstream)
    remaining = len(milestones) + len(notes)

    if remaining == 0:
        if not listen:
            allow(path)  # genuinely Done, or only waiting and blocked work is left
        listener = read_json(wait_path(workstream))
        if listener.get("gave_up"):
            try:
                wait_path(workstream).unlink()
            except OSError:
                pass
            allow(path)  # the listen window ran out: Done
        if listener_alive(listener):
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
            f"/loopx {workstream} has nothing ready on the board and is not listening. "
            f"Run `python3 scripts/loopx-guard.py board {workstream}` and follow its `next`: "
            "an own CI failure or a due routine comes first. If it names nothing, write the "
            f"drained report, start `python3 scripts/loopx-guard.py wait {workstream}` as a "
            "background command, and end the turn; it wakes this session when work lands. "
            "If the loop genuinely ends, run `python3 scripts/loopx-guard.py end`."
        )
    else:
        nxt = next_pick(workstream, milestones, notes)
        reason = (
            f"/loopx {workstream} is still running: {remaining} item(s) are ready "
            f"and the next pick is {nxt}. This is not one of the three exits, and a "
            f"progress summary is not an exit. If a worker for {nxt} is already running, "
            f"run `python3 scripts/loopx-guard.py dispatch {nxt}` and end the turn; never "
            "launch a second worker for the same item. Otherwise mark it with `dispatch`, "
            "launch its worker, and end the turn. An item that cannot proceed is blocked "
            "by its worker through /pm block; when the loop genuinely ends, run "
            "`python3 scripts/loopx-guard.py end`."
        )
    print(json.dumps({"decision": "block", "reason": note + reason}))


def parse_wait_options(args: list[str]) -> dict[str, float]:
    options = {
        "min": WAIT_MIN,
        "max": WAIT_MAX,
        "give-up": WAIT_GIVE_UP,
        "chunk": 0.0,
        "fetch-give-up": WAIT_FETCH_GIVE_UP,
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
    elif args[0] == "outcome" and len(args) >= 3:
        cmd_outcome(args[1], args[2], args[3:])
    elif args[0] == "board" and len(args) == 2:
        cmd_board(args[1])
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
