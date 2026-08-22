# Parity coverage ledger (ARCHIVED — historical record)

The Python oracle this file was validated against (`backend-cluster/beancount-ledger`)
was deleted at ledger-v2 decommission, after ≥1 week of clean production
bake-in (`docs/ledger-v2-cutover-runbook.md`). `yarn test:parity` can no
longer run — the dual-target harness has no oracle left to compare against.
This file is kept as the record that all 75 contract rows were green at
cutover; it is not updated going forward. The rest of this document describes
the harness as it operated before the oracle was retired.

Every live operation of the pinned contract
(`backend-cluster/idl/beancount-ledger.openapi.json`), tracked one by one.
An operation is **green** only when its suite passes `yarn test:parity`
against the live dual-target stack (`parity/up.sh`). Update this file in the
same change that lands a suite.

Statuses: `green` (parity suite passing) · `pending` (no suite yet) ·
`behavioral` (webhook ops — verified by behavior tests, not response diffing).

## ledgers (15)

| operationId           | path                                               | status | suite                              |
| --------------------- | -------------------------------------------------- | ------ | ---------------------------------- |
| listLedgers           | GET /ledgers                                       | green  | suites/ledgers.integration.test.ts |
| getLedger             | GET /ledgers/{owner}/{repo_name}                   | green  | suites/ledgers.integration.test.ts |
| createLedger          | POST /ledgers                                      | green  | suites/ledgers.integration.test.ts |
| listUserLedgers       | GET /ledgers/users/{username}                      | green  | suites/ledgers.integration.test.ts |
| searchLedgers         | GET /ledgers/search                                | green  | suites/ledgers.integration.test.ts |
| updateLedger          | PUT /ledgers/{owner}/{repo_name}                   | green  | suites/ledgers.integration.test.ts |
| deleteLedger          | DELETE /ledgers/{owner}/{repo_name}                | green  | suites/ledgers.integration.test.ts |
| getLedgerFile         | GET /ledgers/{owner}/{repo_name}/files             | green  | suites/files.integration.test.ts   |
| createLedgerFile      | POST /ledgers/{owner}/{repo_name}/files            | green  | suites/files.integration.test.ts   |
| updateLedgerFile      | PUT /ledgers/{owner}/{repo_name}/files             | green  | suites/files.integration.test.ts   |
| deleteLedgerFile      | DELETE /ledgers/{owner}/{repo_name}/files          | green  | suites/files.integration.test.ts   |
| getLedgerFilesContent | POST /ledgers/{owner}/{repo_name}/files-content    | green  | suites/files.integration.test.ts   |
| changeLedgerFiles     | POST /ledgers/{owner}/{repo_name}/change-files     | green  | suites/files.integration.test.ts   |
| getLedgerDirContent   | GET /ledgers/{owner}/{repo_name}/dirs              | green  | suites/files.integration.test.ts   |
| getLedgerArchive      | GET /ledgers/{owner}/{repo_name}/archive/{archive} | green  | suites/files.integration.test.ts   |

## reports (29)

