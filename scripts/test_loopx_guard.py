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


class GuardFixture(unittest.TestCase):
    """A checkout with a w2 and a w5 board; no remote."""

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


class GuardTest(GuardFixture):

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


class RemoteFixture(unittest.TestCase):
    """A checkout with a real origin, and a second clone that pushes board changes."""

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


class RemoteTest(RemoteFixture):
    """`wait` and `outcome` read origin/main, so these run against a real remote."""

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


class InflightTest(GuardFixture):
    """`dispatch` lets turns end while a background worker runs."""

    def test_inflight_worker_lets_stops_through_until_settled(self) -> None:
        self.run_guard("start", "w2", session=A)
        self.assertIn("in flight", self.run_guard("dispatch", "w2/m53", session=A).stdout)
        for _ in range(30):  # never counted toward the stand-down limit
            self.assertEqual(self.stop(A), {})
        self.assertEqual(self.marks(), [A])
        self.assertIn("settled w2/m53", self.run_guard("settle", session=A).stdout)
        self.assertEqual(self.stop(A)["decision"], "block")

    def test_inflight_belongs_to_the_dispatching_session(self) -> None:
        self.run_guard("start", "w2", session=A)
        self.run_guard("start", "w5", session=B)
        self.run_guard("dispatch", "w2/m53", session=A)
        self.assertEqual(self.stop(A), {})
        self.assertEqual(self.stop(B)["decision"], "block")

    def test_a_lost_worker_expires_and_the_loop_is_held_again(self) -> None:
        self.run_guard("start", "w2", session=A)
        self.run_guard("dispatch", "w2/m53", session=A)
        mark = self.repo / ".git" / "loopx" / f"{A}.json"
        state = json.loads(mark.read_text())
        state["inflight"]["since"] = time.time() - 13 * 3600
        mark.write_text(json.dumps(state))
        self.assertEqual(self.stop(A)["decision"], "block")
        self.assertNotIn("inflight", json.loads(mark.read_text()))

    def test_dispatch_without_a_loop_is_a_no_op(self) -> None:
        self.assertIn("no loop armed", self.run_guard("dispatch", "w2/m53", session=A).stdout)
        self.assertIn("no loop armed", self.run_guard("settle", session=A).stdout)
        self.assertEqual(self.marks(), [])


ROUTINES = """# w2 routines

Budget: 2 runs/day

| name | command | every | when | paths |
| --- | --- | --- | --- | --- |
| cli-dead-code | `/routine-dead-code-removal cli` | 24h | changed | cli |
| dashboard-flaky | `/routine-flaky-test-fixer dashboard` | 3d | changed | dashboard |
"""


