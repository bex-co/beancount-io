# DO NOT DO — roadmap anti-goals and guardrails

Use this file as a hard constraint when running `/pm-brainstorm` and `/pm`. If a proposed milestone/task conflicts with any item below, reject it.

## Anti-goals

- Do not propose roadmap work that is not clearly tied to a `.pm/GOAL.md` pillar (effortless capture, AI-powered ease, analytics & insights, plain-text fidelity).
- Do not create milestones that are vague, non-testable, or missing an observable outcome for the app user.
- Do not create milestones for sub-hour work; keep those as inbox notes (`wN/NNN.md`).
- Do not add "nice-to-have" work that has no clear sequence/dependency/risk rationale for why it must happen now.
- Do not duplicate existing milestones/tasks without a clear gap analysis and replacement intent.
- Do not propose features that break plain-text fidelity — proprietary data formats, lossy transforms of the ledger, or app state that cannot round-trip to valid beancount.
- Do not propose AI features that silently mutate the user's ledger; AI proposes, the user reviews and confirms.
- Do not plan work that hard-codes colors (use theme tokens), bypasses `useTranslations()`/the `src/translations/` base file, or hand-edits `src/generated-graphql/` or `yarn.lock`.
- Do not plan tasks that require new dependencies without flagging it explicitly (repo rule: ask the user before adding dependencies).
- Do not include tasks that cannot name the concrete files/screens/GraphQL operations they touch.
- Do not treat speculative ideas as committed roadmap items without explicit source context.

## Minimum bar for a meaningful milestone

Every proposed milestone must include:

- goal linkage (which `.pm/GOAL.md` pillar it advances),
- expected outcome (observable impact for beancount.io users),
- why now (dependency/risk/sequence rationale),
- definition of done with a testable end state.
