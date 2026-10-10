# w4 · m10 — GitHub contributor front door: issue and PR templates, security policy, code of conduct, seeded good first issues

**Worker:** worker1 **Goal:** a first-time reporter opens an issue through a form that captures the package, version, and reproduction the maintainers need, a first-time contributor finds a sized task and a PR template that names the checks to run, and the repository's community profile is complete **Status:** blocked — see [Blocked](#blocked) (t002, t008 done; t001 shipped, labels pending)

## Tasks (in order)

| id   | title                                                                                                                     | est | depends_on |
| ---- | ------------------------------------------------------------------------------------------------------------------------- | --- | ---------- |
| t001 | Issue forms: bug, feature, skill request, self-host help, each with a package picker and the checks to run                | 40m | —          |
| t002 | PR template with the package checks table, one-package rule, and secret-scan reminder — **DONE**                          | 20m | —          |
| t003 | SECURITY.md with the reporting channel and gitleaks policy, CODE_OF_CONDUCT.md, both linked from CONTRIBUTING and README  | 30m | —          |
| t004 | Seed good first issues from the board's open sub-hour QA notes and label issue 176 against the price and self-host work   | 45m | t001       |
| t005 | Contributing guide: first-PR walkthrough per package, complete layout table, and where to ask                             | 30m | t003       |
| t006 | Adoption surface                                                                                                          | 20m | t002, t004, t005 |
| t007 | Simplify                                                                                                                  | 20m | t006       |
| t008 | Test coverage — **DONE**                                                                                                  | 40m | t006       |
| t009 | Closeout                                                                                                                  | 15m | t007, t008 |

## Blocked

**Blocked 2026-09-14 by `/loop-worker w4` after the in-repository work shipped.** `dbb1e763` added the four issue forms and chooser config (t001), the pull request template (t002), and the community-files validator with its path-filtered CI check (t008). All four forms render as issue-form previews on GitHub and `CI (community files)` passed. t008 was pulled ahead of its Adoption-surface dependency because the validator had to exist before the files it guards landed. Every remaining task needs a user decision or a user-approved change on GitHub:

1. **Security reporting channel (t003, then t005, t006, t007, t009).** Enable GitHub private vulnerability reporting for the repository, or supply the maintainer contact `SECURITY.md` and `CODE_OF_CONDUCT.md` should name. The task forbids a placeholder address.
2. **Labels (t001).** Approve creating the `skills` and `self-host` labels that two forms apply, then confirm in a signed-in session that "New issue" offers the four forms and no blank issue.
3. **Public issues (t004).** Approve filing at least five `good first issue`s from current board notes and labeling issue176. The maintainer already answered the community request and closed it; no duplicate reply is required.

**Unblock with the repository owner:** confirm the real security/conduct reporting channel (enable private vulnerability reporting or supply the contact), authorize the missing labels and public contributor issues/issue176 labeling, and provide the signed-in issue-chooser verification. The t005/t006/t007/t009 chain remains deferred behind those inputs. Move this directory back to `.pm/w4/m10/` when they arrive; the workstream checkbox stays unchecked until closeout.

**Rechecked 2026-10-10 by `/loopx w4`:** GitHub's read-only API reports private vulnerability reporting disabled, no `skills` or `self-host` labels, no open `good first issue`s, and issue176 closed with no labels. The maintainer's [2026-09-12 reply](https://github.com/bex-co/beancount-io/issues/176#issuecomment-5644470503) addresses live prices, operating currencies and shared-database deployment; the [2026-09-17 follow-up](https://github.com/bex-co/beancount-io/issues/176#issuecomment-5707657060) links the shipped public live-price example. The old reply blocker is therefore cleared, independently of m9's remaining local-first scope decision. No GitHub setting, label, issue or comment was changed during this audit. The milestone stays blocked on the owner decisions and remaining observation above.

## Definition of done

- GitHub's community profile for the repository shows description, README, code of conduct, contributing guide, license, security policy, issue templates, and pull request template all present.
- Choosing "New issue" offers the four forms plus contact links; a submitted bug form carries the package, version or commit, reproduction steps, expected result, and logs fields, and is auto-labeled.
- At least five open issues carry `good first issue` with a package label, each pointing back to the board note it came from; issue 176 is labeled and answered with links to the milestones that address it.
- `CONTRIBUTING.md` lists every package in the layout table and links the per-package checks instead of duplicating them.
- A path-filtered CI check validates every issue form's YAML and required keys and the internal links in the new files.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w4`, 2026-09-10 (item 6); user handed items 1, 6, and 7 to `/pm` on 2026-09-11. Ground truth at proposal time: `.github/` held only workflows and Copilot instructions; no issue or PR templates, no `SECURITY.md`, no `CODE_OF_CONDUCT.md`; labels were GitHub defaults; Discussions disabled.
- **Goal linkage:** **A3 — Community & distribution**: issue quality and first-time contributions are the signals this pillar names, and the front door is what shapes both. A complete community profile is also the first credibility check a developer runs on a repository.
- **Expected outcome:** new issues arrive with the fields maintainers need, newcomers find a sized first task, security reports have a private channel, and the board's sub-hour QA notes become work the community can pick up.
- **Why now:** the first substantial community feature request arrived this week without a template, the board has a stock of sub-hour QA findings that make ideal first issues, and the cost is a few hours of compounding assets. Enabling Discussions and private vulnerability reporting are repository settings that remain the user's decision; the tasks say what to ask for.
- **Adoption surface:** included because this ships user-facing repository files linked from the README and CONTRIBUTING guide.
