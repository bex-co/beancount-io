#!/usr/bin/env python3
"""Keep `/loopx` running while its workstream still has actionable work.

The rule — never stop while a next pick exists — is stated four times in
`.agents/skills/loopx/SKILL.md`, and was still broken once: the loop wrote an
end-of-run summary and treated writing it as a turn boundary, naming the next
pick in the same breath. Prose cannot enforce itself. This can.

Three modes:

    loopx-guard.py start <wN>   mark a loop active for this repo
    loopx-guard.py end          clear the mark (a genuine Exit)
    loopx-guard.py              Stop-hook mode: reads the hook payload on
                                stdin, blocks the stop when work remains

Stop-hook mode is inert unless a loop is active, so the hook costs nothing in
ordinary sessions. The mark binds to the first session that tries to stop, so a
mark left behind by a crashed session never blocks a different one.
"""

from __future__ import annotations

import json
import os
import pathlib
import sys
import time

# A stop attempt that makes no progress may repeat; bound it rather than spin.
MAX_BLOCKS_WITHOUT_PROGRESS = 25


def project_dir() -> pathlib.Path:
    return pathlib.Path(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())


def state_path() -> pathlib.Path:
    """Runtime state, never project content: `.git/` is inherently untracked."""
    git = project_dir() / ".git"
    if git.is_dir():
        return git / "loopx-active.json"
    # Worktrees and odd checkouts: fall back to a per-repo temp file.
    import hashlib
    import tempfile

    key = hashlib.sha256(str(project_dir()).encode()).hexdigest()[:16]
    return pathlib.Path(tempfile.gettempdir()) / f"loopx-active-{key}.json"


def actionable(workstream: str) -> tuple[list[str], list[str]]:
    """Open milestones and open inbox notes, in the loop's own pick order."""
    root = project_dir() / ".pm" / workstream
    if not root.is_dir():
        return [], []
    milestones = sorted(p.name for p in root.glob("m*") if p.is_dir())
    notes = sorted(
        p.name for p in root.glob("*.md") if p.name.lower() != "readme.md"
    )
    return milestones, notes


def allow(clear: bool = False) -> None:
    if clear:
        try:
            state_path().unlink()
        except OSError:
            pass
    print("{}")
    sys.exit(0)


def cmd_start(workstream: str) -> None:
    state_path().write_text(
        json.dumps(
            {
                "workstream": workstream,
                "started": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
                "blocks": 0,
                "remaining": None,
            }
        )
    )
    print(f"loopx guard armed for {workstream}")


def cmd_end() -> None:
    try:
        state_path().unlink()
        print("loopx guard cleared")
    except OSError:
        print("loopx guard was not armed")


def cmd_hook() -> None:
    path = state_path()
    if not path.is_file():
        allow()

    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}
    try:
        state = json.loads(path.read_text())
    except Exception:
        allow(clear=True)

    session = payload.get("session_id")
    owner = state.get("session_id")
    if owner is None and session:
        state["session_id"] = session  # bind to the first session that stops
    elif owner and session and owner != session:
        allow()  # a different session; not this loop's business

    workstream = state.get("workstream")
    if not workstream:
        allow(clear=True)

    milestones, notes = actionable(workstream)
    remaining = len(milestones) + len(notes)
    if remaining == 0:
        allow(clear=True)  # genuinely Done

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
    try:
        path.write_text(json.dumps(state))
    except OSError:
        pass

    nxt = f"{workstream}/{milestones[0]}" if milestones else f"{workstream}/{notes[0]}"
    print(
        json.dumps(
            {
                "decision": "block",
                "reason": (
                    f"/loopx {workstream} is still running: {remaining} item(s) remain "
                    f"and the next pick is {nxt}. This is not one of the three exits — "
                    "nothing is blocked and a progress summary is not an exit. Pick "
                    f"{nxt}, triage it on evidence, and continue. If every remaining "
                    "item really is blocked, move them with /pm block; when the loop "
                    "genuinely ends, run `python3 scripts/loopx-guard.py end`."
                ),
            }
        )
    )


def main() -> None:
    args = sys.argv[1:]
    if not args:
        cmd_hook()
    elif args[0] == "start" and len(args) == 2:
        cmd_start(args[1])
    elif args[0] == "end":
        cmd_end()
    else:
        print(__doc__, file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
