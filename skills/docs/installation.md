# Install the Beancount skills

Install the eight `beancount-*` ledger skills for Claude Code, Codex, or both, from any directory. You keep one Git checkout of the skills and link it into each agent's skill directory. Updating the checkout updates every agent, and the helper script never touches skills it did not install.

Rehearsed on macOS with Claude Code and Codex (see [tested with](first-query.md#tested-with)). Linux uses the same commands but has not been rehearsed. Windows is not covered.

## Prerequisites

- Git and Python 3.
- [`bea`](../../cli/README.md) (`brew install bex-co/tap/bea` or `uv tool install beancount-io`). The skills use it for checks, queries, and ledger writes.
- [Claude Code](https://code.claude.com/docs/en/skills) and/or [Codex](https://developers.openai.com/codex/skills).

## 1. Get the skills

Fetch only the `skills/` directory of this repository into a stable location:

```sh
SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
git clone --depth 1 --filter=blob:none --sparse https://github.com/bex-co/beancount-io.git "$SKILLS_SRC"
git -C "$SKILLS_SRC" sparse-checkout set skills
```

The checkout contains the customer suite only. The repository's development skills live elsewhere and are not fetched.

## 2. Link them into your agents

Pick the skill directory for each agent you use:

| Agent | Every ledger on this machine | One ledger workspace |
| ----- | ---------------------------- | -------------------- |
| Claude Code | `~/.claude/skills` | `<workspace>/.claude/skills` |
| Codex | `~/.agents/skills` | `<workspace>/.agents/skills` |

Then link the suite into those directories (omit the one you don't use):

```sh
SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
python3 "$SKILLS_SRC/skills/scripts/beancount-skills.py" install ~/.claude/skills ~/.agents/skills
```

For each directory, `install` creates one link per skill (`beancount-ask -> $SKILLS_SRC/skills/.claude/skills/beancount-ask`, and so on), prints the source revision, and runs `verify`. It leaves every other entry in the directory alone. Both agents follow symlinked skill folders.

Links for a single workspace are absolute paths on your machine. Keep them out of a shared ledger repository, for example by adding `.claude/skills/beancount-*` and `.agents/skills/beancount-*` to its `.gitignore`.

## 3. Confirm the agents see them

Check the files first. `verify` only reads, and it exits nonzero with one line per missing skill, supporting reference, or sibling workflow:

```sh
python3 "$SKILLS_SRC/skills/scripts/beancount-skills.py" verify ~/.claude/skills ~/.agents/skills
```

Then ask each agent from your ledger directory. Both should name the same eight skills listed in the [skills catalog](../README.md).

```sh
claude -p "List the names of the skills available to you that start with beancount-, one per line, nothing else."
codex exec --skip-git-repo-check "List the names of the skills available to you that start with beancount-, one per line, nothing else."
```

In an interactive session, Claude Code lists skills with `/skills` and runs one with `/beancount-ask`. In Codex, mention a skill as `$beancount-ask`. Both agents also pick a skill on their own when your request matches its description.

Next: get a first answer from a sample ledger with the [first-query walkthrough](first-query.md).

### When a skill does not appear

1. Run `verify` and fix what its `FAIL` lines name. `install` repairs missing links. A skill whose directory is incomplete needs its checkout restored (`git -C "$SKILLS_SRC" restore skills`).
2. Start a new agent session. A running session may not pick up newly added skill directories.
3. Check that no setting hides the skill. For Claude Code, look for a `skillOverrides` entry set to `"off"`. For Codex, look for a `[[skills.config]]` entry with `enabled = false` in `~/.codex/config.toml`.
4. For a single-workspace install, launch the agent inside that workspace. Codex reads `.agents/skills` from the working directory up to the Git repository root.
5. If `install` reported a conflict, see [Existing copies and name conflicts](#existing-copies-and-name-conflicts).

## Update

```sh
SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
git -C "$SKILLS_SRC" status --short skills
git -C "$SKILLS_SRC" pull --ff-only
python3 "$SKILLS_SRC/skills/scripts/beancount-skills.py" install ~/.claude/skills ~/.agents/skills
```

The pull updates every linked agent at once. Running `install` again keeps existing links, links any skill added to the suite since your last install, and prints the revision you are now on (`source … at <commit> <date>`).

### Local edits

`status` shows any edits you made to the checkout, and `install` lists them too, because every linked agent uses them. `git pull --ff-only` keeps edits that the update does not touch. If the update changes a file you edited, Git stops with `Your local changes to the following files would be overwritten` and changes nothing. Then choose one:

```sh
git -C "$SKILLS_SRC" stash && git -C "$SKILLS_SRC" pull --ff-only && git -C "$SKILLS_SRC" stash pop   # keep your edits on top
git -C "$SKILLS_SRC" diff > ~/beancount-skills-edits.patch && git -C "$SKILLS_SRC" restore skills   # save them aside, take the update
```

### Existing copies and name conflicts

If a skill directory already holds a `beancount-*` entry that is not a link into this checkout, such as an earlier manual copy or a link to another checkout, `install` changes nothing in that directory. It prints a `CONFLICT` line for each entry, saying whether a copy is identical to the checkout or listing the files that differ. To keep an entry, move it out of the skill directory, then run `install` again. A renamed copy left inside the directory would still load as a second skill.

```sh
mkdir -p ~/beancount-skill-backups
mv ~/.claude/skills/beancount-ask ~/beancount-skill-backups/
```

## Remove

```sh
SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
python3 "$SKILLS_SRC/skills/scripts/beancount-skills.py" uninstall ~/.claude/skills ~/.agents/skills
git -C "$SKILLS_SRC" status --short skills
rm -rf "$SKILLS_SRC"
```

`uninstall` removes only the links that point into this checkout. It reports anything else with a suite skill's name as kept, and it never touches other skills, agent settings, or ledgers. Check the `status` output for edits you want to keep before deleting the checkout.