| operationId                    | path                                        | status | suite                                    |
| ------------------------------ | ------------------------------------------- | ------ | ---------------------------------------- |
| getLedgerAttributes            | GET /reports/{o}/{r}/attributes             | green  | suites/compute-reads.integration.test.ts |
| getLedgerOptions               | GET /reports/{o}/{r}/options                | green  | suites/compute-reads.integration.test.ts |
| getLedgerFavaOptions           | GET /reports/{o}/{r}/fava-options           | green  | suites/compute-reads.integration.test.ts |
| getLedgerBcioOptions           | GET /reports/{o}/{r}/beancountio-options    | green  | suites/compute-reads.integration.test.ts |
| getLedgerPlugins               | GET /reports/{o}/{r}/plugins                | green  | suites/compute-reads.integration.test.ts |
| getLedgerSourceFiles           | GET /reports/{o}/{r}/source-files           | green  | suites/compute-reads.integration.test.ts |
| getLedgerCommodities           | GET /reports/{o}/{r}/commodities            | green  | suites/compute-reads.integration.test.ts |
| getLedgerPayeeTransactions     | GET /reports/{o}/{r}/payee-transactions     | green  | suites/compute-reads.integration.test.ts |
| getLedgerNarrationTransactions | GET /reports/{o}/{r}/narration-transactions | green  | suites/compute-reads.integration.test.ts |
| getLedgerPayeeAccounts         | GET /reports/{o}/{r}/payee-accounts         | green  | suites/compute-reads.integration.test.ts |
| getLedgerNarrations            | GET /reports/{o}/{r}/narrations             | green  | suites/compute-reads.integration.test.ts |
| getLedgerEvents                | GET /reports/{o}/{r}/events                 | green  | suites/compute-reads.integration.test.ts |
| getLedgerDocuments             | GET /reports/{o}/{r}/documents              | green  | suites/compute-reads.integration.test.ts |
| getLedgerAccounts              | GET /reports/{o}/{r}/accounts               | green  | suites/compute-reads.integration.test.ts |
| getLedgerPayees                | GET /reports/{o}/{r}/payees                 | green  | suites/compute-reads.integration.test.ts |
| getLedgerLinks                 | GET /reports/{o}/{r}/links                  | green  | suites/compute-reads.integration.test.ts |
| getLedgerYears                 | GET /reports/{o}/{r}/years                  | green  | suites/compute-reads.integration.test.ts |
| getLedgerCurrencies            | GET /reports/{o}/{r}/currencies             | green  | suites/compute-reads.integration.test.ts |
| getLedgerTags                  | GET /reports/{o}/{r}/tags                   | green  | suites/compute-reads.integration.test.ts |
| getLedgerErrors                | GET /reports/{o}/{r}/errors                 | green  | suites/compute-reads.integration.test.ts |
| getLedgerHierarchy             | GET /reports/{o}/{r}/hierarchy              | green  | suites/compute-reads.integration.test.ts |
| getLedgerIntervalTotals        | GET /reports/{o}/{r}/interval-totals        | green  | suites/compute-reads.integration.test.ts |
| getLedgerAccountLastEntries    | GET /reports/{o}/{r}/account_last_entries   | green  | suites/compute-reads.integration.test.ts |
| getLedgerEntriesCountPerType   | GET /reports/{o}/{r}/entries_count_per_type | green  | suites/compute-reads.integration.test.ts |
| getLedgerAccountReport         | GET /reports/{o}/{r}/account_report         | green  | suites/compute-reads.integration.test.ts |
| getLedgerIncomeStatement       | GET /reports/{o}/{r}/income-statement       | green  | suites/compute-reads.integration.test.ts |
| getLedgerTrialBalance          | GET /reports/{o}/{r}/trial-balance          | green  | suites/compute-reads.integration.test.ts |
| getLedgerBalanceSheet          | GET /reports/{o}/{r}/balance-sheet          | green  | suites/compute-reads.integration.test.ts |
| getLedgerOverview              | GET /reports/{o}/{r}/overview               | green  | suites/compute-reads.integration.test.ts |

## journal (7)

| operationId             | path                                      | status | suite                                     |
| ----------------------- | ----------------------------------------- | ------ | ----------------------------------------- |
| getJournal              | GET /journal/{o}/{r}                      | green  | suites/compute-reads.integration.test.ts  |
| plaintextJournal        | GET /journal/{o}/{r}/plaintext            | green  | suites/compute-reads.integration.test.ts  |
| getAccountJournal       | GET /journal/{o}/{r}/account-journal      | green  | suites/compute-reads.integration.test.ts  |
| getContext              | GET /journal/{o}/{r}/context/{entry_hash} | green  | suites/compute-reads.integration.test.ts  |
| updateSourceSlice       | PUT /journal/{o}/{r}/source-slice         | green  | suites/compute-writes.integration.test.ts |
| deleteSourceSlice       | DELETE /journal/{o}/{r}/source-slice      | green  | suites/compute-writes.integration.test.ts |
| deleteMultiSourceSlices | DELETE /journal/{o}/{r}/source-slices     | green  | suites/compute-writes.integration.test.ts |

