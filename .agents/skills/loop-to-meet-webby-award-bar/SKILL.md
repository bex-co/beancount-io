---
name: loop-to-meet-webby-award-bar
description: >-
  Loop one or more dashboard or website pages toward a Webby-Awards-level bar:
  review each page at several viewport sizes for user experience and the six
  Webby judging criteria, redesign or polish what falls short, and review again
  until every page passes or the round limit is reached. Changes stay in the
  working tree. Use only when the user explicitly invokes
  $loop-to-meet-webby-award-bar or asks to bring named pages up to Webby
  quality. Skip bug hunts (qa-find-bugs-dashboard), native mobile screens, and
  ordinary feature work.
metadata: {"internal": true}
---

# Loop pages to the Webby bar

Usage: `/loop-to-meet-webby-award-bar <page or pages> [MAX_ROUNDS=8] [BAR=8]`

A page is a dashboard route or URL (`/login`, `/ledger/<owner>/<ledger>/journal`)
or a website path or URL (`/`, `/pricing`, `/docs/...`). With no page, ask which
pages; do not pick the whole product.

One round is **review → improve → verify**. Repeat rounds until every page
meets the bar or a stop condition applies. The bar is an internal quality gate
modelled on the Webby judging criteria. Passing it is not a prediction of an
award; never report it as one.

## Ground rules

- **Nothing is committed.** Leave every change in the working tree of the
  repository that owns it. Do not commit, push, run `/land`, or write `.pm/`.
- Change only presentation and experience: layout, hierarchy, typography,
  spacing, color, motion, copy clarity, states, accessibility. Product
  behavior, APIs, data, and permissions stay as they are. A needed behavior
  change is a decision for the user: note it and move on.
- Reuse the package's existing design tokens and shared responsive and
  accessibility primitives. Ask before adding a dependency. Never hand-edit a
  lockfile or import across packages.
- Record each repository's dirty files before the first edit. Touch only files
  this run changes. If a file you need already holds someone else's edits,
  stop and ask.
- Keep the user's windows undisturbed: headless browser with an isolated
  profile, as in [the dashboard QA skill](../qa-find-bugs-dashboard/SKILL.md)
  ("Run in the background").

## 1. Preflight

Resolve each page to the surface that owns it and read that surface's guidance
before touching it.

| Surface | Source | Guidance | Local server |
| ------- | ------ | -------- | ------------ |
| dashboard | thin routes in `dashboard/src/routes/`, implementation in `dashboard/src/features/<feature>/`, shared pieces in `dashboard/src/common/` | `dashboard/AGENTS.md` and any nested feature guide | `yarn install --immutable`, then `yarn dev`, inside `dashboard/` |
| website | the website repository's checkout under the repo-root `.internal/` | that checkout's own `AGENTS.md` | the commands its guidance names, run inside the checkout |

The website is a separate repository (root `AGENTS.md`, "The public website
lives in a separate repository"). Its checkout is a clone with its own git
history: edits there are edits to that repository, left uncommitted like the
rest. If no checkout exists, ask the user for the clone URL and clone it under
`.internal/`; do not write the repository's name or URL into tracked files.

Review the **local build**, because unpublished changes exist nowhere else.
Production is only the round-0 comparison. State which backend the local
client talks to.

For a signed-in page, follow [the QA contract](../qa-shared/contract.md)
("Credentials and real data") and its login helper. This skill is read-only
against every backend: no ledger writes, even where QA runs may write.

Keep screenshots, measurements, and review records in
`.internal/webby-<yyyymmdd>/`, one folder per round.

## 2. Review

Capture every page at each viewport, light and dark where the page supports
both:

| Viewport | Size |
| -------- | ---- |
| small phone | 360×740 |
| phone | 390×844 |
| tablet portrait | 768×1024 |
| tablet landscape | 1024×768 |
| laptop | 1440×900 |
| large desktop | 1920×1080 |

Also read the package's real breakpoints and capture one width just below and
one just above each. Layouts break at the seams, not at the round numbers.

At each viewport take a full-page screenshot and one of the first screen, then
run the measured checks in [the rubric](references/rubric.md). Confirm the
full-page image really is the whole page: an app shell that scrolls inside a
container (the dashboard's ledger layout does) yields a "full page" identical
to the first screen. Scroll that container and capture each screenful instead.
A check that was not run is recorded as not assessed, never as passed. Exercise the
page as well as looking at it: open its menus and dialogs, tab through it,
trigger its loading, empty, and error states where that needs no write.

Scoring belongs to a **reviewer with a fresh context**, not to the session that
made the changes. In Claude Code, launch a subagent; in Codex, use its subagent
equivalent. Where neither exists, score in a separate pass that reads only the
inputs below. Give the reviewer the screenshots, the measured-check results,
the page's purpose and audience in one sentence, and the rubric. Do not give it
the diff, your reasons, or earlier scores. It returns the rubric's record:
six scores per page per viewport, and every deduction tied to a visible issue.

## 3. The bar

A page passes when, at every viewport:

- each of the six criteria scores at least `BAR` (default 8),
- every measured check was run and passes, on screenshots that cover the
  whole page, and
- no `blocker` or `major` issue is open.

All named pages must pass in the same round. A page that passed earlier is
reviewed again whenever shared code it uses changed.

## 4. Improve

Work the reviewer's issues from the most severe and most widely shared down.
A fix in a shared component beats the same fix repeated per page.

- **Redesign** a page's layout when Visual Design or Structure and Navigation
  scores 5 or lower: polish cannot rescue a wrong hierarchy. State the new
  structure in two or three sentences before building it.
- **Polish** otherwise: spacing, alignment, type scale, contrast, states,
  motion, copy.
- Design for the smallest viewport first, then confirm each larger one.
- Dashboard copy changes follow `dashboard/AGENTS.md`: every locale is
  translated, never left in English.

## 5. Verify

Run the owning package's checks from inside the package after each round:

- dashboard: `yarn format:check`, `yarn lint`, `yarn test`; add `yarn build`
  before the final report.
- website: the checks its own guidance names.

A check your change turned red is yours: fix it before the next review. A
check that was already red is not; note it in the report and carry on (root
`AGENTS.md`, "Failing checks").

## 6. Loop and stop

After verifying, start the next round with a new reviewer. Stop when:

- **Passed:** every page meets the bar.
- **Round limit:** `MAX_ROUNDS` rounds are done (default 8).
- **Stalled:** the lowest score has not risen for two rounds in a row.

On the last two, report the remaining gaps as they are. Do not lower the bar,
drop a viewport, or re-run the reviewer until it agrees.

Questions only the user can answer (a new dependency, brand or copy
direction, a behavior change) do not pause the loop. Collect them, keep going
on everything that does not depend on them, and raise them in the report.

## 7. Report

- Outcome: passed, round limit, or stalled, and after how many rounds.
- Scores per page and viewport, round 0 against the final round.
- What changed and why, in terms of what a visitor now sees.
- Changed files per repository, and the plain statement that nothing was
  committed or pushed.
- Open issues, decisions waiting on the user, and anything not covered
  (themes, locales, signed-in states, real screen readers).
- How to view the result locally, and where the evidence is.

Stop the servers and browsers this run started, and leave the others alone.
