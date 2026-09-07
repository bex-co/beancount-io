# w2 · m25 — `bea` distribution: PyPI, Homebrew tap, update notice, `bea upgrade`

**Worker:** worker2 **Goal:** a newcomer installs `bea` with one command on either channel (`brew install bex-co/tap/bea` or `uv tool install beancount-io`), learns about new releases without scripts ever being interrupted, and updates with `bea upgrade` **Status:** todo — sequenced after m24 (ships the `bea` name and defaults this milestone distributes)

## Tasks (in order)

| id   | title                                                                                  | est | depends_on |
| ---- | -------------------------------------------------------------------------------------- | --- | ---------- |
| t001 | Release workflow on `cli-v<version>` tags with PyPI trusted publishing                 | 1h  | —          |
| t002 | Homebrew formula renderer and tap publish step                                         | 1h  | t001       |
| t003 | Passive update notice and `bea --version` hint                                         | 45m | —          |
| t004 | `bea upgrade` dispatches to the owning package manager                                 | 45m | t003       |
| t005 | Install and update docs for both channels                                              | 30m | t002, t004 |
| t006 | Adoption surface — install channels discoverable and working as written                | 30m | t005       |
| t007 | Simplify                                                                               | 20m | t006       |
| t008 | Test coverage — notifier rules, channel detection, formula rendering, tag validation   | 45m | t006       |
| t009 | Closeout                                                                               | 15m | t008       |

## Definition of done

Pushing a `cli-vX.Y.Z` tag whose version matches `cli/pyproject.toml` runs `make check-all`, builds the sdist and wheel with a hashed `requirements.lock` inside the sdist, publishes to PyPI through trusted publishing, creates a GitHub Release, renders `Formula/bea.rb`, and pushes it to `bex-co/homebrew-tap` (skipping cleanly when the deploy-key secret is absent). On clean machines, `brew install bex-co/tap/bea` and `uv tool install beancount-io` both end with a working `bea --version`. The update notice appears only in a terminal, never under `--json`, `--no-input`, `CI`, or `BEA_NO_UPDATE_NOTIFIER=1`, at most once a day, and is silent on any failure. `bea upgrade` runs the owning package manager's upgrade command, `--check` only reports, and the CLI never rewrites its own installed files. `cli/README.md` install and update sections run as written.

## Source + Goal linkage

- **Source:** TPM discussion 2026-09-06 (question: can `bea` install through Homebrew and update like the sibling bex CLI; answer: yes, with PyPI as the single release source and a thin uv-based tap formula, plus bex's notifier-and-upgrade rules rather than silent auto-update), building on `cli/docs/PRFAQ.md` FAQ 6 (keep Python, uv-managed environments, no frozen interpreter so users' importers and plugins keep working) and FAQ 13 (upgrade behavior that understands installation channels).
- **Goal linkage:** **A3 — Community & distribution:** presence on PyPI and Homebrew is where developers look first; install counts become a measurable adoption signal. **A2 — Frictionless onboarding:** one install command per ecosystem, and an update path that does not require remembering how the tool was installed.
- **Expected outcome:** `brew install bex-co/tap/bea` or `uv tool install beancount-io` is the first line of every quickstart, README, and skill that shells out to the CLI; users on old versions learn about releases without any CI job ever being interrupted.
- **Why now:** m24 finalizes the name and defaults; publishing before it would burn the first release on the old name. The release pipeline must exist before the PRFAQ's later increments (REST transport, imports) can reach users at all. Adoption surface included: ships two new user-facing install channels.