## shell (2)

| operationId    | path                          | status | suite                                    |
| -------------- | ----------------------------- | ------ | ---------------------------------------- |
| queryShell     | GET /shell/{o}/{r}/query      | green  | suites/compute-reads.integration.test.ts |
| queryShellText | GET /shell/{o}/{r}/query-text | green  | suites/compute-reads.integration.test.ts |

## entries (1)

| operationId    | path                       | status | suite                                     |
| -------------- | -------------------------- | ------ | ----------------------------------------- |
| addBulkEntries | POST /entries/{o}/{r}/bulk | green  | suites/compute-writes.integration.test.ts |

## legacy (1)

| operationId      | path                        | status | suite                                    |
| ---------------- | --------------------------- | ------ | ---------------------------------------- |
| getLegacyJournal | GET /legacy/journal/{o}/{r} | green  | suites/compute-reads.integration.test.ts |

## admin (5)

| operationId       | path                                | status | suite                            |
| ----------------- | ----------------------------------- | ------ | -------------------------------- |
| createUser        | POST /admin/users                   | green  | suites/admin.integration.test.ts |
| deleteUser        | DELETE /admin/users/{username}      | green  | suites/admin.integration.test.ts |
| editUser          | PATCH /admin/users/{username}       | green  | suites/admin.integration.test.ts |
| renameUser        | POST /admin/users/{username}/rename | green  | suites/admin.integration.test.ts |
| getLedgerByRepoId | GET /admin/ledgers/{id}             | green  | suites/admin.integration.test.ts |

## tokens / keys / collaborators / repo (10)

| operationId                     | path                                         | status | suite                                         |
| ------------------------------- | -------------------------------------------- | ------ | --------------------------------------------- |
| createUserToken                 | POST /tokens/{username}                      | green  | suites/tokens-keys.integration.test.ts        |
| createPublicKey                 | POST /keys                                   | green  | suites/tokens-keys.integration.test.ts        |
| listPublicKeys                  | GET /keys                                    | green  | suites/tokens-keys.integration.test.ts        |
| getPublicKey                    | GET /keys/{key_id}                           | green  | suites/tokens-keys.integration.test.ts        |
| deletePublicKey                 | DELETE /keys/{key_id}                        | green  | suites/tokens-keys.integration.test.ts        |
| listLedgerCollaborators         | GET /collaborators/{o}/{r}                   | green  | suites/collaborators-repo.integration.test.ts |
| getLedgerCollaboratorPermission | GET /collaborators/{o}/{r}/{collaborator}    | green  | suites/collaborators-repo.integration.test.ts |
| addOrUpdateLedgerCollaborator   | PUT /collaborators/{o}/{r}/{collaborator}    | green  | suites/collaborators-repo.integration.test.ts |
| deleteLedgerCollaborator        | DELETE /collaborators/{o}/{r}/{collaborator} | green  | suites/collaborators-repo.integration.test.ts |
| repoGetAllCommits               | GET /repo/{o}/{r}/commits                    | green  | suites/collaborators-repo.integration.test.ts |

## webhooks + ops (5)

| operationId                 | path                                  | status  | suite                               |
| --------------------------- | ------------------------------------- | ------- | ----------------------------------- |
| healthCheck                 | GET /healthz                          | green   | suites/healthz.integration.test.ts  |
| metrics                     | GET /metrics                          | pending | —                                   |
| webhookGiteaRepoPush        | POST /webhook/gitea/repo-push         | green   | suites/webhooks.integration.test.ts |
| webhookGiteaRepoCreate      | POST /webhook/gitea/repo-create       | green   | suites/webhooks.integration.test.ts |
| webhookGiteaPreReceiveCheck | POST /webhook/gitea/pre-receive-check | green   | suites/webhooks.integration.test.ts |

