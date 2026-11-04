#!/usr/bin/env python3
"""Unit tests for the routing runner's choice detection and scoring.

Stdlib unittest only; no paid client runs. Fake `claude`/`codex` executables
stand in for the clients where a test needs a real subprocess. Loaded by
`test_beancount_skills.py`, so the skills CI runs it.
"""

from __future__ import annotations

import importlib.util
import json
import os
import stat
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path
from unittest import mock

SCRIPTS_DIR = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("run_routing", SCRIPTS_DIR / "run-routing.py")
assert spec is not None and spec.loader is not None
routing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(routing)

SUITE = {"beancount-ask", "beancount-init", "beancount-migrate", "beancount-reconcile"}


def frontmatter(name: str) -> str:
    return f"---\nname: {name}\ndescription: A skill.\n---\n# {name}\n"


def codex_command(command: str, output: str, exit_code: int = 0, kind: str = "item.completed") -> dict:
    return {
        "type": kind,
        "item": {"type": "command_execution", "command": command, "aggregated_output": output, "exit_code": exit_code},
    }


class TestCodexDetection(unittest.TestCase):
    def detect(self, event: dict):
        meta: dict = {}
        return routing.codex_event(event, meta), meta

    def test_a_read_that_prints_the_frontmatter_is_a_choice_even_when_a_chained_search_exits_1(self):
        event = codex_command(
            "/bin/zsh -lc \"cat .agents/skills/beancount-ask/SKILL.md; rg --files -g '*.bean' | rg nothing\"",
            frontmatter("beancount-ask"),
            exit_code=1,
        )
        (opened, error), meta = self.detect(event)
        self.assertEqual((opened, error), (["beancount-ask"], None))
        self.assertIn("beancount-ask/SKILL.md", meta["evidence"])

    def test_a_search_or_a_failed_read_of_a_guessed_path_is_not_a_choice(self):
        for command, output in (
            ("rg --files .agents/skills | rg 'beancount-init/SKILL.md'", ""),
            ("cat /Users/someone/.agents/skills/beancount-migrate/SKILL.md", "cat: No such file or directory"),
            ("rg -n 'beancount-init/SKILL.md' notes.md", "notes.md:3: see beancount-init/SKILL.md"),
        ):
            with self.subTest(command=command):
                (opened, error), _ = self.detect(codex_command(command, output, exit_code=1))
                self.assertEqual((opened, error), (None, None))

    def test_one_command_opening_two_skills_records_both_in_order_once(self):
        command = (
            "cat .agents/skills/beancount-init/SKILL.md && cat .agents/skills/beancount-migrate/SKILL.md"
            " && cat .agents/skills/beancount-init/SKILL.md"
        )
        output = frontmatter("beancount-init") + frontmatter("beancount-migrate")
        (opened, _), _ = self.detect(codex_command(command, output))
        self.assertEqual(opened, ["beancount-init", "beancount-migrate"])

    def test_a_command_still_running_is_not_a_choice(self):
        event = codex_command("cat .agents/skills/beancount-ask/SKILL.md", "", exit_code=None, kind="item.started")
        self.assertEqual(self.detect(event)[0], (None, None))

    def test_a_failed_turn_is_an_error(self):
        event = {"type": "turn.failed", "error": {"message": "model not supported"}}
        self.assertEqual(self.detect(event)[0], (None, "model not supported"))


class TestClaudeDetection(unittest.TestCase):
    def test_the_skill_tool_call_names_the_choice_and_init_records_the_model(self):
        meta: dict = {}
        self.assertEqual(
            routing.claude_event({"type": "system", "subtype": "init", "model": "m-1"}, meta), (None, None)
        )
        call = {"type": "tool_use", "name": "Skill", "input": {"skill": "beancount-ask", "args": "q"}}
        event = {"type": "assistant", "message": {"content": [{"type": "text", "text": "hi"}, call]}}
        self.assertEqual(routing.claude_event(event, meta), (["beancount-ask"], None))
        self.assertEqual(meta["model"], "m-1")

    def test_other_tools_are_not_a_choice(self):
        call = {"type": "tool_use", "name": "Bash", "input": {"command": "cat x/SKILL.md"}}
        self.assertEqual(routing.claude_event({"type": "assistant", "message": {"content": [call]}}, {}), (None, None))

    def test_running_out_of_turns_is_not_an_error_but_a_failed_session_is(self):
        self.assertEqual(
            routing.claude_event({"type": "result", "is_error": True, "subtype": "error_max_turns"}, {}), (None, None)
        )
        self.assertEqual(
            routing.claude_event({"type": "result", "is_error": True, "subtype": "error_during_execution"}, {}),
            (None, "error_during_execution"),
        )


