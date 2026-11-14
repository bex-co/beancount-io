# ADR028: Connect Bank with Plaid v2 — one connection per login, history-first categories, opt-in automatic import

- Status: Draft
- Date: 2026-11-10
- Owners: Product, backend-v2, dashboard
- Baseline: `main` at `c52b750fbd` (2026-11-09). Production builds backend-v2 from `main`, serves Plaid webhooks at `https://api.v3.beancount.io/api/plaid/webhook`, and has `PLAID_WEBHOOK_URL` set (owner confirmed 2026-11-10).
- Scope: Plaid bank connections from Link to ledger entry: connecting and reconnecting, duplicate detection, webhook intake, cursor sync, categorization, submission, and the background work that turns synced transactions into ledger entries. Out of scope: receipts (attaching a receipt to an imported entry is a separate change keyed on `import-id`), CSV and `bea` imports, institutions outside the US and Canada, and a mobile Plaid screen (mobile has none). It adds no roadmap items; only `/pm` writes the board.

## Context

A customer asked for unattended daily bookkeeping: receipts from an S3 inbox matched to Plaid-linked bank transactions, stored in Beancount.io, and pushed to their ERP. Walking that flow through the code raised three questions, and the answers were all worse than expected:

1. **Can connecting a bank be automated?** No, and it should not be: Plaid Link needs the account holder at the bank's login, MFA, and consent screens. Only the work after Link can be automated.
2. **Do transactions reach the ledger by themselves?** No. Synced transactions wait in a staging table until a person, or a client holding an API key, submits them.
3. **Can one customer connect several accounts at the same bank?** Only through one bank login. A second login at the same institution is refused.

Reading the code behind those answers also turned up correctness defects that are rare while a person submits every row, and would become systematic once background work submits.

### What exists today

![Plaid bank connections today: the dashboard links through Plaid Link and exchanges the token over GraphQL; signed webhooks are queued and processed every two minutes into a cursor sync that stages transactions in Postgres; nothing reaches the ledger until a person or API client submits. Red markers show gaps G1 to G9.](../images/ADR028-plaid-current-architecture.svg)

