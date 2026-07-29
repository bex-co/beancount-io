# `.pm` anti-goals — do not do

Hard constraints for the adoption board. `/pm-brainstorm` and `/pm` read this before proposing or materializing work, and must reject conflicting items explicitly.

- **No private-repo leakage.** Never reference, copy, or depend on content from private sibling repositories (backend services, IDL, private infra). Work that requires private code to change belongs on that repo's board, not here — only propose work that can land entirely in this public monorepo.
- **No secrets on the board.** No credentials, tokens, internal URLs, or user data in any `.pm/` file. The whole tree is public and gitleaks gates every push.
- **Don't re-implement upstream.** Don't fork or duplicate what upstream `beancount` / `fava` already does well — extend, wrap, or integrate instead. Where reimplementation is deliberate (e.g. `fava-slim`), it must stay clean-room and license-clean.
- **No spammy growth tactics.** No star-begging, bulk unsolicited PRs/issues to other repos, fake engagement, or SEO spam. Adoption comes from things that work: docs, skills, tools, examples.
- **No milestone theater.** Don't create milestones to make the board look busy. If it isn't >1h of real work with an observable adoption outcome, it's an inbox note or nothing.