class TestScoring(unittest.TestCase):
    def result(self, expected: str, opened=None, error=None, **extra) -> dict:
        row = {"id": "x", "client": "codex", "expected": expected, "error": error, **extra}
        if opened is not None:
            row["opened"] = opened
        return row

    def test_labels(self):
        cases = [
            (self.result("beancount-migrate", ["beancount-init", "beancount-migrate"]), "beancount-migrate"),
            (self.result("beancount-ask", ["beancount-init", "beancount-migrate"]), "beancount-init"),
            (self.result("none", ["dont-code-but-answer"]), "none"),
            (self.result("beancount-ask", ["some-plugin:beancount-ask"]), "beancount-ask"),
            (self.result("none", ["dont-code-but-answer", "beancount-reconcile"]), "none"),
            (self.result("none", []), "none"),
            (self.result("beancount-ask", [], error="timeout after 1s"), None),
            # Results recorded before `opened` existed carry `chosen`.
            (self.result("beancount-ask", chosen="beancount-ask"), "beancount-ask"),
            (self.result("none", chosen="none"), "none"),
            (self.result("beancount-ask", chosen=None, error="boom"), None),
        ]
        for result, label in cases:
            with self.subTest(result=result):
                self.assertEqual(routing.result_label(result, SUITE), label)

    def test_for_none_the_first_skill_opened_decides(self):
        # Only a suite skill is matched against `opened`; `none` is not, since
        # every out-of-suite name normalizes to it. The first skill opened wins.
        result = self.result("none", ["dont-code-but-answer", "beancount-ask"])
        self.assertEqual(routing.result_label(result, SUITE), "none")
        result = self.result("none", ["beancount-ask", "dont-code-but-answer"])
        self.assertEqual(routing.result_label(result, SUITE), "beancount-ask")

    def test_score_counts_precision_recall_and_misses_per_client(self):
        entries = [
            {"id": "a1", "expected": "beancount-ask"},
            {"id": "a2", "expected": "beancount-ask"},
            {"id": "r1", "expected": "beancount-reconcile"},
            {"id": "n1", "expected": "none"},
        ]
        results = [
            {"id": "a1", "client": "codex", "expected": "beancount-ask", "opened": ["beancount-ask"], "error": None},
            {"id": "a2", "client": "codex", "expected": "beancount-ask", "opened": [], "error": None},
            {"id": "r1", "client": "codex", "expected": "beancount-reconcile", "opened": [], "error": "timeout after 9s"},
            {"id": "n1", "client": "codex", "expected": "none", "opened": ["beancount-ask"], "error": None},
            {"id": "a1", "client": "claude", "expected": "beancount-ask", "opened": ["beancount-ask"], "error": None},
        ]
        summary = routing.score(entries, results, SUITE)
        codex = summary["codex"]
        self.assertEqual((codex["correct"], codex["total"]), (1, 4))
        self.assertEqual(codex["per_label"]["beancount-ask"], {"precision": 0.5, "recall": 0.5, "support": 2})
        self.assertEqual(codex["per_label"]["none"], {"precision": 0.0, "recall": 0.0, "support": 1})
        self.assertEqual(codex["per_label"]["beancount-reconcile"]["recall"], 0.0)
        self.assertIsNone(codex["per_label"]["beancount-init"]["precision"])
        self.assertEqual(
            codex["misses"],
            [
                {"id": "a2", "expected": "beancount-ask", "chosen": "none"},
                {"id": "n1", "expected": "none", "chosen": "beancount-ask"},
                {"id": "r1", "expected": "beancount-reconcile", "chosen": "error"},
            ],
        )
        self.assertEqual((summary["claude"]["correct"], summary["claude"]["total"]), (1, 1))
        self.assertIn("## codex: 1/4 routed as labeled", routing.report(summary))