class RoutineTest(RemoteFixture):
    """Routine scheduling reads origin/main and keeps its state in .git/loopx/."""

    def setUp(self) -> None:
        super().setUp()
        self.write("cli/app.py", "print(1)\n")
        self.write("dashboard/app.ts", "1\n")
        self.write(".pm/w2/routine/README.md", ROUTINES)
        self.push("routines")

    def due(self) -> dict:
        result = self.run_guard("routine-due", "w2")
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def done(self, name: str, result: str):
        return self.run_guard("routine-done", "w2", name, result)

    def state(self) -> dict:
        return json.loads((self.repo / ".git" / "loopx" / "routine-w2.state").read_text())

    def save(self, state: dict) -> None:
        (self.repo / ".git" / "loopx" / "routine-w2.state").write_text(json.dumps(state))

    def fetch(self) -> None:
        self.git(self.repo, "fetch", "-q", "origin", "main")

    def schedule(self, table: str, budget: str = "") -> None:
        header = "| name | command | every | when | paths |\n| --- | --- | --- | --- | --- |\n"
        self.write(".pm/w2/routine/README.md", budget + header + table)
        self.push("schedule")
        self.fetch()

    def test_never_run_routines_are_due_in_list_order(self) -> None:
        self.fetch()
        self.assertEqual(self.due()["due"], {
            "name": "cli-dead-code", "command": "/routine-dead-code-removal cli",
            "when": "changed", "paths": ["cli"], "interval_hours": 24.0,
        })
        self.done("cli-dead-code", "empty")
        self.assertEqual(self.due()["due"]["name"], "dashboard-flaky")

    def test_any_command_is_a_routine(self) -> None:
        self.schedule(
            "| links | python3 scripts/check-links.py --fix | 1d | | |\n"
            "| triage | Read open CI failures and file each as an inbox note | 2d | always | |\n"
            "| simplify | `/simplify` | 1w | changed | |\n"
        )
        reply = self.due()
        self.assertEqual(reply["problems"], [])
        self.assertEqual(reply["due"]["command"], "python3 scripts/check-links.py --fix")
        self.assertEqual(reply["due"]["when"], "always")
        self.done("links", "empty")
        self.assertEqual(self.due()["due"]["command"], "Read open CI failures and file each as an inbox note")

    def test_a_ran_routine_waits_for_its_interval_and_a_path_change(self) -> None:
        self.fetch()
        self.done("cli-dead-code", "found")
        self.done("dashboard-flaky", "found")
        self.assertIsNone(self.due()["due"])
        # Interval elapsed, but cli/ has not changed: still not due.
        state = self.state()
        for entry in state["routines"].values():
            entry["last_run"] -= 4 * 86400
        state["runs"] = []
        self.save(state)
        reply = self.due()
        self.assertIsNone(reply["due"])
        self.assertIn("no change since", reply["reason"])
        # A commit outside cli/ does not count; one inside does.
        self.write("mobile/app.ts", "1\n")
        self.push("mobile change")
        self.fetch()
        self.assertIsNone(self.due()["due"])
        self.write("cli/app.py", "print(2)\n")
        self.push("cli change")
        self.fetch()
        self.assertEqual(self.due()["due"]["name"], "cli-dead-code")

    def test_a_changed_row_without_paths_waits_for_any_commit(self) -> None:
        self.schedule("| any | /simplify | 1m | changed | |\n")
        self.done("any", "found")
        state = self.state()
        state["routines"]["any"]["last_run"] -= 120
        self.save(state)
        self.assertIsNone(self.due()["due"])
        self.write("mobile/app.ts", "2\n")
        self.push("any change")
        self.fetch()
        self.assertEqual(self.due()["due"]["name"], "any")

    def test_empty_runs_double_the_interval_and_a_find_resets_it(self) -> None:
        self.fetch()
        key = "cli-dead-code"
        self.done(key, "empty")
        self.assertEqual(self.state()["routines"][key]["interval"], 2 * 86400)
        self.done(key, "empty")
        self.assertEqual(self.state()["routines"][key]["interval"], 4 * 86400)
        self.assertEqual(self.state()["routines"][key]["empty_runs"], 2)
        for _ in range(6):
            self.done(key, "empty")
        self.assertEqual(self.state()["routines"][key]["interval"], 14 * 86400)  # capped
        self.done(key, "found")
        self.assertEqual(self.state()["routines"][key]["interval"], 86400)
        self.assertEqual(self.state()["routines"][key]["empty_runs"], 0)

    def test_the_daily_budget_stops_further_runs(self) -> None:
        self.fetch()
        self.done("cli-dead-code", "found")
        self.done("dashboard-flaky", "found")
        state = self.state()
        for entry in state["routines"].values():
            entry["last_run"] -= 4 * 86400
            entry["last_sha"] = ""
        self.save(state)
        reply = self.due()
        self.assertIsNone(reply["due"])
        self.assertIn("budget of 2", reply["reason"])

    def test_wait_exits_5_for_a_due_routine_and_board_work_comes_first(self) -> None:
        result = self.run_guard("wait", "w2", *FAST)
        self.assertEqual(result.returncode, 5, result.stdout + result.stderr)
        self.assertIn("cli-dead-code (/routine-dead-code-removal cli)", result.stdout)
        self.assertNotIn("since", self.listener())
        self.write(".pm/w2/011.md", "note\n")
        self.push("board work")
        result = self.run_guard("wait", "w2", *FAST)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_wait_idles_once_every_routine_is_waiting(self) -> None:
        self.fetch()
        self.done("cli-dead-code", "found")
        self.done("dashboard-flaky", "found")
        result = self.run_guard("wait", "w2", *FAST, "--chunk", "0.2")
        self.assertEqual(result.returncode, 10, result.stdout + result.stderr)

    def test_bad_rows_are_reported_and_skipped(self) -> None:
        self.schedule(
            "| Bad_Name | /x | 24h | | |\n"
            "| often | /x | often | | |\n"
            "| nocmd |  | 1d | | |\n"
            "| gone | /x | 1d | changed | nowhere |\n"
            "| escape | /x | 1d | changed | ../etc |\n"
            "| short | /x |\n"
            "| twice | /x | 1d | | |\n"
            "| twice | /y | 1d | | |\n"
        )
        reply = self.due()
        problems = " ".join(reply["problems"])
        self.assertIn("'Bad_Name' is not a routine name", problems)
        self.assertIn("'often' is not an interval", problems)
        self.assertIn("nocmd: no command", problems)
        self.assertIn("gone: no nowhere on origin/main", problems)
        self.assertIn("escape: paths must be repository-relative", problems)
        self.assertIn("'short': a row needs name, command, and every", problems)
        self.assertIn("twice: listed twice", problems)
        self.assertEqual(reply["due"]["name"], "twice")  # the first copy still runs

    def test_no_routine_list_means_nothing_due(self) -> None:
        self.git(self.other, "rm", "-q", "-r", ".pm/w2/routine")
        self.git(self.other, "commit", "-q", "-m", "no routines")
        self.git(self.other, "push", "-q", "origin", "HEAD:main")
        self.fetch()
        self.assertEqual(self.due(), {"due": None, "reason": "no routine list", "problems": [], "next_in": None})

    def test_always_rows_run_on_a_fixed_cadence_without_a_change_gate(self) -> None:
        self.schedule("| cli-qa | /qa-find-bugs-cli w2 SHIP=1 | 30m | always | cli |\n", budget="Budget: 48 runs/day\n\n")
        self.assertEqual(self.due()["due"], {
            "name": "cli-qa", "command": "/qa-find-bugs-cli w2 SHIP=1",
            "when": "always", "paths": ["cli"], "interval_hours": 0.5,
        })
        for _ in range(3):  # empty runs never back off
            self.done("cli-qa", "empty")
            self.assertEqual(self.state()["routines"]["cli-qa"]["interval"], 1800)
        self.assertIsNone(self.due()["due"])  # ran just now
        state = self.state()
        state["routines"]["cli-qa"]["last_run"] -= 1801
        self.save(state)
        # Nothing under cli/ changed since the last run, yet it is due again.
        self.assertEqual(self.due()["due"]["name"], "cli-qa")

    def test_a_row_without_when_runs_on_its_schedule(self) -> None:
        self.schedule("| cli-qa | /qa-find-bugs-cli w2 SHIP=1 | 30m |\n")
        self.assertEqual(self.due()["due"]["when"], "always")
        self.done("cli-qa", "empty")
        reply = self.due()
        self.assertIsNone(reply["due"])
        self.assertAlmostEqual(reply["next_in"], 1800, delta=60)
        self.assertEqual(self.state()["routines"]["cli-qa"]["interval"], 1800)  # no backoff

    def test_wait_wakes_on_the_routine_schedule_not_the_backed_off_poll(self) -> None:
        self.schedule("| cli-qa | /qa-find-bugs-cli w2 SHIP=1 | 0.03m | always |\n")  # due 1.8 s after a run
        self.done("cli-qa", "empty")
        started = time.time()
        # The board poll alone would not look again for 20 s.
        result = self.run_guard("wait", "w2", "--min", "20", "--max", "20", "--give-up", "60")
        self.assertEqual(result.returncode, 5, result.stdout + result.stderr)
        self.assertLess(time.time() - started, 10)

    def test_a_scheduled_routine_outlasts_the_idle_limit(self) -> None:
        self.schedule("| cli-qa | /qa-find-bugs-cli w2 SHIP=1 | 0.03m | always |\n")
        self.done("cli-qa", "empty")
        result = self.run_guard("wait", "w2", "--min", "20", "--max", "20", "--give-up", "0.1")
        self.assertEqual(result.returncode, 5, result.stdout + result.stderr)

    def test_board_work_wins_over_a_due_routine(self) -> None:
        self.schedule("| cli-qa | /qa-find-bugs-cli w2 SHIP=1 | 30m | always |\n")
        self.assertIsNotNone(self.due()["due"])
        self.write(".pm/w2/m9/README.md", "milestone\n")
        self.push("board work")
        result = self.run_guard("wait", "w2", *FAST)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("next pick w2/m9", result.stdout)

    def test_a_spent_budget_says_when_it_frees_up(self) -> None:
        self.schedule("| cli-qa | /qa-find-bugs-cli w2 SHIP=1 | 1m |\n", budget="Budget: 1 runs/day\n\n")
        self.done("cli-qa", "found")
        reply = self.due()
        self.assertIn("budget of 1", reply["reason"])
        self.assertAlmostEqual(reply["next_in"], 86400, delta=60)

    def test_rejects_an_unknown_when(self) -> None:
        self.schedule("| cli-dead-code | /routine-dead-code-removal cli | 1d | sometimes |\n")
        self.assertIn("when must be changed or always", " ".join(self.due()["problems"]))

    def test_routine_done_rejects_unlisted_or_malformed_runs(self) -> None:
        self.fetch()
        self.assertEqual(self.done("not-listed", "found").returncode, 2)
        self.assertEqual(self.done("cli-dead-code", "maybe").returncode, 2)
        self.assertEqual(self.done("../x", "found").returncode, 2)
        self.assertEqual(self.run_guard("routine-done", "w2", "routine-dead-code-removal", "cli", "found").returncode, 2)


if __name__ == "__main__":
    unittest.main()
