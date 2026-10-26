# SkillsMP customer collection correction — draft, not sent

**Owner:** w6/m6.5/t012. **Last checked:** 2026-10-26T01:46:19Z.
**Status:** existing collection is mixed and stale;
supported submission/edit route remains unestablished. No request sent.

[Exact counts, observed source link and route investigation](skillsmp-recheck-20261026.json)
retain the current boundaries separately from the draft below.

## Current evidence

The actual [repository collection](https://skillsmp.com/creators/bex-co/beancount-io)
loads with 27 entries: eight customer workflows and nineteen repository
development skills, including dashboard QA, `pm`, `loopx` and `ship`.
The [ask detail](https://skillsmp.com/creators/bex-co/beancount-io/skills-claude-skills-beancount-ask)
still links to the removed `skills/.claude/skills/beancount-ask` source.
The current customer root contains thirteen workflows.

The public search page reports an unavailable search service. Direct records
load after the normal browser verification completes automatically; no
challenge is solved, warning bypassed or failed search retried. Search failure
is not evidence of index cleanup.

The [official discovery FAQ](https://skillsmp.com/agent-skills#how-can-my-skill-be-discovered)
describes GitHub discovery without guaranteed inclusion or update timing.
The [documented API](https://skillsmp.com/docs/api) exposes keyword search;
no writable index/collection endpoint is documented there. The inspected
anonymous collection/detail pages expose installation and favorite controls,
but no submission, claim, refresh, edit or delete control. Private publisher
capabilities remain unknown; no authenticated publisher dashboard was tested.
A matching-name GitHub repository, `yan-labs/skillsmp`, is a search CLI/library,
not an established catalog-data contribution route. This investigation does
not prove that all self-service management is impossible.

## Proposed email

**To:** [support@skillsmp.com](mailto:support@skillsmp.com), listed on the
[official About page](https://skillsmp.com/about).

**Subject:** Beancount.io customer suite: refresh sources and exclude internal skills

Hi SkillsMP team,

We maintain Beancount.io and would like to correct its existing repository
collection: https://skillsmp.com/creators/bex-co/beancount-io

The collection currently contains 27 entries: eight customer workflows and
nineteen internal repository development tools. Customer entries such as
beancount-ask still link to the removed skills/.claude/skills/ source layout.

Please refresh the existing customer collection from:
https://github.com/bex-co/beancount-io/tree/main/skills

This is one Beancount.io customer suite with thirteen workflows. Please
exclude/de-index .agents/skills/** and root .claude/skills/** records,
including qa-find-bugs-dashboard, other QA skills, pm, loopx, ship and
routine-* tools. They are not part of the customer product.

- Whole-suite installation guide:
  https://github.com/bex-co/beancount-io/blob/main/docs/skills/installation.md
- Existing suite plugin:
  https://clawhub.ai/plugins/@puncsky/beancount-io
- Correct ask source:
  https://github.com/bex-co/beancount-io/tree/main/skills/beancount-ask

Please update existing records without creating duplicate individual
listings. If an owner submission/claim/correction step is required, please
share its supported entry point. Please also clarify whether a collection
can be scoped to this customer subtree or represented as one plugin suite.

Thank you,
Beancount.io

---

This draft contains only public source, product and catalog information.
It has not been sent. Explicit authorization to send this recipient/request
has not been received; authorization for a different platform does not cover
it. No new account, API key, paid subscription, QA credential, ledger content,
catalog PR or individual internal-skill submission is part of this request.
Live correction and supported suite publication remain unverified.