class TestRunOne(unittest.TestCase):
    """Drive `run_one` against fake client executables on PATH."""

    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.workspace = self.root / "ws"
        self.workspace.mkdir()
        patch = mock.patch.dict(os.environ, {"PATH": f"{self.bin}{os.pathsep}{os.environ['PATH']}"})
        patch.start()
        self.addCleanup(patch.stop)

    def fake(self, name: str, body: str) -> None:
        path = self.bin / name
        path.write_text(f"#!{sys.executable}\n" + textwrap.dedent(body))
        path.chmod(path.stat().st_mode | stat.S_IEXEC)

    def test_the_client_is_stopped_at_its_first_choice(self):
        marker = self.root / "kept-running"
        event = codex_command("cat .agents/skills/beancount-ask/SKILL.md", frontmatter("beancount-ask"))
        self.fake(
            "codex",
            f"""
            import json, sys, time
            print(json.dumps({{"type": "turn.started"}}), flush=True)
            print({json.dumps(json.dumps(event))}, flush=True)
            time.sleep(5)
            open({str(marker)!r}, "w").write("still running")
            """,
        )
        entry = {"id": "ask", "prompt": "q", "expected": "beancount-ask"}
        result = routing.run_one("codex", entry, self.workspace, None, timeout=30)
        self.assertEqual((result["opened"], result["error"]), (["beancount-ask"], None))
        self.assertLess(result["seconds"], 4)
        self.assertFalse(marker.exists())

    def test_a_silent_client_is_timed_out_by_the_watchdog(self):
        self.fake("claude", "import time\ntime.sleep(20)\n")
        entry = {"id": "q", "prompt": "q", "expected": "none"}
        result = routing.run_one("claude", entry, self.workspace, None, timeout=1)
        self.assertEqual(result["opened"], [])
        self.assertEqual(result["error"], "timeout after 1s")
        self.assertLess(result["seconds"], 5)
        self.assertIsNone(routing.result_label(result, SUITE))

    def test_reconnecting_client_can_recover_and_choose_a_skill(self):
        event = codex_command("cat .agents/skills/beancount-ask/SKILL.md", frontmatter("beancount-ask"))
        self.fake(
            "codex",
            f"""
            import json
            print(json.dumps({{"type": "error", "message": "Reconnecting... 2/5 (workspace routing discovery timed out)"}}), flush=True)
            print({json.dumps(json.dumps(event))}, flush=True)
            """,
        )
        entry = {"id": "ask", "prompt": "q", "expected": "beancount-ask"}
        result = routing.run_one("codex", entry, self.workspace, None, timeout=10)
        self.assertEqual((result["opened"], result["error"]), (["beancount-ask"], None))

    def test_reconnect_requires_a_completed_turn_before_counting_none(self):
        notice = {"type": "error", "message": "Reconnecting... 2/5 (request timed out)"}
        for ending, expected_error in (
            ({"type": "turn.completed"}, None),
            ({"type": "turn.failed", "error": {"message": "connection lost"}}, "connection lost"),
            (None, notice["message"]),
        ):
            with self.subTest(ending=ending):
                events = [notice] + ([ending] if ending else [])
                stream = "\n".join(f"print({json.dumps(json.dumps(event))}, flush=True)" for event in events)
                self.fake("codex", stream)
                entry = {"id": "q", "prompt": "q", "expected": "none"}
                result = routing.run_one("codex", entry, self.workspace, None, timeout=10)
                self.assertEqual((result["opened"], result["error"]), ([], expected_error))

    def test_a_session_that_ends_without_a_skill_chose_none(self):
        self.fake("claude", 'import json\nprint(json.dumps({"type": "result", "is_error": False}))\n')
        entry = {"id": "q", "prompt": "q", "expected": "none"}
        result = routing.run_one("claude", entry, self.workspace, None, timeout=30)
        self.assertEqual((result["opened"], result["error"]), ([], None))
        self.assertEqual(routing.result_label(result, SUITE), "none")

    def test_a_client_startup_failure_is_an_error_even_without_json_events(self):
        for client in ("codex", "claude"):
            with self.subTest(client=client):
                self.fake(
                    client,
                    '''
                    import sys
                    print("Error: Failed to synchronize managed preferences", file=sys.stderr)
                    sys.exit(1)
                    ''',
                )
                entry = {"id": "q", "prompt": "q", "expected": "none"}
                result = routing.run_one(client, entry, self.workspace, None, timeout=10)
                self.assertEqual(result["opened"], [])
                self.assertIn("exited with status 1", result["error"] or "")
                self.assertIn("Failed to synchronize managed preferences", result["error"] or "")
                self.assertIsNone(routing.result_label(result, SUITE))

    def test_a_nonzero_exit_without_stderr_is_an_error(self):
        self.fake("codex", "import sys\nsys.exit(2)\n")
        entry = {"id": "q", "prompt": "q", "expected": "none"}
        result = routing.run_one("codex", entry, self.workspace, None, timeout=10)
        self.assertEqual(result["error"], "client exited with status 2")

    def test_large_stderr_does_not_block_the_client(self):
        self.fake(
            "codex",
            '''
            import sys
            print("x" * 200000, file=sys.stderr)
            print("Error: startup failed", file=sys.stderr)
            sys.exit(1)
            ''',
        )
        entry = {"id": "q", "prompt": "q", "expected": "none"}
        result = routing.run_one("codex", entry, self.workspace, None, timeout=10)
        self.assertIn("Error: startup failed", result["error"] or "")
        self.assertLess(result["seconds"], 5)

    def test_stderr_on_a_successful_session_does_not_make_it_an_error(self):
        self.fake(
            "codex",
            '''
            import json, sys
            print("warning: optional integration unavailable", file=sys.stderr)
            print(json.dumps({"type": "turn.completed"}))
            ''',
        )
        entry = {"id": "q", "prompt": "q", "expected": "none"}
        result = routing.run_one("codex", entry, self.workspace, None, timeout=10)
        self.assertEqual((result["opened"], result["error"]), ([], None))


if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__]))
    sys.exit(0 if result.wasSuccessful() else 1)
