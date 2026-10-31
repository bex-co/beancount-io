# Muse connector submission preparation

**Stage:** prepared public materials; no authenticated application inventory,
submission receipt, approval or native Muse acceptance is established.

## Connector overview

**Beancount.io** connects Muse to the user's hosted plain-text accounting ledger.
Intended users include people maintaining personal books and small-business
bookkeepers. It can answer BQL questions, inspect reports and source files,
preview supported edits, record confirmed bookkeeping changes and work with
already linked bank imports. This adds structured authenticated accounting and
validation beyond browsing public pages.

It records accounting data; it does not transfer funds or place financial trade
orders. A recorded trade directive is a bookkeeping record. Bank imports read
provider transactions and stage/import accounting entries. Account, ledger
permissions, plan quotas and optional bank/provider availability still apply.
An existing Beancount.io account and access to the selected hosted ledger are
required. Current plans and limits: https://beancount.io/pricing.

- Endpoint: `https://beancount.io/api-gateway/mcp`
- Transport: Streamable HTTP
- Registry identity: `io.beancount/beancount`
- Product: https://beancount.io/
- Source: https://github.com/bex-co/beancount-io/tree/main/backend-cluster/backend-v2
- Setup/authorization: https://github.com/bex-co/beancount-io/blob/main/backend-cluster/backend-v2/docs/mcp.md
- Brand asset: https://beancount.io/lgasset/logo.png
- Privacy: https://beancount.io/privacy-policy
- Product terms: https://beancount.io/terms-of-service
- Security: https://beancount.io/security
- Public support: https://github.com/bex-co/beancount-io/issues

Operator contact, business-verification evidence and legal submitter details
belong only in the actual private portal. They are not invented in this packet.

## Authentication, permissions and tool effects

Use user-delegated OAuth discovery and the canonical resource. The service offers
`ledger.read`, `ledger.write` and administrative permissions; read-only-only access
is supported. Each call re-authorizes the selected ledger against the actual
credential, permissions and any ledger pin. Do not require broader access for a
read-only review. Review credentials must be synthetic-only, scoped to submitted
tools, delivered through the actual supported private channel and valid for the
confirmed review window. No credential has been created or transmitted to Muse.

[Complete implementation-based tool explanations](../openai/tool-annotations.json)
cover the current deployed definitions, inputs/outputs are discoverable from the
endpoint, and [hosted verification](../openai/deployed-annotation-verification-20261031.json)
records the observed source and catalog. These MCP booleans are not a substitute
for Muse's own sensitive-write review.

The [Muse read/write preparation](tool-review-preparation.json) maps every current
tool from its actual behavior. Request approval per invocation for writes during
review. Muse reviewers retain the formal sensitive designation and host policy;
no portal approval setting or accepted tool scope is inferred. Preview-capable
writes remain writes because committed mode is also available. Destructive and
access-changing operations, optional AI processing and their quota effects are
explicit in the complete explanations.

## Data-processing preparation

The connector accesses selected ledger metadata, accounts, transactions and files
needed for a request. Optional parsing also processes caller-owned uploaded
financial documents and consumes AI allowance. Linked-bank tools access the
selected connection's account and staged-transaction records. Results return to
the requesting authenticated host. Optional AI processing and service-provider
sharing are described in the published privacy policy linked above.

Technical request boundaries are verified in source and the deployed catalog.
Business attestations, exact deployed retention/deletion practices, current
subprocessor details and any additional portal questionnaire must be checked
against the actual private form and operator evidence before submission. Do not
promise zero retention, training exclusions or deletion deadlines without that
evidence. No real ledger/account data or reviewer secret is included here.

## Synthetic reviewer journey

1. Connect through the submitted native Muse flow with the dedicated synthetic
   account and selected test ledger. Begin with read-only scope where supported.
2. Enumerate tools, select the authorized synthetic ledger, run `checkLedger` and
   a known structured BQL balance query, and record the real result.
3. With specifically approved write scope, call a supported tool such as
   `appendLedgerText` exactly once with `dry_run:true` and `allowInvalid:false`.
   Use discovered source paths and synthetic content; never substitute a real write.
4. Independently compare commit, full source, entry counts, balance and validation
   before/after. Confirm no preview marker persists. Keep the original grant.
5. Record actual Muse client/version, times and limits. Direct MCP checks already
   performed elsewhere do not prove this native journey.

## Intake and remaining gate

The [official submission entry](https://platform.muse.ai/submission) requires a
publisher login. [Current official guidelines](https://platform.muse.ai/docs)
describe business verification, private reviewer access, tool review and native
QA; approved connectors become discoverable in Muse. The current login reaches
an existing publisher's authenticator-code challenge after email verification.
No authenticated application inventory or final agreement has been inspected.

**Unblock:** publisher completes the authenticator step on the retained page.
Then inspect/deduplicate the actual applications, finish the portal-specific
fields and any mandatory final agreement confirmation, submit one canonical
application and retain its real receipt. Task w6/m12/t002 keeps later review,
public discovery and native acceptance. Gemini work continues independently.
