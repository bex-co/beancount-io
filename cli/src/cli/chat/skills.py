from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import frontmatter as _fm


@dataclass
class AgentSkill:
    name: str
    description: str
    body: str
    path: Path
    license: str | None = None
    compatibility: str | None = None
    allowed_tools: list[str] = field(default_factory=list)
    metadata: dict[str, str] = field(default_factory=dict)


def _parse_skill(path: Path) -> AgentSkill | None:
    """Parse a SKILL.md file. Returns None on any parse or validation failure."""
    try:
        post = _fm.load(str(path))
    except Exception:
        return None

    fm = post.metadata
    name = fm.get("name")
    description = fm.get("description")

    if not isinstance(name, str) or not name:
        return None
    if not isinstance(description, str) or not description:
        return None

    raw_tools = fm.get("allowed-tools", "")
    allowed_tools = raw_tools.split() if isinstance(raw_tools, str) else []

    raw_meta = fm.get("metadata", {})
    metadata = {str(k): str(v) for k, v in raw_meta.items()} if isinstance(raw_meta, dict) else {}

    _license = fm.get("license")
    _compat = fm.get("compatibility")
    return AgentSkill(
        name=name,
        description=description,
        body=post.content,
        path=path,
        license=_license if isinstance(_license, str) else None,
        compatibility=_compat if isinstance(_compat, str) else None,
        allowed_tools=allowed_tools,
        metadata=metadata,
    )


def _load_skills_from_dir(skills_root: Path) -> list[AgentSkill]:
    if not skills_root.is_dir():
        return []
    results: list[AgentSkill] = []
    for skill_dir in sorted(skills_root.iterdir()):
        if not skill_dir.is_dir():
            continue
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.is_file():
            continue
        skill = _parse_skill(skill_file)
        if skill is not None:
            results.append(skill)
    return results


def load_skills(cwd: Path | None = None) -> list[AgentSkill]:
    """Discover and load skills from project-level and user-level directories.

    Project-level:  <cwd>/.agents/skills/
    User-level:     ~/.beancount-cli/agent/skill/

    Project-level skills take precedence when names collide.
    Missing dirs and malformed files are silently skipped.
    """
    base = cwd if cwd is not None else Path.cwd()
    project_skills_dir = base / ".agents" / "skills"
    from cli.config import DATA_DIR

    user_skills_dir = DATA_DIR / "agent" / "skill"

    seen: set[str] = set()
    skills: list[AgentSkill] = []

    for skill in _load_skills_from_dir(project_skills_dir) + _load_skills_from_dir(user_skills_dir):
        if skill.name not in seen:
            seen.add(skill.name)
            skills.append(skill)

    return skills


def build_skills_index_prompt(skills: list[AgentSkill]) -> str:
    """Return a lightweight skill index for the system prompt (name + description only).

    Full skill bodies are intentionally omitted here — the agent fetches them on demand
    via the get_skill_body tool, keeping startup token cost near zero.
    """
    if not skills:
        return ""

    lines: list[str] = [
        "",
        "---",
        "",
        "## Available Agent Skills",
        "",
        "The following skills are available. Call `get_skill_body` with a skill name to load its",
        "full instructions before applying it.",
        "",
    ]
    for skill in skills:
        lines.append(f"- **{skill.name}**: {skill.description}")

    return "\n".join(lines)
