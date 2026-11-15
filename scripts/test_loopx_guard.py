#!/usr/bin/env python3
"""Tests for loopx-guard.py: each loop guard belongs to the session that armed it.

Every case runs the real script as a subprocess, the way Claude Code runs it:
`start`/`end` through a Bash tool call that carries CLAUDE_CODE_SESSION_ID, and
the Stop and SessionEnd hooks with a JSON payload on stdin.

    python3 scripts/test_loopx_guard.py
"""

from __future__ import annotations

import json
import os
import pathlib
import subprocess
import sys
import tempfile
import time
import unittest

GUARD = pathlib.Path(__file__).resolve().parent / "loopx-guard.py"
A, B = "session-a", "session-b"


class GuardTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.repo = pathlib.Path(self._tmp.name)
        (self.repo / ".git").mkdir()
        self.board("w2", milestones=["m53"], notes=["089.md"])
        self.board("w5", notes=["779.md"])

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def board(self, workstream: str, milestones=(), notes=()) -> None:
        root = self.repo / ".pm" / workstream
        root.mkdir(parents=True, exist_ok=True)
        (root / "README.md").write_text(f"# {workstream}\n")
        for name in milestones:
            (root / name).mkdir()
        for name in notes:
            (root / name).write_text("note\n")

    def run_guard(self, *args: str, session: str | None = None, payload: dict | None = None):
        env = {k: v for k, v in os.environ.items() if k != "CLAUDE_CODE_SESSION_ID"}
        env["CLAUDE_PROJECT_DIR"] = str(self.repo)
        if session is not None:
            env["CLAUDE_CODE_SESSION_ID"] = session
        return subprocess.run(
            [sys.executable, str(GUARD), *args],
            input=json.dumps(payload) if payload is not None else "",
            capture_output=True,
            text=True,
            env=env,
            check=False,
        )

    def stop(self, session: str) -> dict:
        result = self.run_guard(payload={"session_id": session, "hook_event_name": "Stop"})
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def marks(self) -> list[str]:
        directory = self.repo / ".git" / "loopx"
        return sorted(p.stem for p in directory.glob("*.json")) if directory.is_dir() else []

    def test_start_binds_to_the_calling_session_and_blocks_its_stop(self) -> None:
        self.assertIn("armed for w2", self.run_guard("start", "w2", session=A).stdout)
        decision = self.stop(A)
        self.assertEqual(decision["decision"], "block")
        self.assertIn("the next pick is w2/m53", decision["reason"])

    def test_another_session_in_the_same_checkout_is_never_blocked(self) -> None:
        # The bug this fixes: B stopped first and was held to A's loop.
        self.run_guard("start", "w2", session=A)
        self.assertEqual(self.stop(B), {})
        self.assertEqual(self.marks(), [A])
        self.assertEqual(self.stop(A)["decision"], "block")

    def test_two_sessions_run_independent_loops(self) -> None:
        self.run_guard("start", "w2", session=A)
        self.run_guard("start", "w5", session=B)
        self.assertIn("w2/m53", self.stop(A)["reason"])
        self.assertIn("w5/779.md", self.stop(B)["reason"])

    def test_start_outside_claude_code_arms_nothing(self) -> None:
        result = self.run_guard("start", "w2")
        self.assertEqual(result.returncode, 0)
        self.assertIn("not armed", result.stdout)
        self.assertEqual(self.marks(), [])
        self.assertEqual(self.stop(A), {})

    def test_end_clears_only_the_calling_session(self) -> None:
        self.run_guard("start", "w2", session=A)
        self.run_guard("start", "w5", session=B)
        self.assertIn("cleared", self.run_guard("end", session=A).stdout)
        self.assertEqual(self.stop(A), {})
        self.assertEqual(self.marks(), [B])
        self.assertIn("was not armed", self.run_guard("end", session=A).stdout)

    def test_session_end_hook_forgets_that_session(self) -> None:
        self.run_guard("start", "w2", session=A)
        self.run_guard("start", "w5", session=B)
        result = self.run_guard("forget", payload={"session_id": A, "hook_event_name": "SessionEnd"})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.marks(), [B])

    def drain_w2(self) -> None:
        (self.repo / ".pm" / "w2" / "m53").rmdir()
        (self.repo / ".pm" / "w2" / "089.md").unlink()

    def write_listener(self, workstream: str, **state) -> None:
        directory = self.repo / ".git" / "loopx"
        directory.mkdir(exist_ok=True)
        (directory / f"wait-{workstream}.state").write_text(json.dumps(state))

    def test_drained_no_listen_workstream_lets_the_stop_through_and_clears_the_mark(self) -> None:
        self.assertIn("ends when drained", self.run_guard("start", "w2", "--no-listen", session=A).stdout)
        self.drain_w2()
        self.assertEqual(self.stop(A), {})
        self.assertEqual(self.marks(), [])

    def test_drained_listening_loop_is_held_until_a_wait_runs(self) -> None:
        self.assertIn("listens when drained", self.run_guard("start", "w2", session=A).stdout)
        self.drain_w2()
        decision = self.stop(A)
        self.assertEqual(decision["decision"], "block")
        self.assertIn("loopx-guard.py wait w2", decision["reason"])
        self.assertEqual(self.marks(), [A])

    def test_live_wait_lets_the_stop_through_and_keeps_the_mark(self) -> None:
        self.run_guard("start", "w2", session=A)
        self.drain_w2()
        self.write_listener("w2", since=time.time(), pid=os.getpid())
        for _ in range(30):  # never counted toward the stand-down limit
            self.assertEqual(self.stop(A), {})
        self.assertEqual(self.marks(), [A])

    def test_dead_wait_pid_does_not_count_as_listening(self) -> None:
        self.run_guard("start", "w2", session=A)
        self.drain_w2()
        dead = subprocess.Popen([sys.executable, "-c", "pass"])
        dead.wait()
        self.write_listener("w2", since=time.time(), pid=dead.pid)
        self.assertEqual(self.stop(A)["decision"], "block")

    def test_expired_listen_window_ends_the_loop(self) -> None:
        self.run_guard("start", "w2", session=A)
        self.drain_w2()
        self.write_listener("w2", since=0, gave_up=True)
        self.assertEqual(self.stop(A), {})
        self.assertEqual(self.marks(), [])
        self.assertFalse((self.repo / ".git" / "loopx" / "wait-w2.state").exists())

    def test_start_resets_the_idle_window(self) -> None:
        self.write_listener("w2", since=0, gave_up=True)
        self.run_guard("start", "w2", session=A)
        self.assertFalse((self.repo / ".git" / "loopx" / "wait-w2.state").exists())

    def test_start_warns_when_another_session_runs_the_same_workstream(self) -> None:
        self.run_guard("start", "w2", session=B)
        result = self.run_guard("start", "w2", session=A)
        self.assertIn("warning", result.stdout)
        self.assertIn(B, result.stdout)
        self.assertNotIn("warning", self.run_guard("start", "w5", session=A).stdout)

    def test_stands_down_after_repeated_stops_without_progress(self) -> None:
        self.run_guard("start", "w2", session=A)
        for _ in range(25):
            self.assertEqual(self.stop(A)["decision"], "block")
        final = self.stop(A)
        self.assertNotIn("decision", final)
        self.assertIn("stood down", final["systemMessage"])

    def test_progress_resets_the_spin_counter(self) -> None:
        self.run_guard("start", "w2", session=A)
        for _ in range(20):
            self.stop(A)
        (self.repo / ".pm" / "w2" / "m53").rmdir()  # one item shipped
        for _ in range(20):
            self.assertEqual(self.stop(A)["decision"], "block")

    def test_unsafe_session_ids_never_touch_the_filesystem(self) -> None:
        self.assertIn("not armed", self.run_guard("start", "w2", session="../../escape").stdout)
        self.assertEqual(self.stop("../../escape"), {})
        self.assertFalse((self.repo / "escape.json").exists())
        self.assertEqual(self.marks(), [])

    def test_rejects_a_workstream_that_is_not_an_id(self) -> None:
        result = self.run_guard("start", "../w2", session=A)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(self.marks(), [])

    def test_unreadable_mark_is_cleared_rather_than_blocking(self) -> None:
        directory = self.repo / ".git" / "loopx"
        directory.mkdir()
        (directory / f"{A}.json").write_text("{not json")
        self.assertEqual(self.stop(A), {})
        self.assertEqual(self.marks(), [])

    def test_old_repository_wide_mark_is_ignored_and_swept(self) -> None:
        legacy = self.repo / ".git" / "loopx-active.json"
        legacy.write_text(json.dumps({"workstream": "w2", "session_id": B, "blocks": 0}))
        self.assertEqual(self.stop(B), {})
        self.run_guard("start", "w5", session=A)
        self.assertFalse(legacy.exists())

    def test_start_sweeps_marks_left_by_crashed_sessions(self) -> None:
        self.run_guard("start", "w2", session=B)
        old = time.time() - 8 * 24 * 3600
        os.utime(self.repo / ".git" / "loopx" / f"{B}.json", (old, old))
        self.run_guard("start", "w5", session=A)
        self.assertEqual(self.marks(), [A])


