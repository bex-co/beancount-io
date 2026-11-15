# Current ClawHub release preflight — 2026-10-21 UTC

Later follow-up: [variance controls and the close Report correction](./variance-release-controls-20261021.md)
advance the suite to 0.3.6 and change only close's skill body relative to this
preflight. The dated equivalence results below describe the earlier candidate.

Rechecked the unfinished m6/t013 task and all six named w3/m55–m57 dependencies on main `e3ddae94d3cf63476b242ceb6bcf3618058e1ba3`. Preparation continued inside the blocked milestone. No Claude quota probe, protected dispatch or publication was made.

Rebuilding produces **13 standalone bundles and 119 authored files**. Every file matches the previously tested final thirteen-skill candidate from `1537bc6bd2ab1be1bd299ee411ef801139f61f61`; the customer skill files and plugin manifests have not changed since that source. Later changes affect the routing harness/set and evidence documentation. The sorted `skill/path<TAB>sha256` manifest has SHA-256 **`348d6cf4fe6be906551c9cb128fb532b7540685187e1e8a86de6c7c1629397ac`**. Exact comparisons against the accepted eleven-skill release `ac95106709fbcbdc9214048c75af258e2a9b71f2` and fresh anonymous ClawHub **0.23.3** dry runs agree:

| Candidate outcome | Skills and proposed registry versions |
| --- | --- |
| First publication | accruals 1.0.0; roll-forward 1.0.0 |
| Changed content | add 1.0.3; ask, close and trade 1.0.2 |
| Unchanged; skip | import, importer-author, init, migrate, options, property, reconcile |

All thirteen plans return `ok: true`: six `would-publish`, seven `unchanged`. These are previews, not submission receipts. The changed existing bundles contain the variance BQL reference; ask/close also change their skill bodies. The seven accepted bundles must not be uploaded again merely to finish the newer release.

The actual preparatory commands, run from `scripts/skills/`, were:

```sh
python3 beancount-skills.py bundle tmp/w6-m6-substeps-20261021/bundles
python3 beancount-skills.py install <fresh-workspace>/.agents/skills <fresh-workspace>/.claude/skills
python3 beancount-skills.py verify <fresh-workspace>/.agents/skills <fresh-workspace>/.claude/skills
clawhub --no-input skill publish <each-bundle> --slug <name> --owner puncsky --dry-run --json
```

The new workspace install and verify report thirteen complete skills in each client directory. Current catalogs, root guidance, both plugin descriptions/licenses, the 0.3.5 suite version and the complete plugin skill inventory agree. `python3 scripts/check-agent-guidance.py` passes for all 17 canonical scopes and the shared development-skill link. A fresh real Codex listing names exactly all thirteen skills in 20.7 seconds. The sparse network clone portion of the installation guide was not repeated.

Two new full native turns exercise each addition **with only its own standalone bundle installed**, using the unchanged raw fixture prompt after a setup statement naming the skill and absolute published `bea` executable. Expected answers were not supplied. Codex CLI **0.163.0** uses its configured default **gpt-6.1-sol, xhigh reasoning**, with no model or reasoning override. The published `bea` **0.3.1** frontend and its managed engine are restored under task scratch; native preflight returns `data.valid=true`, `errors=[]`.

| Standalone case | Reviewed actual behavior | Result |
| --- | --- | --- |
| Roll-forward 3: brokerage cost versus value | Five executed BQL reads establish opening 0, movement/closing 10 ACME at 1,000 USD cost; separately labels the available February 1 quote of 110 and 1,100 USD valuation while preserving the missing January 31 price. Queries shown. | Pass, exit 0, 127.4 s |
| Accruals 6: settled liability | Two executed BQL reads establish 200 USD recognized expense. The settlement clears the liability without reversing expense; target 200, booked 200, adjustment 0, identity `accrual:rent:2025-02`, no additional posting. | Pass on one targeted retry, exit 0, 88.6 s |

Both installed skill trees remain byte-identical to their candidate bundles. Both ledgers remain unchanged: roll-forward SHA-256 `caf61c08dca8aca9eaba4d8c1f262907d75e9994aedc38895ff551f135c3610e`; accruals `db2ec61bc666bc8246a1077c8011cd03cb315fee9273c7ccb44263b67943939c`. Actual commands, outputs, finals, hashes and per-expectation review are retained.

The first accrual turn failed after successful local checks/queries with **“Selected model is at capacity. Please try a different model.”**, exit 1 after 50.5 seconds and no final answer. It remains an unusable infrastructure observation, separately preserved; only that case was retried. Initial user configuration also initialized an unrelated Mobbin MCP authentication challenge, without any model connector-tool call. The targeted retry and catalog discovery disable the two configured MCPs for those processes only; persistent user configuration is unchanged. An unrelated invalid user-level `canvas` skill warning is also preserved. Both successful case turns read ancestor repository `AGENTS.md` guidance: these are read-only standalone-bundle controls, not clean-host or completed write-journey evidence. They do not clear the recorded PDF first-open routing loss or substitute for Claude validation.

Anonymous public metadata still exposes the accepted eleven versions (five 1.0.2 and six 1.0.1) under `puncsky`. Nine responses retain `verdict: clean` alongside `review.llm_review`; import and close have null moderation fields. Neither form is treated as a clean host audit. The two additions return 404. One initial accrual lookup had a local DNS failure; its single retry returns 404, with the initial observation retained. The existing exact-download and actual OpenClaw/Hermes installation evidence remains the accepted-release proof; those host installs were not repeated.

Read-only GitHub environment metadata confirms the existing `puncsky` required reviewer, main-only deployment branch, `CLAWHUB_OWNER=puncsky`, `CLAWHUB_MIT0_APPROVED=true` and the presence of the `CLAWHUB_TOKEN` **secret name only**. No secret value was read. The workflow still limits publication to explicit protected dispatch from main, builds that commit's bundles and removes its publisher config afterward.

The owning w3 task notes still describe the obsolete gpt-6-luna Codex quota blocker. The unchanged-source Codex evidence is available: roll-forward 6/6, variance ask14–16/close12 4/4, accruals 6/6, two routing cohorts and current discovery. Static adoption substeps above are complete. The exact remaining gates are current Claude validation of the corrected valuation, recognition/period identity and sixth accrual case; current Claude discovery and before/after routing; owning-milestone adoption review preserving the PDF routing result; protected publication of only the six new/changed bundles; then public promotion, authored-byte checks and actual supported-host installs before the final m6 DoD closeout. Neither t013 nor all adoption tasks are claimed complete.

Evidence: `scripts/skills/tmp/w6-m6-substeps-20261021/`, particularly `provenance.json`, `authored-file-manifest.tsv`, `dry-run-results.json`, `installer.json`, `adoption-audit.json`, `codex-discovery/result.json`, `standalone-review.json`, raw standalone event/final folders, `public-listings.json`, `public-accruals-retry.json`, `protected-readiness.json`, `dependency-matrix.json` and `summary.json`. Temporary tooling/cache cleanup is recorded separately in `cleanup.json`; bundles and raw evidence are retained.
