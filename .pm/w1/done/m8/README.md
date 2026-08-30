# w1 · m8 — Awesome Plain Text Accounting decision tool

**Worker:** worker1 **Goal:** Turn the ecosystem catalog into a maintained, trustworthy tool that helps newcomers choose and assemble a plain-text accounting stack. **Status:** done

## Tasks (in order)

| id   | title                                                   | est | depends_on |          |
| ---- | ------------------------------------------------------- | --- | ---------- | -------- |
| t001 | Build a typed catalog and repair stale destinations     | 45m | —          | — **DONE** |
| t002 | Lead with a neutral chooser and stack journey           | 45m | t001       | — **DONE** |
| t003 | Add mobile navigation, search, and filters              | 45m | t002       | — **DONE** |
| t004 | Publish trust signals and privacy-safe actions          | 30m | t003       | — **DONE** |
| t005 | Verify the adoption surface and maintainer workflow     | 30m | t004       | — **DONE** |
| t006 | Simplify the decision-tool implementation               | 30m | t005       | — **DONE** |
| t007 | Add meaningful content and interaction coverage         | 45m | t006       | — **DONE** |
| t008 | Close out the milestone                                 | 15m | t007       | — **DONE** |

## Definition of done

The public dashboard owns `/awesome-plain-text-accounting` as a responsive, indexable decision tool. It compares Beancount, hledger, and Ledger before any affiliated conversion prompt; organizes maintained projects as engine → editor → importer → reporting → mobile; supports search and bounded filters; shows a review date, criteria, limitations, delivery and affiliation labels; offers a prefilled public contribution route; emits only coarse analytics; contains no known stale destinations; and passes focused tests, the live link validator, formatting, lint, the full dashboard test suite, production build, and desktop/mobile visual review.

## Source + Goal linkage

- **Source:** Promoted from `w1/004`, the 2026-08-29 product review of the live Awesome Plain Text Accounting page.
- **Goal linkage:** **A3 — Community & distribution** (primary), with **A2 — Frictionless onboarding** as a secondary benefit.
- **Expected outcome:** Visitors can make a credible first stack decision, explore compatible tools, and contribute corrections without confusing Beancount.io's hosted offering with neutral curation.
- **Why now:** The reviewed page had nine broken destinations, weak decision support, no methodology or review date, and a long mobile catalog. The dashboard now provides a public repository-owned implementation surface, so the full fix can ship here without private dependencies.

## Closeout evidence

- The typed catalog contains 22 validated entries, excludes all nine known stale destinations, and every live destination returned HTTP 200 on 2026-08-29.
- Focused catalog/page/metadata/filter tests pass; the complete dashboard suite passes with 3,429 tests and one existing skip.
- `yarn format:check`, `yarn lint`, `yarn build`, `yarn check:awesome-links`, and `python3 scripts/check-agent-guidance.py` pass.
- Desktop (1440×900) and mobile (390×844) production renders were inspected. The document has no horizontal overflow; the mobile catalog uses accessible horizontal rails and a non-sticky filter panel; metadata exposes the canonical URL and 22-item JSON-LD; the browser reported no page-code console errors. The local root loader's configured API endpoint produced an unrelated certificate error after navigation.