GIT_ENV = {
    "GIT_AUTHOR_NAME": "loopx test",
    "GIT_AUTHOR_EMAIL": "loopx@example.invalid",
    "GIT_COMMITTER_NAME": "loopx test",
    "GIT_COMMITTER_EMAIL": "loopx@example.invalid",
    "GIT_CONFIG_GLOBAL": os.devnull,
    "GIT_CONFIG_NOSYSTEM": "1",
}
# Fast timings: polls every few ms instead of minutes.
FAST = ["--min", "0.02", "--max", "0.05"]


class RemoteTest(unittest.TestCase):
    """`wait` and `outcome` read origin/main, so these run against a real remote."""

    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        root = pathlib.Path(self._tmp.name)
        self.origin = root / "origin.git"
        self.repo = root / "work"  # the loop's checkout
        self.other = root / "other"  # another worker pushing board changes
        self.git(root, "init", "-q", "--bare", "-b", "main", str(self.origin))
        self.git(root, "clone", "-q", str(self.origin), str(self.other))
        self.write(".pm/w2/README.md", "# w2\n")
        self.write(".pm/w2/done/001.md", "done\n")
        self.push("seed")
        self.git(root, "clone", "-q", str(self.origin), str(self.repo))

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def git(self, cwd: pathlib.Path, *args: str) -> str:
        result = subprocess.run(
            ["git", *args], cwd=cwd, capture_output=True, text=True,
            env={**os.environ, **GIT_ENV}, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout

    def write(self, rel: str, text: str) -> None:
        path = self.other / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)

    def push(self, message: str) -> None:
        self.git(self.other, "add", "-A")
        self.git(self.other, "commit", "-q", "-m", message)
        self.git(self.other, "push", "-q", "origin", "HEAD:main")

    def run_guard(self, *args: str, timeout: float = 30):
        env = {k: v for k, v in os.environ.items() if k != "CLAUDE_CODE_SESSION_ID"}
        env.update(GIT_ENV, CLAUDE_PROJECT_DIR=str(self.repo))
        return subprocess.run(
            [sys.executable, str(GUARD), *args], capture_output=True, text=True,
            env=env, timeout=timeout, check=False,
        )

    def listener(self) -> dict:
        path = self.repo / ".git" / "loopx" / "wait-w2.state"
        return json.loads(path.read_text()) if path.exists() else {}

    def test_wait_wakes_when_a_note_lands_on_origin(self) -> None:
        self.write(".pm/w2/007.md", "new note\n")
        self.push("add note")
        result = self.run_guard("wait", "w2", *FAST)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("next pick w2/007.md", result.stdout)
        self.assertNotIn("since", self.listener())
        self.assertNotIn("pid", self.listener())
        # It only reports; the checkout is not touched until the loop pulls.
        self.assertFalse((self.repo / ".pm" / "w2" / "007.md").exists())

    def test_wait_wakes_while_running_and_prefers_milestones(self) -> None:
        proc = subprocess.Popen(
            [sys.executable, str(GUARD), "wait", "w2", *FAST, "--give-up", "20"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
            env={**os.environ, **GIT_ENV, "CLAUDE_PROJECT_DIR": str(self.repo)},
        )
        time.sleep(0.3)
        self.assertIsNone(proc.poll(), "wait exited before any work landed")
        self.assertEqual(self.listener().get("pid"), proc.pid)
        self.write(".pm/w2/009.md", "note\n")
        self.write(".pm/w2/m4/README.md", "milestone\n")
        self.push("add work")
        out, err = proc.communicate(timeout=20)
        self.assertEqual(proc.returncode, 0, err)
        self.assertIn("next pick w2/m4", out)

    def test_moves_into_done_or_blocked_do_not_wake(self) -> None:
        self.write(".pm/w2/done/002.md", "done\n")
        self.write(".pm/w2/blocked/m3/README.md", "blocked\n")
        self.write(".pm/w5/010.md", "other workstream\n")
        self.push("unrelated board moves")
        result = self.run_guard("wait", "w2", *FAST, "--chunk", "0.2")
        self.assertEqual(result.returncode, 10, result.stdout + result.stderr)

    def test_chunks_share_one_idle_window_until_it_expires(self) -> None:
        first = self.run_guard("wait", "w2", *FAST, "--chunk", "0.1", "--give-up", "0.6")
        self.assertEqual(first.returncode, 10, first.stderr)
        since = self.listener()["since"]
        self.assertNotIn("pid", self.listener())
        second = self.run_guard("wait", "w2", *FAST, "--chunk", "0.1", "--give-up", "0.6")
        self.assertEqual(second.returncode, 10, second.stderr)
        self.assertEqual(self.listener()["since"], since)
        final = self.run_guard("wait", "w2", *FAST, "--give-up", "0.6")
        self.assertEqual(final.returncode, 3, final.stderr)
        self.assertIn("listen window is over", final.stdout)
        self.assertTrue(self.listener()["gave_up"])

    def test_wait_stops_when_fetch_keeps_failing(self) -> None:
        self.git(self.repo, "remote", "set-url", "origin", str(self.origin) + "-missing")
        result = self.run_guard("wait", "w2", *FAST, "--fetch-failures", "3")
        self.assertEqual(result.returncode, 4)
        self.assertIn("failed 3 times", result.stdout)

    def test_wait_rejects_bad_arguments(self) -> None:
        self.assertEqual(self.run_guard("wait", "../w2").returncode, 2)
        self.assertEqual(self.run_guard("wait", "w2", "--min").returncode, 2)
        self.assertEqual(self.run_guard("wait", "w2", "--bogus", "1").returncode, 2)

    def outcome(self, item: str) -> dict:
        result = self.run_guard("outcome", "w2", item)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_outcome_reports_where_an_item_sits_on_origin(self) -> None:
        self.write(".pm/w2/m4/README.md", "open\n")
        self.write(".pm/w2/blocked/m3/README.md", "blocked\n")
        self.write(".pm/w2/008-slugged-note.md", "open note\n")
        self.push("board")
        self.assertEqual(self.outcome("m4")["where"], "open")
        self.assertEqual(self.outcome("m3")["where"], "blocked")
        self.assertEqual(self.outcome("001")["where"], "done")
        self.assertEqual(self.outcome("001.md")["where"], "done")
        self.assertEqual(self.outcome("008")["where"], "open")
        self.assertEqual(self.outcome("m9")["where"], "absent")

    def test_outcome_reports_unpushed_and_dirty_checkouts(self) -> None:
        self.write(".pm/w2/m4/README.md", "open\n")
        self.push("board")
        behind = self.outcome("m4")
        self.assertTrue(behind["fetched"])
        self.assertFalse(behind["pushed"])  # origin moved; the checkout has not pulled
        self.git(self.repo, "pull", "-q", "--rebase")
        self.assertTrue(self.outcome("m4")["pushed"])
        self.assertTrue(self.outcome("m4")["clean"])
        (self.repo / "scratch.txt").write_text("partial work\n")
        self.assertFalse(self.outcome("m4")["clean"])

    def test_outcome_rejects_unsafe_ids(self) -> None:
        self.assertEqual(self.run_guard("outcome", "w2", "../m4").returncode, 2)


if __name__ == "__main__":
    unittest.main()
