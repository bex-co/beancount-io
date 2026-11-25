# Beancount.io hosted MCP entry for Hermes

Submitted on 2026-11-25 as
[NousResearch/hermes-agent PR #159949](https://github.com/NousResearch/hermes-agent/pull/159949).
The entry awaits upstream review and release.

On 2026-11-25, the upstream [CI run](https://github.com/NousResearch/hermes-agent/actions/runs/45565537618)
reported `action_required` with zero jobs for head
`a9e56c412c3166cc9bca70e1745b9a83a75c621a`. The PR was open and mergeable,
with no review feedback. The upstream workflow has yet to run its jobs.

The [candidate manifest](./optional-mcps/beancount/manifest.yaml) is prepared
for `optional-mcps/beancount/manifest.yaml` in
[`NousResearch/hermes-agent`](https://github.com/NousResearch/hermes-agent).
The [Hermes MCP catalog](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp#catalog-one-click-install-for-nous-approved-mcps)
uses reviewed repository entries. After merge and release, the expected
discovery and install commands are `hermes mcp catalog` and
`hermes mcp install beancount`.

The candidate follows the
[Linear remote OAuth entry](https://github.com/NousResearch/hermes-agent/blob/main/optional-mcps/linear/manifest.yaml).
It uses the existing Beancount.io HTTPS endpoint and browser OAuth. Hermes
discovers tools from the server. Users authorize access to their hosted
ledgers through the existing consent flow. The manifest contains no bootstrap
commands, local skill files, or client secrets.

On 2026-11-23, the released Hermes v0.23.3 catalog parser accepted the
manifest and its configuration builder produced exactly the existing HTTP URL
and `auth: oauth`. This was a local check of the released parser and config
builder. The [earlier native rehearsal](../../../../../.pm/w6/done/m7/done/t004.md)
verified production sign-in, a read, and a dry-run write using that config on
v0.22.2 and a synthetic ledger. The catalog parser file on the PR's base
commit matches the v0.23.3 file byte for byte. After inclusion, verify catalog
discovery and a fresh native install with a synthetic ledger.

The separate [local-ledger skill suite](../../../../../docs/skills/suite-distribution.md#hermes-admission-limits)
still has its own Hermes installation requirements.
