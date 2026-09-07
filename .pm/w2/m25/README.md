# w2 · m25 — `bea` distribution: PyPI, Homebrew tap, update notice, `bea upgrade`

**Worker:** worker2 **Goal:** a newcomer installs `bea` with one command on either channel (`brew install bex-co/tap/bea` or `uv tool install beancount-io`), learns about new releases without scripts ever being interrupted, and updates with `bea upgrade` **Status:** in progress — every repo-side task is done (t001–t005, t007, t008); t006 and t009 wait on the first real release

## Tasks (in order)

| id   | title                                                                                  | est | depends_on |
| ---- | -------------------------------------------------------------------------------------- | --- | ---------- |
| t001 | Release workflow on `cli-v<version>` tags with PyPI trusted publishing — **DONE** | 1h  | —          |
| t002 | Homebrew formula renderer and tap publish step — **DONE** | 1h  | t001       |
| t003 | Passive update notice and `bea --version` hint — **DONE** | 45m | —          |
| t004 | `bea upgrade` dispatches to the owning package manager — **DONE** | 45m | t003       |
| t005 | Install and update docs for both channels — **DONE** | 30m | t002, t004 |
| t006 | Adoption surface — install channels discoverable and working as written                | 30m | t005       |
| t007 | Simplify — **DONE** | 20m | t006       |
| t008 | Test coverage — notifier rules, channel detection, formula rendering, tag validation — **DONE** | 45m | t006       |
| t009 | Closeout                                                                               | 15m | t008       |

## Definition of done

Pushing a `cli-vX.Y.Z` tag whose version matches `cli/pyproject.toml` runs `make check-all`, builds the sdist and wheel with a hashed `requirements.lock` inside the sdist, publishes to PyPI through trusted publishing, creates a GitHub Release, renders `Formula/bea.rb`, and pushes it to `bex-co/homebrew-tap` (skipping cleanly when the deploy-key secret is absent). On clean machines, `brew install bex-co/tap/bea` and `uv tool install beancount-io` both end with a working `bea --version`. The update notice appears only in a terminal, never under `--json`, `--no-input`, `CI`, or `BEA_NO_UPDATE_NOTIFIER=1`, at most once a day, and is silent on any failure. `bea upgrade` runs the owning package manager's upgrade command, `--check` only reports, and the CLI never rewrites its own installed files. `cli/README.md` install and update sections run as written.

## Remaining before closeout

The code, workflow, formula renderer, docs and tests are all written and green.
What is left is not code — it is three actions that only a maintainer with the accounts
can take, and the verification they unlock:

1. Register the PyPI trusted publisher (and the TestPyPI one, for the rehearsal
   run) for project `beancount-io`, owner `bex-co`, repository `beancount-io`,
   workflow `release-cli.yml`, environment `production`. See
   `cli/README.md` → *Releasing (maintainers)*.
2. Add the `BEA_TAP_PUSH_KEY` repository secret — a write deploy key for
   `bex-co/homebrew-tap`. Until it exists the formula step skips cleanly and the
   PyPI channel ships on its own.
3. Rehearse with `workflow_dispatch` (`test`), then push `cli-v0.1.0`.

Then t006 (clean-machine `brew install bex-co/tap/bea` and
`uv tool install beancount-io`, PyPI page rendering) and t009 (closeout) can run.

Verified locally in the meantime, against the real built sdist: the staged
tarball installs exactly as the formula's `install` block does — `uv venv`, then
`uv pip install --require-hashes -r requirements.lock`, then
`uv pip install --no-deps .` — and the resulting `bea --version` and `bea check`
work. The notice and `bea upgrade` rules were exercised on a real pty.

## Source + Goal linkage

- **Source:** TPM discussion 2026-09-06 (question: can `bea` install through Homebrew and update like the sibling bex CLI; answer: yes, with PyPI as the single release source and a thin uv-based tap formula, plus bex's notifier-and-upgrade rules rather than silent auto-update), building on `cli/docs/PRFAQ.md` FAQ 6 (keep Python, uv-managed environments, no frozen interpreter so users' importers and plugins keep working) and FAQ 13 (upgrade behavior that understands installation channels).
- **Goal linkage:** **A3 — Community & distribution:** presence on PyPI and Homebrew is where developers look first; install counts become a measurable adoption signal. **A2 — Frictionless onboarding:** one install command per ecosystem, and an update path that does not require remembering how the tool was installed.
- **Expected outcome:** `brew install bex-co/tap/bea` or `uv tool install beancount-io` is the first line of every quickstart, README, and skill that shells out to the CLI; users on old versions learn about releases without any CI job ever being interrupted.
- **Why now:** m24 finalizes the name and defaults; publishing before it would burn the first release on the old name. The release pipeline must exist before the PRFAQ's later increments (REST transport, imports) can reach users at all. Adoption surface included: ships two new user-facing install channels.

## Implementation notes

- Version comparison is a local canonical-`X.Y.Z` parser rather than
  `packaging.version`: `packaging` is not a runtime dependency of
  `beancount-io`, and adding one to compare two version strings is not worth the
  weight in a default install the PRFAQ wants kept small. Anything that is not
  canonical semver — a `.dev` checkout, a pre-release, `0+unknown` — is never
  "newer", which is also how a development install ends up never checking.
- A failing package manager makes `bea upgrade` exit **1** (`validation`) with
  the manager's own exit code in the message, rather than passing that code
  through: m24's exit-code table is a contract, and a manager returning 2 would
  otherwise be read as a `bea` usage error.
- The Homebrew formula installs the base package only. `bea ask` still needs
  `uv tool install 'beancount-io[ask]'`, which keeps the tap thin and matches
  m24's decision to keep the AI stack out of the default install.
