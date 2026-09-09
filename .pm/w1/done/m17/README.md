# w1 · m17 — CLI docs from one source: landing README, generated reference, executable examples

**Worker:** worker1 **Goal:** the CLI is described once: a short README that is also the package landing page, a reference whose option tables are generated from the command tree and gated against drift, examples that CI runs, and a first-month tutorial that walks a newcomer from an empty directory to a month-end report **Status:** done

## Tasks (in order)

| id   | title                                                                                     | est | depends_on |
| ---- | ----------------------------------------------------------------------------------------- | --- | ---------- |
| t001 | Generate the command and option reference from the Typer app with a drift gate — **DONE** | 60m | —          |
| t002 | Slim `cli/README.md` to install, quick start, command map, and links; USAGE holds the contract — **DONE** | 60m | t001 |
| t003 | Executable examples: every documented `bea` invocation runs in CI with its expected outcome — **DONE** | 60m | t002 |
| t004 | First-month tutorial: init, accounts, import, reconcile, month report — **DONE**          | 60m | t003       |
| t005 | Adoption surface — **DONE**                                                               | 20m | t004       |
| t006 | Simplify — **DONE**                                                                       | 30m | t005       |
| t007 | Test coverage — **DONE**                                                                  | 30m | t005       |
| t008 | Closeout — **DONE**                                                                       | 15m | t007       |

## Definition of done

- `make docs` from `cli/` regenerates `cli/docs/REFERENCE.md` from the registered commands (usage line, options, defaults, help text for every leaf); `make check-all` fails when the file is stale, the same way `spec-check` fails on OpenAPI drift.
- `cli/README.md` is under 200 lines: install, a quick start that ends in a balance sheet, the command map, the exit-code table, and links to USAGE, IMPORTING, TUTORIAL, and REFERENCE with absolute URLs (it is the package landing page on the registry).
- `cli/docs/USAGE.md` is the only place contract prose lives (target resolution, JSON envelope, exit codes, prompts, environment variables, write safety); no paragraph appears in both README and USAGE.
- Every fenced `bash` example in README, USAGE, IMPORTING, and TUTORIAL is executed by a test with its documented result checked (exit code and, where the docs state one, output), or is explicitly marked as not runnable with a reason.
- `cli/docs/TUTORIAL.md` takes a reader from `bea init` through opening accounts, a CSV import, a balance assertion with `--pad-from`, and `bea report income-statement --time month`, and runs as written.
- Downstream documentation sites can consume `REFERENCE.md` and `TUTORIAL.md` verbatim; the repository does not maintain a second hand-written reference.

## Source + Goal linkage

- **Source:** CLI UX review 2026-09-08 — `cli/README.md` (989 lines) and `cli/docs/USAGE.md` (662 lines) cover the same ground in specification voice; after the quick start the README reads as a contract ("Read-only destinations fail with exit 3, even if directory permissions would allow replacement"); there is no narrative that covers a newcomer's first month; five top-level help summaries were found truncated because nothing checks help against docs.
- **Goal linkage:** **A3 — Community & distribution:** the README is the registry landing page and the first thing a GitHub visitor reads; a generated reference plus executable examples is what keeps a published CLI's docs true across releases. **A2 — Frictionless onboarding:** the tutorial is the missing "first month" path.
- **Expected outcome:** a visitor decides in one screen whether `bea` is for them and reaches a balance sheet in five minutes; maintainers change a flag once and CI tells them where the docs drifted; downstream sites embed the generated files instead of rewriting them.
- **Why now:** downstream documentation sites already keep their own hand-written copy of the reference; each further copy multiplies drift. Sequenced after m13, m15, and m16 so the generated reference and the tutorial describe the final flags. Adoption surface included: README, docs, and the registry page are the surface.
