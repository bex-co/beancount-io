# Agent Skills

Agent Skills let you extend the `bea ask` command with custom instructions and domain knowledge. Skills are plain Markdown files, discovered locally when `bea ask` starts.

Discovery and use are separate steps. The system prompt receives only an index: each discovered skill's `name` and `description`. The model decides whether a skill fits the question and then loads that skill's body on demand through the `get_skill_body` tool. A discovered skill is available to the model, but the model is not obliged to apply it.

`bea ask` itself needs the optional `[ask]` extra (`uv tool install 'beancount-io[ask]'`) and hosted credentials (`bea cloud login` or `BEA_TOKEN`). Discovery does not: the inspection in [Check discovery without a model call](#check-discovery-without-a-model-call) runs locally with a base install.

## Skill locations

Skills are discovered from two directories, in priority order:

| Location | Scope |
|---|---|
| `./.agents/skills/` | Project-level: relative to the directory you run `bea ask` from, not the ledger's directory |
| `<config>/skills/` | User-level: `<config>` is `$BEA_CONFIG_DIR`, else `$XDG_CONFIG_HOME/bea`, else `~/.config/bea` |

Every immediate subdirectory that contains a `SKILL.md` with a `name` and `description` is discovered. The subdirectory's own name does not matter to discovery, so renaming `test-skill` to `test-skill.bak` does **not** disable it. When the same skill `name` exists in both places, the project-level version wins. Malformed files are skipped silently.

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
The AI will follow these instructions during the ask session.
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

## Check discovery without a model call

This is the deterministic test: it lists exactly what `bea ask` would index, with no API call and no model involved. Run it from the directory you run `bea ask` from. Use the interpreter of the environment that holds `bea`; for a `uv tool` install it is `$(uv tool dir)/beancount-io/bin/python`, and from a CLI checkout `uv run python` works too.

```bash
python -c "
from cli.ask.skills import load_skills
for s in load_skills():
    print(f'{s.name}\t{s.path}')
"
```

**1. Create a fixture skill**

```bash
mkdir -p .agents/skills/test-skill
cat > .agents/skills/test-skill/SKILL.md << 'EOF'
---
name: test-skill
description: Test skill to verify skill discovery.
---

When the user asks any question, begin the answer with the phrase "SKILL LOADED".
EOF
```

Run the inspection: `test-skill` is listed with its path.

**2. Disable it by moving it out of the scanned directory**

```bash
mkdir -p ../disabled-skills
mv .agents/skills/test-skill ../disabled-skills/
```

Run the inspection again: `test-skill` is gone. Renaming it inside `.agents/skills/` would leave it discovered.

**3. Restore it**

```bash
mv ../disabled-skills/test-skill .agents/skills/
```

The inspection lists it again. Remove the fixture when you are done. Repeat the same steps under `<config>/skills/` to check a user-level skill, and give both copies the same `name` to see the project-level copy win.

## Observe a skill in use (optional, calls the model)

With the `[ask]` extra and a login, you can watch the model apply a discovered skill:

```bash
bea ask "what accounts do I have?" --print
```

Whether the answer begins with the fixture's phrase depends on the model choosing to load and follow that skill. A matching answer shows the skill was used. A missing phrase does **not** show that discovery failed: use the local inspection above for that.