**Progress: ALL 75 rows green (100 parity tests / 12 suites) — the full live
surface is verified against the Python oracle: reads with strict envelope
comparison, writes with the byte-compare write rule, webhooks (incl. the
pre-receive directive check) with live decision comparison, plus a big-ledger
bake-off (~2k-directive bean-example) and a PLUGIN-BEHAVIOR book
(`plugin-book`, suites/plugin-parity.integration.test.ts) running all four
`fava.plugins.*` plugins — forecast (`[MONTHLY REPEAT n TIMES]`),
amortize_over (`amortize_months:` meta), link_documents (`document:` meta +
`#linked` tag), tag_discovered_documents — through both services: journal,
plaintext, statements, tags/links/documents, and BQL all strictly equal.**

Documented compute divergences (see also parity/README.md and normalize.ts):

- `queryShell` column NAMES differ (rustledger "sum" vs beanquery
  "sum(position)") — values/rows compared strictly (donor checklist risk #1).
- Invalid BQL: python 500 (generic handler) vs v2 structured 400 — deliberate.
- `getLegacyJournal`: python leaks `str(frozenset)` for document tags/links and
  `__tolerances__`/`__automatic__` meta; v2 emits clean arrays / omits them.
  Detailed-mode `entry_hash` is the engine's entry ID (V1 hash irreproducible).
- `addBulkEntries` input gaps: posting `cost`/`meta`, `custom`/`document` items
  are not renderable by the engine; backend-v2 never sends them.
- Unknown/unsupported plugins fail CLOSED on both services (one load error)
  but with different MESSAGE text: python emits the beancount import traceback
  (source {filename:"<load>",lineno:0}); v2 emits rustledger's clean
  "requires the python-plugins feature" (source null). beancount BUILTIN
  plugins implemented natively by rustledger (auto_accounts, implicit_prices —
  spot-verified strict-equal) are parity-tested; builtins rustledger does NOT
  implement would error on v2 while python executes them — visible, never a
  silent divergence.
- Numeric/date META literals: rustledger's wire stringifies them
  (`MetaValueJson` has no number/date variant), so v2's text renderer emits
  number/date-shaped strings UNQUOTED to match beancount's printer
  (`amortize_months: 3`). Caveat: a source meta value that was a QUOTED
  numeric string (`key: "3"`) round-trips to the unquoted literal.

## Cache semantics (suites/cache-parity.integration.test.ts)

Caching is a deliberate ARCHITECTURAL divergence — not wire-visible when both
caches are settled, but with different freshness guarantees:

- **python:** in-process `LRUCache[FavaLedger](50)` keyed `owner/repo`.
  Invalidated only by its own write routes (`clear()`) and by Gitea's
  `repo-push` webhook. If the webhook is not delivered, python serves STALE
  data after any out-of-band git push — indefinitely, until the next
  API write or webhook.
- **v2:** FileMap cache keyed by the repo HEAD commit SHA (HEAD resolved per
  read), so any commit is an automatic cache miss — freshness needs no
  webhook (`/webhook/gitea/repo-push` is an ack no-op). The parsed-snapshot
  cache additionally keys on local `today`, so forecast/amortize expansions
  roll over at midnight; python serves the load-time expansion until its
  cache is next cleared (untested — needs a midnight boundary; favorable
  to v2).

The suite proves the shared contract live: (1) out-of-band Gitea commit →
v2 fresh on the very next read, python fresh after the repo-push webhook is
delivered (the test plays Gitea's production role), then a strict dual-target
journal compare; (2) each service observes its OWN API write on the immediate
next read. Net: v2 is never staler than python; python is staler than v2
exactly in the webhook-delivery gap.

## Deliberately dropped (not implemented in v2)

backend-v2 never calls these and no other client exists (verified 2026-08-14,
callsite sweep of backend-v2 on main). Recorded here so the contract diff is
intentional, not an omission:

- `admin` system-webhook CRUD: createWebhook, listWebhooks, getWebhook,
  updateWebhook, deleteWebhook
- `user.getCurrentUserInfo` (GET /user/me), `user.searchUsers` (GET /user/search)
- `repo.repoListAllGitRefs` (GET /repo/{o}/{r}/git/refs)
- `tokens.listUserTokens`, `tokens.deleteUserToken`
