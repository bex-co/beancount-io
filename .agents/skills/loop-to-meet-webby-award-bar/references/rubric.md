# Webby bar rubric

Used by `loop-to-meet-webby-award-bar`. The session running the loop collects
the measured checks; a reviewer with a fresh context gives the scores.

## Measured checks

Each is pass, fail, or not assessed per page and viewport. A failure is at
least a `major` issue and caps the criteria it affects at 7; the other
criteria are scored on their own evidence. A check that is not assessed
cannot count as a pass, so the page cannot meet the bar until it is run.

A primary action is the control that completes the page's main purpose
(submit, save, sign in, ask, the main call to action) or opens its
navigation.

| Check | Passes when |
| ----- | ----------- |
| Overflow | The document is no wider than the viewport, and nothing scrolls sideways except content meant to (a wide table or code block inside its own scroll container). |
| Text | No text is clipped, overlapped, or cut off without a way to read it. Body text is at least 16px on phones. |
| Tap targets | Interactive controls are at least 24×24 CSS px (WCAG 2.2 AA) and primary actions on touch viewports at least 44×44. |
| Contrast | Text and meaningful icons meet WCAG AA (4.5:1, or 3:1 for large text and UI components) in each theme. |
| Keyboard | Every control is reachable by Tab in a sensible order, focus is always visible, dialogs trap focus and return it. |
| Names | Controls and images have accessible names in the accessibility tree; one `h1`, headings in order. |
| Errors | No console errors and no failed requests caused by the page. |
| Stability | No visible layout shift after first paint; images and embeds reserve their space. |
| Motion | Animation is disabled or reduced under `prefers-reduced-motion`. |

## Scored criteria

The six criteria the Webby Awards use to judge websites. Score each from 1 to
10 per page and viewport, as a visitor arriving for the page's stated purpose.

| Criterion | What earns the score |
| --------- | -------------------- |
| Content | The page says something worth reading, to the right audience, in clear and specific words. Nothing is filler, stale, or placeholder. |
| Structure and Navigation | The order of the page matches what the visitor needs first. They know where they are, what they can do next, and how to get back. |
| Visual Design | A deliberate hierarchy, a consistent type scale and spacing rhythm, a restrained palette, and aligned edges. It looks made for this viewport, not squeezed into it. |
| Functionality | It loads fast, works on this device, and every control does what it says. Loading, empty, and error states are designed, not left over. |
| Interactivity | Controls respond at once and visibly; hover, focus, pressed, and disabled states exist; input is forgiving; the page invites the visitor to act. |
| Overall Experience | The parts add up. The visitor would remember the page, trust it, and come back. |

Anchors:

- **9–10** Would stand beside current Webby nominees in its category. Nothing
  to fix that a careful designer would notice.
- **8** Professional and considered throughout. Only `minor` issues.
- **6–7** Competent, but generic or uneven. At least one `major` issue.
- **4–5** Works, with visible neglect: broken rhythm, cramped or stretched
  layout, unclear hierarchy.
- **1–3** Broken or unusable at this viewport.

Score what is on the screen. A score below 8 needs at least one issue that
explains it; a score of 8 or more with an open `major` issue is wrong.

## Issue severity

- `blocker` The visitor cannot complete the page's purpose at this viewport.
- `major` The visitor notices and is slowed, misled, or put off.
- `minor` A careful eye notices; most visitors do not.

## Reviewer brief

Send this with the screenshots, the measured-check results, and one sentence
on the page's purpose and audience. Send nothing else.

```text
You are judging web pages against the Webby Awards website criteria. You have
screenshots of each page at several viewport sizes and the results of measured
checks. You did not build these pages and have no stake in them.

For each page and viewport, score Content, Structure and Navigation, Visual
Design, Functionality, Interactivity, and Overall Experience from 1 to 10
using the rubric's anchors. Tie every deduction to something visible: name the
viewport, where on the page it is, what is wrong, and its severity (blocker,
major, minor). Do not propose code. Do not round up out of politeness; an 8
means only minor issues remain. Score only what the evidence shows: if a
screenshot is missing, does not cover the whole page, or a check was not
measured, say so and list it as not assessed instead of guessing.

Return:
1. A table: page, viewport, six scores.
2. Issues, most severe first: page, viewport, location, problem, severity,
   criterion affected.
3. The three changes that would raise the lowest scores most.
```

## Round record

Keep one per round in the run's evidence folder:

```text
Round N — date, local HEAD per repository, backend in use
Viewports and themes captured
Measured checks: failures by page and viewport
Scores: page × viewport × six criteria; lowest score
Issues: open blocker / major / minor counts
Changes made this round, by file
Package checks: command and result
Decision: passed | continue | round limit | stalled
```
