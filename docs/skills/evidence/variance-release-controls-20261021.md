# Variance release controls — 2026-10-21 UTC

A task-level m6/t013 review found two untested requirements in its w3/m56
dependency: a negative comparator and a supported price/volume bridge. Existing
ask 14–16 and close 12 cover zero, missing budget and a subthreshold change.
This follow-up adds ask 17–18 and matching close 13–14, using invented suppliers
and amounts. It does not close the owning milestones or publish a release.

## Fixtures and deterministic checks

The negative fixture has a May refund of −100 USD and a June purchase of
200 USD: delta +300, percentage not applicable. The bridge fixture records May
quantity 10 at 20 USD and June quantity 12 at 25 USD, with booked expenses
200 and 300 USD. Under the user's explicit convention, price `(25−20)×12 = 60`
plus volume `(12−10)×20 = 40` equals the actual 100 USD delta. Adding another
10 USD interaction would double-count it. No mix or business cause is inferred.

Two new deterministic tests execute the shipped total/driver recipes, preserve
refund signs and half-open bounds with out-of-period decoys, and verify invoice
metadata against independently queried booked totals. They do not replace
agent behavior with a test-only calculator.

## Native behavior and correction

Codex 0.163.0 used configured **gpt-6.1-sol / xhigh**, without model/reasoning
overrides, and published **bea 0.3.1** with its managed engine. Each workspace
contains its own standalone skill bundle and raw fixture. Prompts supply the
user request and decomposition policy, not expected answers. Unrelated MCPs
are disabled for those processes only; persistent config/login are unchanged.

Original close turns returned correct figures but omitted query provenance
from the final answer and did not execute arithmetic. An intermediate wording
correction made them show BQL but still left arithmetic to the answer text.
Both cohorts remain recorded as incomplete. The final narrow Report instruction
requires computing deltas, percentages and bridge components with BQL or a local
decimal calculation and showing reproduction queries/commands. The same raw
prompts were rerun.

| Current case | Reviewed actual behavior | Result |
| --- | --- | --- |
| ask 17 | Queries establish −100 → 200; BQL computes +300 and the absolute threshold. Percentage is not applicable; dated evidence distinguishes refund and purchase. | Pass, 100.1 s |
| ask 18 | Reads recover quantity/price and booked totals; BQL computes delta 100, 50%, price 60, volume 40 and zero residual. No extra interaction or invented cause. | Pass, 148.3 s |
| close 13, final | Same figures/policy as ask; executed Decimal computes delta and posting bridge, queries are shown, reconciliation remains unverified. | Pass, 170.8 s |
| close 14, final | Same bridge as ask; executed Decimal returns 100/50%/60/40/0, quantities/prices tie to invoices, BQL is shown, reconciliation stays unverified. | Pass, 171.3 s |

All four exit 0. Ledgers remain byte-identical, installed bundle files match,
no extra workspace file exists, no Git index was created and no commit exists.
Negative fixture SHA-256:
`6b735d585e340e3210c7c29ceb7f861816e5b1fe305582a12c26d2309e4bc0fe`;
bridge:
`e3ba3b47b2fd64a84a7bf9edf2c69dd0ea8edfc86de7b804c05a66aa3ddd95ba`.
These are read-only standalone controls with ancestor repository guidance,
not clean-host or completed reconciliation/write journeys.

## Release and remaining gates

Both plugin manifests advance from 0.3.5 to **0.3.6** under the customer-folder
version rule. Evals are excluded from registry bundles. Before the Report fix,
all 119 authored files were unchanged; afterward the only changed file among
the thirteen bundles is `beancount-close/SKILL.md`. Its fresh anonymous ClawHub
0.23.3 dry run reports `would-publish` **1.0.2**, latest **1.0.1**, nine files,
fingerprint `465a3cfe128f578baef843725de94232c22cccaca26349f4f3dbf04ed65e2f71`.
This is a preview, not an upload. The six-release/seven-skip plan retains its
membership; the twelve other bundle trees are unchanged.

Validation passes: **138** installer/recipe/journey tests against the checkout,
**37** recipe tests against published bea 0.3.1, **37** checker tests,
structural/fixture checks, skill validators and 17-scope guidance checks.
An initial full-suite run selected an unrelated PATH bea 0.1.0 and failed five
existing behaviors; explicitly selecting the checkout resolves them. An initial
system Python 3.9 invocation could not parse an existing newer f-string; the
suite runs with repository Python 3.13.3. Failed attempts remain in scratch.

One bounded default Claude Code 2.1.304 discovery probe at **07:23:13 UTC** still
returns first-party 429 `usage_limit_reached`, zero tokens and $0. Its “10am”
reset text has no date; none is inferred and no further probe is made. Claude
validation of these cases and the Report correction joins the existing
valuation/accrual/discovery/routing gates. Preserve the recorded PDF first-open
result in adoption review. Protected publication, public promotion/bytes and
supported-host verification still follow those gates; m6/t013 remains open.

Evidence: `scripts/skills/tmp/w6-variance-controls-20261021/` retains all native
cohorts, raw prompts/events/finals, command evidence, `review.json`, bundles,
published frontend freeze, preflight and dry-run results. The Claude probe and
independent fixture oracle remain under
`scripts/skills/tmp/w6-m6-claude-gate-20261021/`.
