# Agent Skills

Agent Skills let you extend the `chat` command with custom instructions and domain knowledge. Skills are plain Markdown files that are loaded at runtime and injected into the AI agent's system prompt.

## Skill locations

Skills are discovered from two directories, in priority order:

| Location | Scope |
|---|---|
| `<ledger-dir>/.agents/skills/` | Project-level — applies to one ledger |
| `~/.beancount-cli/agent/skill/` | User-level — applies to all ledgers |

When the same skill `name` exists in both places, the project-level version wins.

## Creating a skill

Each skill is a directory containing a `SKILL.md` file:

```
.agents/skills/
└── my-skill/
    └── SKILL.md
```

### SKILL.md format

```markdown
---
name: my-skill
description: One-line summary of what this skill does and when to use it.
---

Your instructions here. Write in plain Markdown.
The AI will follow these instructions during the chat session.
```

**Required frontmatter fields:**

| Field | Description |
|---|---|
| `name` | Lowercase, hyphens only, must match the parent directory name |
| `description` | Tells the agent when to apply this skill |

**Optional fields:** `license`, `compatibility`, `metadata` (key-value map), `allowed-tools`.

### Example

```markdown
---
name: monthly-report
description: Generates monthly expense summaries grouped by category.
---

When the user asks for a spending summary or monthly report:
1. Group all expenses by the top-level account category (e.g. Expenses:Food, Expenses:Transport).
2. Show totals for each category, sorted highest to lowest.
3. Include a grand total at the end.
4. Always specify the currency next to each amount.
```

## Testing that a skill is loaded

The quickest way is to create a skill with a distinctive instruction and verify the agent follows it in `--print` mode.

**1. Create a test skill**

```bash
mkdir -p .agents/skills/test-skill
cat > .agents/skills/test-skill/SKILL.md << 'EOF'
---
name: test-skill
description: Test skill to verify skill loading works.
---

IMPORTANT: Whenever the user asks any question, start your response with the exact phrase "SKILL LOADED".
EOF
```

**2. Run a quick query**

```bash
uv run beancount-cli chat "what accounts do I have?" --print
```

If the response starts with `SKILL LOADED`, the skill was picked up and injected into the system prompt correctly.

**3. Confirm it's absent without the skill**

```bash
mv .agents/skills/test-skill .agents/skills/test-skill.bak
uv run beancount-cli chat "what accounts do I have?" --print
mv .agents/skills/test-skill.bak .agents/skills/test-skill
```

The phrase should not appear this time.

For user-level skills, use the same approach but place the skill under `~/.beancount-cli/agent/skill/test-skill/SKILL.md` and verify project-level overrides it if both have the same `name`.

**Debug loading without hitting the API**

```bash
uv run python -c "
from cli.chat.skills import load_skills
for s in load_skills():
    print(f'Loaded: {s.name} — {s.description}')
    print(f'Body preview: {s.body[:80]!r}')
"
```

This bypasses the LLM entirely and shows exactly which skills were found and parsed.
