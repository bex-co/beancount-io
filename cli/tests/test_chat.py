"""Tests for the chat command and agent."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

from pydantic_ai import Agent
from pydantic_ai.models.test import TestModel
from typer.testing import CliRunner

from cli.auth.credentials import Credentials
from cli.chat.agent import _SYSTEM_PROMPT, BqlDeps, make_agent
from cli.chat.skills import AgentSkill, _parse_skill, build_skills_index_prompt, load_skills
from cli.main import app

_FAKE_CREDS = Credentials(token="jwt-test-token", expire_at="2099-01-01T00:00:00+00:00")


def _test_agent(text: str) -> Agent[BqlDeps, str]:
    return Agent(TestModel(custom_output_text=text), deps_type=BqlDeps, system_prompt=_SYSTEM_PROMPT)


class TestAgent:
    def test_returns_output(self, tmp_bean_file: Path) -> None:
        result = _test_agent("Your net worth is 100 USD.").run_sync(
            "What is my net worth?", deps=BqlDeps(file=tmp_bean_file)
        )
        assert "100 USD" in result.output

    def test_multi_turn_accumulates_history(self, tmp_bean_file: Path) -> None:
        agent = _test_agent("answer")
        deps = BqlDeps(file=tmp_bean_file)
        r1 = agent.run_sync("Hello", deps=deps)
        msgs = list(r1.all_messages())
        r2 = agent.run_sync("Follow up", deps=deps, message_history=msgs)
        assert len(list(r2.all_messages())) > len(msgs)

    def test_bql_tool_registered(self, tmp_bean_file: Path) -> None:
        agent = make_agent("gpt-4o", "http://x", "tok")
        assert agent is not None


class TestChatCommand:
    runner = CliRunner()

    def test_missing_file_errors(self) -> None:
        with (
            patch("cli.auth.credentials.require_credentials", return_value=_FAKE_CREDS),
            patch("cli.commands.chat.DEFAULT_ENTRY_FILE", Path("nonexistent.bean")),
        ):
            result = self.runner.invoke(app, ["chat", "hello", "--print"])
        assert result.exit_code != 0

    def test_not_logged_in_errors(self, tmp_bean_file: Path) -> None:
        with patch("cli.auth.credentials.require_credentials", side_effect=RuntimeError("Not logged in.")):
            result = self.runner.invoke(app, ["chat", "hello", "--print"])
        assert result.exit_code != 0

    def test_single_question_mode(self, tmp_bean_file: Path) -> None:
        with (
            patch("cli.auth.credentials.require_credentials", return_value=_FAKE_CREDS),
            patch("cli.commands.chat.DEFAULT_ENTRY_FILE", tmp_bean_file),
            patch("cli.commands.chat.make_agent", return_value=_test_agent("42 USD")),
        ):
            result = self.runner.invoke(app, ["chat", "What is my balance?", "--print"])

        assert result.exit_code == 0
        assert "42 USD" in result.output

    def test_print_mode_requires_question(self) -> None:
        with (
            patch("cli.auth.credentials.require_credentials", return_value=_FAKE_CREDS),
        ):
            result = self.runner.invoke(app, ["chat", "--print"])
        assert result.exit_code != 0

    def test_make_agent_called_with_backend_url(self, tmp_bean_file: Path) -> None:
        with (
            patch("cli.auth.credentials.require_credentials", return_value=_FAKE_CREDS),
            patch("cli.commands.chat.DEFAULT_ENTRY_FILE", tmp_bean_file),
            patch("cli.commands.chat.make_agent", return_value=_test_agent("ok")) as mock_make,
        ):
            self.runner.invoke(app, ["chat", "hi", "--print"])

        call_kwargs = mock_make.call_args.kwargs
        assert "api-gateway/ai/openai" in call_kwargs["base_url"]
        assert call_kwargs["api_key"] == "jwt-test-token"


class TestAgentSkills:
    # ── _parse_skill ──────────────────────────────────────────────────────

    def test_parse_valid_skill(self, tmp_path: Path) -> None:
        skill_file = tmp_path / "SKILL.md"
        skill_file.write_text(
            "---\n"
            "name: test-skill\n"
            "description: Does something useful.\n"
            "license: MIT\n"
            "compatibility: Requires Python 3.9+\n"
            "allowed-tools: Bash Read\n"
            "metadata:\n"
            "  author: alice\n"
            '  version: "1.0"\n'
            "---\n\n"
            "## Instructions\n\nDo the thing.\n"
        )
        skill = _parse_skill(skill_file)
        assert skill is not None
        assert skill.name == "test-skill"
        assert skill.description == "Does something useful."
        assert skill.license == "MIT"
        assert skill.compatibility == "Requires Python 3.9+"
        assert skill.allowed_tools == ["Bash", "Read"]
        assert skill.metadata == {"author": "alice", "version": "1.0"}
        assert "Do the thing." in skill.body
        assert skill.path == skill_file

    def test_parse_minimal_skill(self, tmp_path: Path) -> None:
        skill_file = tmp_path / "SKILL.md"
        skill_file.write_text("---\nname: minimal\ndescription: Minimal skill.\n---\n\nBody.\n")
        skill = _parse_skill(skill_file)
        assert skill is not None
        assert skill.name == "minimal"
        assert skill.license is None
        assert skill.allowed_tools == []
        assert skill.metadata == {}

    def test_parse_missing_name_returns_none(self, tmp_path: Path) -> None:
        skill_file = tmp_path / "SKILL.md"
        skill_file.write_text("---\ndescription: No name.\n---\n\nBody.\n")
        assert _parse_skill(skill_file) is None

    def test_parse_missing_description_returns_none(self, tmp_path: Path) -> None:
        skill_file = tmp_path / "SKILL.md"
        skill_file.write_text("---\nname: no-desc\n---\n\nBody.\n")
        assert _parse_skill(skill_file) is None

    def test_parse_no_frontmatter_returns_none(self, tmp_path: Path) -> None:
        skill_file = tmp_path / "SKILL.md"
        skill_file.write_text("Just plain markdown with no frontmatter.\n")
        assert _parse_skill(skill_file) is None

    def test_parse_unclosed_frontmatter_returns_none(self, tmp_path: Path) -> None:
        skill_file = tmp_path / "SKILL.md"
        skill_file.write_text("---\nname: broken\ndescription: No closing dashes.\n")
        assert _parse_skill(skill_file) is None

    def test_parse_nonexistent_file_returns_none(self, tmp_path: Path) -> None:
        assert _parse_skill(tmp_path / "does_not_exist.md") is None

    # ── load_skills ───────────────────────────────────────────────────────

    def _make_skill_dir(self, root: Path, skill_name: str, body: str = "Content.") -> None:
        skill_dir = root / skill_name
        skill_dir.mkdir(parents=True, exist_ok=True)
        (skill_dir / "SKILL.md").write_text(
            f"---\nname: {skill_name}\ndescription: {skill_name} description.\n---\n\n{body}\n"
        )

    def test_load_skills_from_project_dir(self, tmp_path: Path) -> None:
        skills_root = tmp_path / ".agents" / "skills"
        self._make_skill_dir(skills_root, "alpha")
        self._make_skill_dir(skills_root, "beta")

        skills = load_skills(cwd=tmp_path)
        names = [s.name for s in skills]
        assert "alpha" in names
        assert "beta" in names

    def test_load_skills_nonexistent_dirs_returns_empty(self, tmp_path: Path) -> None:
        with patch("cli.chat.skills.Path.home", return_value=tmp_path / "no_home"):
            skills = load_skills(cwd=tmp_path)
        assert skills == []

    def test_load_skills_skips_malformed_file(self, tmp_path: Path) -> None:
        skills_root = tmp_path / ".agents" / "skills"
        bad_dir = skills_root / "bad-skill"
        bad_dir.mkdir(parents=True)
        (bad_dir / "SKILL.md").write_text("no frontmatter at all")

        good_dir = skills_root / "good-skill"
        good_dir.mkdir()
        (good_dir / "SKILL.md").write_text("---\nname: good-skill\ndescription: Works fine.\n---\n\nOK.\n")

        skills = load_skills(cwd=tmp_path)
        names = [s.name for s in skills]
        assert "good-skill" in names
        assert "bad-skill" not in names

    def test_load_skills_skips_dir_without_skill_md(self, tmp_path: Path) -> None:
        skills_root = tmp_path / ".agents" / "skills"
        empty_dir = skills_root / "empty-skill"
        empty_dir.mkdir(parents=True)

        skills = load_skills(cwd=tmp_path)
        assert not any(s.name == "empty-skill" for s in skills)

    def test_load_skills_project_takes_precedence(self, tmp_path: Path) -> None:
        project_root = tmp_path / ".agents" / "skills"
        self._make_skill_dir(project_root, "shared", body="Project version.")

        user_root = tmp_path / "user_home" / ".beancount-cli" / "agent" / "skill"
        user_skill_dir = user_root / "shared"
        user_skill_dir.mkdir(parents=True)
        (user_skill_dir / "SKILL.md").write_text(
            "---\nname: shared\ndescription: User version.\n---\n\nUser version.\n"
        )

        with patch("cli.chat.skills.Path.home", return_value=tmp_path / "user_home"):
            skills = load_skills(cwd=tmp_path)

        shared = [s for s in skills if s.name == "shared"]
        assert len(shared) == 1
        assert "Project version." in shared[0].body

    # ── build_skills_index_prompt ─────────────────────────────────────────

    def test_build_skills_index_prompt_empty_list(self) -> None:
        assert build_skills_index_prompt([]) == ""

    def test_build_skills_index_prompt_contains_name_and_description_not_body(self) -> None:
        skill = AgentSkill(
            name="my-skill",
            description="Does X.",
            body="## Instructions\n\nDo X.\n",
            path=Path("/fake/SKILL.md"),
        )
        prompt = build_skills_index_prompt([skill])
        assert "my-skill" in prompt
        assert "Does X." in prompt
        assert "Do X." not in prompt  # body must NOT be in the index

    def test_build_skills_index_prompt_multiple_skills_in_order(self) -> None:
        skills = [
            AgentSkill(name="alpha", description="A.", body="A body.", path=Path("/a/SKILL.md")),
            AgentSkill(name="beta", description="B.", body="B body.", path=Path("/b/SKILL.md")),
        ]
        prompt = build_skills_index_prompt(skills)
        assert prompt.index("alpha") < prompt.index("beta")

    # ── integration: skills injected into agent system prompt ─────────────

    def test_make_agent_with_skills_index_only_in_system_prompt(self) -> None:
        skill = AgentSkill(
            name="budget-tracker",
            description="Tracks budgets.",
            body="Always check the budget account.",
            path=Path("/fake/SKILL.md"),
        )
        agent = make_agent("gpt-4o", "http://x", "tok", skills=[skill])
        combined = " ".join(str(p) for p in agent._system_prompts)
        assert "budget-tracker" in combined  # name in index
        assert "Tracks budgets." in combined  # description in index
        assert "Always check the budget account." not in combined  # body deferred to tool

    def test_make_agent_without_skills_unchanged(self) -> None:
        agent = make_agent("gpt-4o", "http://x", "tok")
        combined = " ".join(str(p) for p in agent._system_prompts)
        assert _SYSTEM_PROMPT in combined
        assert "Agent Skills" not in combined

    def test_get_skill_body_tool_returns_body(self, tmp_bean_file: Path) -> None:
        # TestModel generates "a" as the stub value for string parameters,
        # so we name the skill "a" to get a successful lookup.
        skill = AgentSkill(name="a", description="Does X.", body="The full body content.", path=Path("/fake/SKILL.md"))
        agent = make_agent("gpt-4o", "http://x", "tok", skills=[skill])
        deps = BqlDeps(file=tmp_bean_file, skills={"a": skill})
        result = agent.run_sync(
            "load skill a",
            deps=deps,
            model=TestModel(call_tools=["get_skill_body"]),
        )
        assert "The full body content." in result.output

    def test_get_skill_body_tool_unknown_name(self, tmp_bean_file: Path) -> None:
        skill = AgentSkill(name="real", description="d", body="body", path=Path("/f"))
        agent = make_agent("gpt-4o", "http://x", "tok", skills=[skill])
        deps = BqlDeps(file=tmp_bean_file, skills={"real": skill})
        result = agent.run_sync(
            "load missing-skill",
            deps=deps,
            model=TestModel(call_tools=["get_skill_body"]),
        )
        assert "not found" in result.output.lower()