| Stage | As built |
| --- | --- |
| Link | [`createLinkToken`](../../backend-cluster/backend-v2/src/features/plaid/service/plaid-client.ts) asks for Transactions in the US and Canada and sets the webhook when `PLAID_WEBHOOK_URL` is configured. Update mode can enable account selection. Link, update-mode, and exchange mutations are GraphQL-only ([resolvers](../../backend-cluster/backend-v2/src/features/plaid/api/resolvers/plaid-resolver.mutation.ts)), and API keys are refused (`authorization-service.ts`). |
| Exchange | [`exchangePublicToken`](../../backend-cluster/backend-v2/src/features/plaid/service/plaid-item-service.ts) (lines 936–1039) exchanges the token, reads the Item, then refuses the link with `ConflictError` when the same user already has an Item for the same institution on the same ledger (lines 970–994). The refusal does not call `/item/remove`. Item and accounts are inserted without a database transaction. |
| Account mapping | `autoMapAccounts` (lines 865–934) saves LLM-suggested ledger accounts straight into `plaid_accounts.ledger_account`, unconfirmed, and swallows errors. |
| Webhook intake | [`POST /api/plaid/webhook`](../../backend-cluster/backend-v2/src/features/plaid/api/rest/plaid-webhook-handler.ts) verifies Plaid's ES256 JWT and queues the event in `plaid_webhook_events`. Each row gets a fresh `pwe_` ID, so `onConflictDoNothing` never deduplicates a redelivery. |
| Webhook processing | [Every two minutes](../../backend-cluster/backend-v2/src/scheduler/jobs/plaid-webhook-processor-job.ts), up to 50 events, five attempts. [`plaid-webhook-service.ts`](../../backend-cluster/backend-v2/src/features/plaid/service/plaid-webhook-service.ts) starts a sync for `SYNC_UPDATES_AVAILABLE`, `DEFAULT_UPDATE`, `INITIAL_UPDATE`, `HISTORICAL_UPDATE`, and `TRANSACTIONS_REMOVED` without awaiting it, then marks the event completed. `ITEM_LOGIN_REQUIRED`, `PENDING_EXPIRATION`, `PENDING_DISCONNECT`, and `ERROR` set `requires_reauth`; `LOGIN_REPAIRED` clears it. `NEW_ACCOUNTS_AVAILABLE` is logged and ignored. Rows stuck in `processing` are never picked up again. |
| Sync | [`plaid-sync-service.ts`](../../backend-cluster/backend-v2/src/features/plaid/service/plaid-sync-service.ts) takes a per-item lock that is the in-process [`async-lock`](../../backend-cluster/backend-v2/src/shared/lock/lock.ts), although the feature's `AGENTS.md` calls it distributed. It then pages `/transactions/sync`: added rows are inserted, modified rows updated (even after submission), removed rows hard-deleted (lines 532–545). `pending_transaction_id` is stored and never read. Login-required errors are detected by matching the message text (around line 624). |
| Fallback sync | The six-hourly `plaid-sync` job exists but is `enabled: false` ([`job-scheduler.ts`](../../backend-cluster/backend-v2/src/scheduler/job-scheduler.ts), lines 112–117). |
| Categorization | `suggestCategories` (`plaid-item-service.ts`, lines 590–639) sends each staged row's date, payee, name, and amount, plus the ledger's open accounts, to the LLM. It uses no ledger history and no quota. The dashboard ignores the returned confidence and applies every suggestion. The REST and MCP descriptions nevertheless say the suggestions are "drawn from the ledger's own history" ([`banks-handler.ts`](../../backend-cluster/backend-v2/src/features/ledger/api/rest/v1/banks-handler.ts) line 166, [`mcp-resources.ts`](../../backend-cluster/backend-v2/src/features/ai-agent/api/mcp-resources.ts) line 373). |
| Submit | Only request handlers call `submitTransactionsToLedger`: REST `banks-handler.ts:252`, GraphQL `plaid-resolver.mutation.ts:203`, MCP `bank-import-tool.ts:382`. [`buildBeancountTransaction`](../../backend-cluster/backend-v2/src/features/plaid/utils/plaid-mapper.ts) writes flag `!` for pending rows and `*` otherwise, and `import-id: "plaid:<transactionId>"`. A batch is refused when the ledger already holds one of its import IDs. Submit takes no lock, marks rows synced without a compare-and-set, and stores the batch's hash as every row's `ledger_entry_hash`. |
| Authorization | Background `plaid_webhook` and `plaid_scheduler` provenance is already admitted for sync, submit, and delete ([`authorization-service.ts`](../../backend-cluster/backend-v2/src/server/api/authorization/authorization-service.ts), lines 202–207 and 772–795), but [`authz/README.md`](../../backend-cluster/backend-v2/authz/README.md) (line 266) lists submit as session, OAuth, or API key only, and no code path submits in the background. |
| AI quota | The three Plaid LLM call sites run without the per-user quota check that other Path B consumers make; [ADR 011](./ADR011-backend-v2-ai-api-usage.md#follow-up-open) left that open. |

### Gaps

| # | Gap | Effect | Evidence |
| --- | --- | --- | --- |
| G1 | Duplicates are judged by institution | A second login at the same bank (personal and business, or two people) cannot be connected | `plaid-item-service.ts` 970–994 |
| G2 | A refused Item is not removed | The Item stays live at Plaid after the user is told it failed | same lines; `removeItem` is called only on unlink, ledger delete, and account delete |
| G3 | Nothing reaches the ledger without a request | Staged rows wait indefinitely; unattended books need a customer-run job | the three request-handler callers above |
| G4 | Categories are LLM guesses without history | Suggestions ignore what the user booked before; descriptions claim the opposite | `plaid-item-service.ts` 590–639; `banks-handler.ts` 166 |
| G5 | Pending and removed rows are mishandled | A submitted pending entry plus its posted replacement can be booked twice under different import IDs; a row removed after submission leaves its entry behind without notice | `plaid-sync-service.ts` 532–545; `plaid-mapper.ts` |
| G6 | Submission is not serialized | Two submits of the same row can both write; the lock only covers one process | `shared/lock/lock.ts`; `submitTransactionsToLedger` |
| G7 | The webhook path drops work | Failed syncs are not retried, redeliveries are not deduplicated, stuck rows are never reclaimed, and the fallback sync is off | `plaid-webhook-service.ts`; `job-scheduler.ts` 116 |
| G8 | Connections that need a person are silent | `requires_reauth` shows only on the bank card; `NEW_ACCOUNTS_AVAILABLE` is ignored; the sync's login-required check probably never matches a real Plaid error | `plaid-webhook-service.ts` 188–221; `plaid-sync-service.ts` ~624 |
| G9 | AI calls bypass quota, and mappings are saved unconfirmed | Plaid AI spend is uncapped per user; a wrong mapping silently misroutes every entry from that account | ADR 011 D4; `plaid-item-service.ts` 865–934 |

## Decision

Keep linking and reconnecting manual, fix the defects that background writes would amplify, and let each bank account opt in to automatic import of transactions the ledger's own history already explains.

![Plaid bank connections v2: duplicate checks by account with Item removal on refusal; webhooks deduplicated and retried, with reauth and new-account notices by email; sync and submit share the item lock; a new auto-import step submits posted, history-matched rows for opted-in accounts as the background principal; LLM suggestions only on request and within quota.](../images/ADR028-plaid-v2-architecture.svg)

### D1. A duplicate is an account, not an institution

Follow Plaid's guidance on [preventing duplicate Items](https://plaid.com/docs/link/duplicate-items/): compare accounts, and refuse before the public token is exchanged. Plaid describes a one-Item-per-institution check, as built today, and says it "is not recommended as the primary means of detecting duplicate Items".

An incoming account duplicates one already linked to this ledger when the first of these rules that applies says so:

1. **Both accounts carry a `persistent_account_id` and the values are equal.** Plaid fills this field only for depository accounts at institutions that use tokenized account numbers (Chase, PNC, and US Bank). There the account number changes with every link, but this identifier stays the same across Items ([accounts](https://plaid.com/docs/api/accounts/)).
2. **Otherwise, the institution, account name, and mask are all equal**, as Plaid recommends. Type and subtype must agree too, because Plaid notes that a mask "may be non-unique between an Item's accounts".
3. **When the incoming account has neither a name nor a mask,** Plaid's fallback applies: the same institution for the same user (`client_user_id` is our user ID) counts as a duplicate.

Any other link to the same institution creates a second Item.

- Check twice. Link's `onSuccess` callback returns metadata with the institution and each account's name, mask, type, and subtype, but the dashboard's launcher passes on only the public token today (`use-plaid-link-launcher.ts`). It sends the metadata with the exchange, so an obvious duplicate is refused without exchanging, as Plaid advises. That metadata comes from the client and has no `persistent_account_id`, so after the exchange the server checks again against `/accounts/get`, which is authoritative; a duplicate found there is removed (D2).
- `plaid_accounts` already stores each account's name, type, subtype, and mask. It gains `persistent_account_id`, so rule 1 can compare against accounts linked earlier.
- When the matching account belongs to an Item in `requires_reauth`, the refusal says to reconnect that bank (update mode), not to unlink it.
- Otherwise the refusal names the accounts already connected and points to Manage accounts.

Account-level checking protects the books as well as the bill. Plaid lists an account linked more than once as a cause of duplicate transactions, because each Item then reports the same activity ([troubleshooting](https://plaid.com/docs/transactions/troubleshooting/)). Bank submissions are deduplicated by `import-id`, which is Plaid's `transaction_id`, and Plaid does not document that those IDs agree across Items, so the ledger check cannot be relied on to stop the second copy. Plaid also warns that duplicate Items "may cause you to be charged multiple times for the same Item".

### D2. Never leave an Item behind

Every path that discards an Item after the exchange calls `/item/remove` first: a duplicate refusal, a failure to save, and `USER_PERMISSION_REVOKED`. The Item row and its account rows are inserted in one database transaction, so a half-saved link cannot exist. Items orphaned before this change are found once by comparing Plaid's Dashboard with `plaid_items` (open question 5).

### D3. The webhook path does not drop work

- Store the SHA-256 of each delivery's raw body and keep it unique while the row is retained, so a redelivery is acknowledged and dropped.
- The processor awaits the sync it starts. A failed sync fails the event, which the existing backoff retries.
- Rows left in `processing` for more than 15 minutes return to `pending`.
- Read login-required and other Item errors from Plaid's `error_code`, not from the message text.
- Enable the six-hourly fallback sync. It runs under the same per-item lock and catches any webhook that never arrived.

### D4. Categories come from the ledger's history first

Port the rule the customer import skill already follows, [`categorization.md`](../../skills/beancount-import/references/categorization.md), to the hosted path, so both importers suggest the same account for the same merchant:

1. Collect earlier transactions that post to the row's mapped ledger account, with their payee and counter-account.
2. Match the row's payee: exact or prefix merchant match is strong; overlap on distinctive words is medium.
3. Take the most frequent counter-account among the matches, ties broken by recency.
4. Grade it as that file does: **high** is at least two consistent priors on a strong match; **medium** is one prior, a weak match, or inconsistent priors; **low** is no usable prior.

Every suggestion carries `source` (`history` or `ai`), `tier`, and the number of priors. The LLM is consulted only for rows without a high or medium history match and only when someone asks, and it then receives recent history as examples, as the general suggestion path already does (the `recentExamples` that `suggestCategories` in `llm-service.ts` collects). The REST and MCP descriptions are corrected to match.

### D5. Automatic import is opt-in per bank account and history-only

Each bank account gets `autoImport` (`off` or `history`, default `off`) and an optional `targetFile` (must already exist; default `main.bean`). After every sync of an Item, whether from a webhook, the fallback job, or a manual request, the service submits the staged rows that meet all of these:

- the account has `autoImport = history`, a ledger mapping, and a currency;
- the row is posted, not pending;
- the row's D4 suggestion is `history` at the high tier.

Everything else stays staged for review. LLM suggestions are never imported automatically, whatever their confidence.

Background submission runs as the `PlaidBackgroundPrincipal` with the provenance of the sync that triggered it (`plaid_webhook` or `plaid_scheduler`). The policy already admits it; this record makes that the intended policy and corrects `authz/README.md`. As with background sync, the service re-derives the Item's user and ledger and checks the user's current ledger write relationship before writing; a user who lost write access gets no automatic entries. A manual sync submits under the requesting identity. Automatically imported entries carry `import-rule: "history"` beside `import-id`, so they can be found and audited.

### D6. Pending and removed transactions neither double-book nor vanish

- When a posted row arrives whose `pending_transaction_id` names a row already submitted, sync does not stage it. It updates the existing entry in place: flag `!` becomes `*`, the date and amount follow the posted row, `import-id` becomes the posted ID, and the pending ID moves to `import-id-2`, the key the `bea` import path already reads. The posted row is marked synced.
- A row Plaid removes after it was submitted is kept with state `removed_after_import` and listed for review. The ledger entry is never deleted automatically.

### D7. One writer per Item at a time

Manual and automatic submission take the same per-item lock as sync. Marking a row synced is a compare-and-set on `synced_to_ledger = false`, and a row that loses the race is skipped. Each row stores its own entry hash from the bulk write, which D6's in-place update needs.

The lock stays in-process. That is correct while backend-v2 runs as one instance, as production and the bex Blueprint do today; moving it to Redis is a prerequisite for running more than one, and the Plaid `AGENTS.md` says so instead of "distributed".

### D8. Tell the owner when a connection needs them

Items gain `needsAttention`: `reauth` (set by `ITEM_LOGIN_REQUIRED`, `PENDING_EXPIRATION`, `PENDING_DISCONNECT`, or `ERROR`) or `new_accounts` (set by `NEW_ACCOUNTS_AVAILABLE`), cleared by `LOGIN_REPAIRED` or a completed update-mode Link with account reconciliation. Each transition into a needs-attention state sends one transactional email to the Item's user through SendGrid, claimed once per transition the way billing emails are, and the dashboard shows a banner. Reconnecting still needs the account holder in Plaid Link; this decision makes sure someone knows to do it.

### D9. AI runs on request, inside quota

Once implemented, this closes the Plaid follow-up in [ADR 011](./ADR011-backend-v2-ai-api-usage.md#follow-up-open). Background paths, meaning auto-import and post-link setup, never call the LLM. Category and account-mapping suggestions call it only when someone asks; they check `aiCfoUsageService` first and record usage afterward, like the other Path B consumers. `autoMapAccounts` stops saving its guesses: the dashboard presents them for confirmation, as its Accept all button already allows. Auto-import trusts the account mapping, so an unconfirmed guess there would misroute every automatic entry from that account.

### What stays manual

Connecting a bank, reconnecting it, confirming account mappings, turning on auto-import, and reviewing every row that history does not explain.

## Consequences

- With auto-import on, a purchase from a merchant the user has booked before reaches the ledger minutes after the bank posts it, without a person and without AI cost.
- New or ambiguous merchants, pending rows, and accounts without a mapping still wait for review. Auto-import shrinks the queue; it does not empty it.
- A second login at the same bank can be connected. Linking an account twice is refused with a message naming the account.
- No refused or half-saved link leaves an Item at Plaid.
- Users learn by email when a bank needs reconnecting or has new accounts to share.
- Plaid AI spend becomes subject to each user's quota. Users who relied on unmetered suggestions may hit their limit sooner.
- Background work now writes ledger entries. The `import-rule` key and the audit log identify them.
- The receipt-reconciliation scenario gets simpler: the customer's job no longer submits bank rows; it only attaches receipts to entries by `import-id` and pushes to the ERP.

## API parity

| Capability | REST | GraphQL | MCP |
| --- | --- | --- | --- |
| Set `autoImport` and `targetFile` (new) | `PUT …/bank-accounts/{accountId}/auto-import` | `updatePlaidAccountAutoImport` | `setBankAccountAutoImport` |
| Read `autoImport`, `targetFile` on bank accounts | existing account reads | existing account reads | existing account reads |
| Read `needsAttention` on bank connections | existing bank reads | existing bank reads | `listBankConnections` and the bank resources |
| Suggestions with `source`, `tier`, prior count | `GET …/bank-transactions/suggested-categories` | `suggestPlaidTransactionCategories` | `bankSuggestedCategories` resource |
| Staged rows with `state` (`staged`, `removed_after_import`) | `GET …/bank-transactions/unsynced` | `getUnsyncedPlaidTransactions` | `listStagedBankTransactions` |

The new setting uses the same authority as the existing account-mapping update. Link, update mode, and exchange stay GraphQL-only under their documented ceremony exception; the exchange gains an optional Link-metadata argument and a clearer conflict message. Automatic import is background behavior, not a customer operation.

## Implementation outline

| Change | Where |
| --- | --- |
| Link metadata passed with the exchange; account-level duplicate check; `persistent_account_id` stored; `/item/remove` on refusal; one transaction for Item and accounts (D1, D2) | `dashboard/src/features/plaid/pages/plaid-settings/hooks/use-plaid-link-launcher.ts` and `use-plaid-token-exchange.ts`, `plaid-resolver.mutation.ts`, `plaid-item-service.ts` `exchangePublicToken`, `plaid-client.ts`, `plaid-account-model` schema and migration |
| Body-hash deduplication, awaited sync, stuck-row reclaim, `error_code` checks, fallback job on (D3) | `plaid-webhook-handler.ts`, `plaid-webhook-event-model`, `plaid-webhook-service.ts`, `plaid-webhook-processor-job.ts`, `plaid-sync-service.ts`, `job-scheduler.ts` |
| History categorizer and corrected descriptions (D4) | new `features/plaid/utils/history-categorizer.ts`, `plaid-item-service.ts` `suggestCategories`, `banks-handler.ts`, `mcp-resources.ts` |
| `auto_import` and `target_file` columns, the setting on three surfaces, the post-sync import step, and policy docs (D5) | `plaid-account-model` schema and migration, `plaid-sync-service.ts`, `banks-handler.ts`, `plaid-resolver.mutation.ts`, `bank-import-tool.ts`, `authz/README.md`, `features/plaid/AGENTS.md` |
| Pending carry-over and `removed_after_import` state (D6) | `plaid-sync-service.ts`, `plaid-transaction-model` schema and migration |
| Lock and compare-and-set on submit; per-row entry hash (D7) | `plaid-sync-service.ts` `submitTransactionsToLedger`, `plaid-transaction-model` |
| `needs_attention`, the email, and the banner (D8) | `plaid-item-model` schema and migration, `plaid-webhook-service.ts`, a new email template, `dashboard/src/features/plaid/pages/plaid-connections/` |
| Quota gating and confirmed mappings (D9) | the three LLM call sites in `plaid-item-service.ts`, `dashboard/src/features/plaid/pages/plaid-connections/components/account-mapping-form.tsx` |

Order: D2, D3, and D7 first, because they fix correctness without changing the product; then D1 and D6; then D4, whose history suggestions are visible in review before anything writes automatically; then D5; then D8 and D9.

Tests cover each gap's failure case: a second login with disjoint accounts accepted and an overlapping one refused with `/item/remove` called; an account matched by `persistent_account_id` although its mask changed; a redelivered webhook dropped; a failed sync retried; pending-then-posted producing one entry; concurrent manual and automatic submits writing once; a high-tier history row imported and a medium-tier or AI row left staged; a user without write access getting no automatic entry; one email per transition; and LLM calls refused over quota. End to end, the Plaid sandbox can fire `SYNC_UPDATES_AVAILABLE` and `NEW_ACCOUNTS_AVAILABLE` (`/sandbox/item/fire_webhook`) and force a reauth (`/sandbox/item/reset_login`); [w2/blocked/009](../../.pm/w2/blocked/009.md) records why that journey is not yet runnable against the hosted QA account.

## Alternatives considered

- **Let customers' own jobs submit through the API.** It works today with an API key, and it stays valid for customer-specific rules. As the product answer it is rejected: it inherits LLM-only categories, and every customer would rebuild the same job.
- **Auto-submit LLM suggestions above a confidence threshold.** The confidence is the model's own estimate, uncalibrated, and the dashboard already ignores it. Rejected.
- **Drop the duplicate check.** Two Items on one account produce different transaction IDs, so double entries would pass the ledger's import-ID check. Rejected.
- **A unique index on ledger and institution.** It would make G1 permanent. Rejected.
- **Plaid's own transaction categories.** A bank's taxonomy is not the user's chart of accounts; `categorization.md` forbids using it. Rejected.
- **Auto-import on by default.** It would write to people's books without their consent. Rejected in favor of a per-account opt-in.
- **A Redis lock now.** Deferred: one instance runs today. It becomes required before scaling out (D7).

## Open questions

1. **Threshold.** Is the high tier (at least two consistent priors) strict enough for automatic writes, or should auto-import require three?
2. **Backlog.** When auto-import is switched on, should the rows already staged be imported too, after a preview, or only new arrivals?
3. **Inflows.** Should refunds and income be auto-imported when history matches, subject to `categorization.md`'s directional check, or outflows only?
4. **Reminders.** Is one email per transition enough, or should a reconnect reminder repeat after seven days?
5. **Orphans.** Who compares Plaid's Dashboard Items with `plaid_items` once and removes what leaked before D2?
6. **Visibility.** Should automatic entries also carry a tag, so they show in the journal without opening metadata?

## Related findings not decided here

- Access tokens are encrypted with a key derived from `AUTH_SECRET` (`features/plaid/utils/encryption.ts`), so rotating that secret would make every stored token unreadable.
- GraphQL bank mutations have no `dryRun` ([w1/211](../../.pm/w1/211.md)), and a failed dry-run sync writes a sync log ([w1/189](../../.pm/w1/189.md)).
