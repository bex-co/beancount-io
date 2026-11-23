# ADR028: Plaid auto-import v2 and receipt matching — whichever arrives first is recorded, the other is matched to it

- Status: Draft
- Status notes: Moved back to Draft by the owner. Revised 2026-11-21: retitled from "Connect Bank with Plaid v2"; adds the user journeys (J1–J12) with wireframes, D10 (matching inside both writes), D11, D12, and D13; D4 now covers payee and narration, and amends the scope, D5, and D7.
- Date: 2026-11-10
- Owners: Product, backend-v2, dashboard, mobile
- Baseline: `main` at `c52b750fbd` (2026-11-09). Production builds backend-v2 from `main`, serves Plaid webhooks at `https://api.v3.beancount.io/api/plaid/webhook`, and has `PLAID_WEBHOOK_URL` set (owner confirmed 2026-11-10).
- Scope: Plaid bank connections from Link to ledger entry: connecting and reconnecting, duplicate detection, webhook intake, cursor sync, categorization, submission, and the background work that turns synced transactions into ledger entries; and the matching inside both writes, bank submission and `insertReceiptTransaction`, that keeps a bank transaction and its receipt to one entry in whichever order they arrive. Out of scope: receipt intake from an inbox or email, receipt parsing, ERP sync, CSV and `bea` imports, institutions outside the US and Canada, and a mobile Plaid screen (mobile has none). It adds no roadmap items; only `/pm` writes the board.

## Context

A customer asked for unattended daily bookkeeping: receipts from an S3 inbox matched to Plaid-linked bank transactions, stored in Beancount.io, and pushed to their ERP. Walking that flow through the code raised four questions, and the answers were all worse than expected:

1. **Can connecting a bank be automated?** No, and it should not be: Plaid Link needs the account holder at the bank's login, MFA, and consent screens. Only the work after Link can be automated.
2. **Do transactions reach the ledger by themselves?** No. Synced transactions wait in a staging table until a person, or a client holding an API key, submits them.
3. **Can one customer connect several accounts at the same bank?** Only through one bank login. A second login at the same institution is refused.
4. **Is a receipt that arrives before its bank transaction matched later?** No. Bank submission checks only whether the ledger already holds a row's `import-id`, and an entry made from a receipt has none, so the bank row books the purchase a second time.

Reading the code behind the first three answers also turned up correctness defects that are rare while a person submits every row, and would become systematic once background work submits.

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
| Submit | Only request handlers call `submitTransactionsToLedger`: REST `banks-handler.ts:252`, GraphQL `plaid-resolver.mutation.ts:203`, MCP `bank-import-tool.ts:382`. [`buildBeancountTransaction`](../../backend-cluster/backend-v2/src/features/plaid/utils/plaid-mapper.ts) writes flag `!` for pending rows and `*` otherwise, and `import-id: "plaid:<transactionId>"`. The payee is Plaid's `merchant_name`, often empty, and the narration is Plaid's `name`, the bank's raw descriptor, both copied as they are. Sync keeps only the date, amount, `merchant_name`, `name`, category, and pending state of each transaction ([schema](../../backend-cluster/backend-v2/src/features/plaid/data/plaid-transaction-model/schema.ts)); the purchase date, location, payment channel, and check number that Plaid also returns are dropped. A batch is refused when the ledger already holds one of its import IDs. Submit takes no lock, marks rows synced without a compare-and-set, and stores the batch's hash as every row's `ledger_entry_hash`. |
| Receipts | [`insertReceiptTransaction`](../../backend-cluster/backend-v2/src/features/ledger/workflow/ledger-receipt-workflow.ts), which the dashboard's receipt page calls, always writes a new `*` entry with the receipt: S3 storage puts its URL in `receipt` metadata, and git storage commits the file with a `document` directive and a `^rcpt_` link. It never looks for a bank entry the receipt belongs to. Mobile receipt capture does not call it at all: it writes through the generic `addEntries` and keeps no receipt file ([`use-receipt-workflow.ts`](../../mobile/src/screens/receipt-capture-screen/use-receipt-workflow.ts), line 192). Bank submission never looks at receipt entries either: `assertNotAlreadyImported` (`plaid-sync-service.ts`, lines 895–935) compares `import-id` values only. |
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

## User journeys

Each journey says what the owner does, what happens today, and which decision changes it. Only the ledger's owner or an administrator can connect and manage banks, today and after. Three wireframes show the screens the journeys pass through; they fix what each screen must let the owner do, not its visual design.

### J1. Connect a bank with several accounts

1. The owner clicks Connect bank and signs in at the bank inside Plaid Link, where they choose which accounts to share, for example a checking and a savings account.
2. Each shared account appears under the bank with a suggested ledger account and a currency. Today the suggestion is saved without being confirmed (G9). After D9 it is only a suggestion until the owner accepts it, one by one or with Accept all. When the suggested account does not exist in the ledger yet, accepting it opens the account (D12).
3. The owner makes one import choice for each account (D5, D12):
   - **Don't import**: nothing is fetched for this account.
   - **Import for review**, the default: every transaction waits for the owner to categorize and confirm it.
   - **Import what I've booked before**: merchants the owner has booked before, and matches to a receipt or a transfer, are booked; the rest waits for the owner.
   - **Import everything, AI categorizes the rest**: what is not recognized is categorized by AI and booked flagged `!`, until the owner confirms it.

   The two automatic options need an accepted ledger account and a currency.
4. From then on, each account's transactions follow J4.

Two bank accounts cannot map to the same ledger account (D11).

![Wireframe of the bank connections page: a reconnect banner; one card per bank login, each listing its accounts with a ledger account, a currency, and one import choice of four (don't import, import for review, import what I've booked before, or import everything with AI categorizing the rest); a suggested ledger account that does not exist yet is created when accepted; a second login at the same bank and another bank appear as their own cards; a repeated account is refused by name.](../images/ADR028-wireframe-bank-connections.svg)

### J2. Connect a second login or another bank

A second bank is connected the same way. A second login at a bank already connected, such as a business login beside a personal one, is refused today (G1). After D1 it is accepted when its accounts are new, and refused, with the accounts already connected named, when it would link the same account twice. A refused or half-saved link leaves nothing behind at Plaid (D2).

### J3. Add or remove accounts later

The owner opens Manage accounts on a connected bank, which reopens Plaid Link in update mode to change the shared accounts; the account list is then reconciled. When the bank itself reports new accounts, nothing tells the owner today (G8). After D8 they get one email and a banner that lead to the same Manage accounts step. Newly shared accounts start at J1 step 2.

### J4. A day with automatic import on

1. The bank posts a transaction. Plaid notifies the backend, which syncs it within minutes; a six-hourly sync catches a missed notification (D3).
2. The row is matched first (D10): if a receipt entry or the other side of a transfer already records it, the row completes that entry.
3. Otherwise, when the ledger's history explains the merchant with high confidence, the row is added with that category (D4, D5).
4. What is left depends on the account's choice. Under "Import what I've booked before" it waits in the review list (J5). Under "Import everything" AI categorizes it and it is booked flagged `!`, to be confirmed in J5; when the owner's AI quota is used up, it waits instead.
5. Pending transactions wait for their posted version under every choice.

Today every row stops at step 1 until someone submits it (G3).

### J5. Review what was not imported

The owner opens the bank transactions page. Each staged row shows a suggested category: from history first, at no AI cost, and from the LLM only when the owner asks and has quota left (D4, D9). The owner sets targets one by one or in bulk, submits the rows they want, and discards the rest. Entries that AI booked are listed apart, already in the ledger and flagged `!`: the owner confirms them or corrects the category, which clears the flag, and a merchant confirmed twice is from then on booked from history without AI. Rows that D10 could not decide show their candidates, and the owner resolves each one as the same purchase as a candidate or as a new entry. A manual submit runs the same matching as automatic import, so it cannot double-book a receipt either.

![Wireframe of the bank transactions page: a summary of what automatic import did; rows that need a decision, each with its candidate entries and the choices Same purchase or New entry; rows to categorize with history or AI suggestions, bulk targets, submit and discard; entries booked by AI that wait to be confirmed; and the rows imported automatically, each saying why and offering an undo.](../images/ADR028-wireframe-bank-review.svg)

### J6. A receipt and its bank transaction, in either order

A card purchase reaches the books from two sources: the bank transaction Plaid syncs, and the receipt the customer photographs, drops on the receipt page, or leaves in an inbox. They arrive in either order, often days apart. Whichever arrives first becomes the entry; whichever arrives second completes it. The ledger ends with one entry either way.

No client decides which case it is in, because no client can know what arrived first. Each write looks before it adds: bank submission looks for the receipt entry, and `insertReceiptTransaction` looks for the bank entry. The dashboard, mobile, an inbox job, and an MCP agent all make the same single call for a receipt.

![Whichever arrives first is recorded. Bank first: auto-import adds the posted transaction, and the receipt later attaches to it. Receipt first: the receipt is inserted, and the bank transaction later merges into it, taking the bank's amount. Cash receipts and bank rows without a receipt stay single entries. Uncertain matches are flagged with ! and wait for review.](../images/ADR028-first-recorded-second-matched.svg)

1. **Bank first.** Auto-import adds the posted transaction as a `*` entry with its `import-id` (D5). When the receipt arrives, `insertReceiptTransaction` finds that entry and adds the receipt to it instead of writing a new one (D10).
2. **Receipt first.** `insertReceiptTransaction` finds no bank entry and writes a `*` entry with the receipt and no `import-id`, as it does today. When the bank transaction posts, auto-import finds that entry and merges into it instead of adding a second one: it adds the `import-id`, and the amount follows the bank's, so a tip added after the receipt was printed is booked (D10).
3. **One side only.** A cash receipt's entry is final. A bank transaction without a receipt is final too. That is the common case, and nobody is reminded.
4. **Exceptions.** When a match is not certain, nothing is merged: a bank row stays staged for review, and a receipt is written as its own entry, flagged `!`, with its candidates listed. This covers two or more candidates, a split entry whose amounts differ from the bank's, a hand-entered entry that looks like the same purchase, a receipt on a bank-fed account still unmatched after N days (open question 10), and a merged bank transaction that Plaid later removes (D6). Once the owner resolves it, the flag returns to `*`.

The receipt page and the mobile screen keep their upload and review steps and show one of three results after Record:

![Wireframe of the receipt page after Record, with three results: added to an existing card transaction, keeping the bank's amount; recorded as a new entry that the bank transaction will complete; or recorded and flagged, asking which of two card transactions it belongs to. Each result offers an undo.](../images/ADR028-wireframe-receipt-result.svg)

Both sides write `*`. A receipt is evidence of a real purchase, and Beancount counts `*` and `!` alike in every balance, so the flag is only a signal to a person. Flagging every receipt entry while it waits for its bank row would bury the exceptions that need one. Whether an entry still waits is read from its metadata instead: it carries a receipt, sits on a mapped account, and has no `import-id`.

### J7. A transfer between two linked accounts

The owner moves money from checking to savings, or pays a card from checking. Each account reports its own side. Today both sides can be booked, so the transfer appears twice. After D11 the second side completes the entry the first side made, and the transfer is booked once.

### J8. A pending transaction posts, or the bank removes one

Automatic import ignores pending rows. An owner who submits a pending row by hand gets a `!` entry; today its posted version books a second entry (G5). After D6 the posted version updates that entry in place. When the bank removes a transaction that was already imported, the entry stays and the row is listed for review; today the row vanishes and the entry is left behind without notice.

### J9. The bank needs a new sign-in

Banks expire consent or ask for a new login. Today the only sign is a status on the bank's card (G8), and automatic work quietly stops. After D8 the owner gets one email and a banner, clicks Reconnect, and signs in again through Plaid Link in update mode. Syncing resumes from where it stopped, and nothing is imported twice (D10 step 1).

### J10. Disconnect a bank

The owner disconnects a bank from its card. The Item is removed at Plaid, the staged rows go with it, and every entry already in the ledger stays, with its `import-id`. Reconnecting the same accounts later stages their recent transactions again; those already in the ledger are recognized by `import-id` and skipped (D10 step 1) instead of refusing the whole batch as today.

### J11. An API key or an MCP agent

A script or an agent cannot connect or reconnect a bank: that needs the account holder in Plaid Link. With a write credential on a ledger whose bank is connected, it can read the banks and their attention state, turn automatic import on or off, list staged rows with their suggestions, submit or discard them, resolve matches, and record receipts through `insertReceiptTransaction`, all with the results the dashboard gets (see API parity).

### J12. The owner loses write access

Automatic import writes on behalf of the Item's user. Before each background write the service checks that user's current write access to the ledger; a user who lost it gets no automatic entries, and their rows stay staged (D5).

## Decision

Keep linking and reconnecting manual, fix the defects that background writes would amplify, let each bank account opt in to automatic import, by default only of transactions the ledger's own history already explains, and complete the receipt or transfer entry that arrived first instead of adding a second entry.

![Plaid bank connections v2: duplicate checks by account with Item removal on refusal; webhooks deduplicated and retried, with reauth and new-account notices by email; sync and submit share the item lock; a new auto-import step first matches posted rows to receipt or transfer entries already booked, then submits history-matched rows for opted-in accounts as the background principal; LLM suggestions on request, or in the background only for accounts whose owner chose to let AI book the rest, always within quota.](../images/ADR028-plaid-v2-architecture.svg)

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

### D4. Categories, payees, and narrations come from the ledger's history first

Port the rule the customer import skill already follows, [`categorization.md`](../../skills/beancount-import/references/categorization.md), to the hosted path, so both importers suggest the same account for the same merchant:

1. Collect earlier transactions that post to the row's mapped ledger account, with their payee and counter-account.
2. Match the row's payee: exact or prefix merchant match is strong; overlap on distinctive words is medium.
3. Take the most frequent counter-account among the matches, ties broken by recency.
4. Grade it as that file does: **high** is at least two consistent priors on a strong match; **medium** is one prior, a weak match, or inconsistent priors; **low** is no usable prior.

Every suggestion carries `source` (`history` or `ai`), `tier`, and the number of priors. The LLM is consulted only for rows without a high or medium history match and only when someone asks, and it then receives recent history as examples, as the general suggestion path already does (the `recentExamples` that `suggestCategories` in `llm-service.ts` collects). The REST and MCP descriptions are corrected to match.

The same match supplies the payee and the narration, so one merchant is written one way throughout the books:

| Field | First | Then | Otherwise |
| --- | --- | --- | --- |
| Payee | The spelling the matched history entries use most | The merchant name the LLM cleans out of the bank's descriptor, when the LLM is consulted | Plaid's `merchant_name`, else empty |
| Narration | The narration the matched history entries share, when they agree | A short description from the LLM, when it is consulted and the bank's fields support one | Empty |

The LLM writes these in the same call that suggests the category, so they cost no extra quota, and only from the fields the bank sent: it never states what was bought when the descriptor does not say. History always wins over the LLM, and a payee the owner has confirmed becomes history. The owner can edit both fields in review before submitting. The bank's descriptor is data, never an instruction, as `dedup.md` and the import skill treat imported text.

### D5. Automatic import is opt-in per bank account and history-first

Each bank account gets `autoImport` (`off`, `history`, or `all`, default `off`) and an optional `targetFile` (must already exist; default `main.bean`). After every sync of an Item, whether from a webhook, the fallback job, or a manual request, the service submits the staged rows that meet all of these:

- the account has `autoImport` set to `history` or `all`, a ledger mapping, and a currency;
- the row is posted, not pending;
- D10 found nothing to complete, and the row's D4 suggestion is `history` at the high tier.

D10 runs first, as dedup runs before categorization in `dedup.md`. A row that D10 merges into an existing entry needs no category, because that entry already has one; a row that D10 sends to review is not imported.

What happens to the remaining rows depends on the setting:

- Under `history`, they stay staged for review. No LLM suggestion is imported, whatever its confidence.
- Under `all`, the LLM categorizes each remaining row, proposing its payee and narration in the same call (D4), and it is booked with flag `!` and `import-rule: "ai"`. The flag is the difference from the rejected alternative of trusting the model's confidence: nothing the model chose counts as settled until the owner confirms it or corrects it, which sets the flag to `*`. A confirmed entry is ordinary history, so a merchant confirmed twice reaches the high tier and stops needing the model. These calls are charged to the owner's AI quota (D9); when it is used up, the rows stay staged, as under `history`.

`all` is never a default and is never switched on for the owner. A new ledger has no history, so under `history` its first transactions all wait for review; the account's choice says so when it is made.

Background submission runs as the `PlaidBackgroundPrincipal` with the provenance of the sync that triggered it (`plaid_webhook` or `plaid_scheduler`). The policy already admits it; this record makes that the intended policy and corrects `authz/README.md`. As with background sync, the service re-derives the Item's user and ledger and checks the user's current ledger write relationship before writing; a user who lost write access gets no automatic entries. A manual sync submits under the requesting identity. Automatically imported entries carry `import-rule` beside `import-id`: `"history"`, `"match"` for an entry a background merge completed, or `"ai"`, so each can be found and audited.

### D6. Pending and removed transactions neither double-book nor vanish

- When a posted row arrives whose `pending_transaction_id` names a row already submitted, sync does not stage it. It updates the existing entry in place: flag `!` becomes `*`, the date and amount follow the posted row, `import-id` becomes the posted ID, and the pending ID moves to `import-id-2`, the key the `bea` import path already reads. The posted row is marked synced.
- A row Plaid removes after it was submitted is kept with state `removed_after_import` and listed for review. The ledger entry is never deleted automatically.

### D7. One writer at a time, per Item and per ledger

Manual and automatic submission take the same per-item lock as sync. Marking a row synced is a compare-and-set on `synced_to_ledger = false`, and a row that loses the race is skipped. Each row stores its own entry hash from the bulk write, which D6's in-place update needs.

Matching and writing (D10, D11) are serialized per ledger as well, after the item lock, because a receipt write and a bank row from any Item can target the same entry: submission and `insertReceiptTransaction` take one per-ledger lock around matching and writing. A merge also edits through the source-slice update with the entry's `sha256sum`, so a change made outside the lock fails the edit and the row is matched again.

The lock stays in-process. That is correct while backend-v2 runs as one instance, as production and the bex Blueprint do today; moving it to Redis is a prerequisite for running more than one, and the Plaid `AGENTS.md` says so instead of "distributed".

### D8. Tell the owner when a connection needs them

Items gain `needsAttention`: `reauth` (set by `ITEM_LOGIN_REQUIRED`, `PENDING_EXPIRATION`, `PENDING_DISCONNECT`, or `ERROR`) or `new_accounts` (set by `NEW_ACCOUNTS_AVAILABLE`), cleared by `LOGIN_REPAIRED` or a completed update-mode Link with account reconciliation. Each transition into a needs-attention state sends one transactional email to the Item's user through SendGrid, claimed once per transition the way billing emails are, and the dashboard shows a banner. Reconnecting still needs the account holder in Plaid Link; this decision makes sure someone knows to do it.

### D9. AI runs on request, inside quota

Once implemented, this closes the Plaid follow-up in [ADR 011](./ADR011-backend-v2-ai-api-usage.md#follow-up-open). Background paths, meaning auto-import and post-link setup, call the LLM in one case only: an account whose owner chose `autoImport = all` (D5). Otherwise category and account-mapping suggestions call it only when someone asks. Every call, in the background or on request, checks the quota first and records usage afterward; the checks go through `aiCfoUsageService`, like the other Path B consumers. `autoMapAccounts` stops saving its guesses: the dashboard presents them for confirmation, as its Accept all button already allows. Auto-import trusts the account mapping, so an unconfirmed guess there would misroute every automatic entry from that account.

### D10. Match before create: the second arrival completes the first

One matcher serves both sides, so they never disagree about whether two records are the same purchase. It follows the customer import skill's dedup layers ([`dedup.md`](../../skills/beancount-import/references/dedup.md)) with one difference: a confirmed match writes the bank row's `import-id` onto the existing entry, so the next import matches it exactly instead of fuzzily. The skill's workflows only append, so they leave that ID unwritten and the same review can recur.

**Bank side.** Before automatic or manual submission adds a row, it checks the ledger in this order and stops at the first hit:

| Step | The ledger holds | Then |
| --- | --- | --- |
| 1 | The row's `import-id`, or the same value under `import-id-2` | Already imported: mark the row synced and write nothing. A batch is no longer refused for it. |
| 2 | An entry made from a receipt: it posts to the row's mapped account, the bank amount is 100–125% of that posting's amount, it is dated from five days before to one day after the bank's posting date, it has no `import-id`, and it carries a receipt (`receipt` metadata or a `^rcpt_` link) | Exactly one: merge into it. More than one: review. |
| 3 | The other side of a transfer (D11) | Exactly one: merge into it. More than one: review. |
| 4 | An entry without `import-id` metadata that posts the same amount to the row's mapped account within three days, with a similar description (entered by hand, or older than the convention) | Review, never automatic: a wrong merge loses a real transaction and a wrong add books one twice, as `dedup.md` warns. |
| 5 | None of these | Add a new entry, categorized and gated by D4 and D5. |

A merge into a receipt entry edits that entry through the source-slice update. It adds `import-id`, `import-rule: "match"`, and `bank-date` (the bank's posting date). It sets the posting on the mapped account to the bank's amount, and the counter posting with it when there is exactly one. It keeps the receipt's date, payee, narration, category, and document. An entry with more than one counter posting keeps its amounts, and when they differ from the bank's it is flagged `!` for review. The bank row is marked synced with that entry's hash. Each merge is one commit, whose sha the submit result reports, so `revertCommit` undoes it.

**Receipt side.** `insertReceiptTransaction` runs the same matcher before it writes. Candidates are entries that carry an `import-id` and no receipt, post to the account of the receipt's payment posting, and pass the same tolerance and date window seen from the receipt's side.

| Candidates | Then |
| --- | --- |
| Exactly one | The receipt is added to that entry: under git storage the file is committed with a `document` directive and the entry gains the `^rcpt_` link, under S3 storage the entry gains `receipt` metadata, and the input's `meta` is written onto it in the same edit. The entry keeps the bank's amounts, date, payee, and category; the receipt's postings are not written. |
| None | A new `*` entry, as today. |
| More than one | A new entry flagged `!`, with `receipt-candidates` metadata naming the candidates' entry hashes, listed for review. Resolving it as the same purchase as one candidate moves the receipt onto that entry and removes the receipt's own entry, in one commit; resolving it as a separate purchase clears the flag and the metadata. |

The result reports `outcome` (`attached`, `inserted`, or `needs_review`), the hash of the entry the receipt is now on, and `commit`, so the receipt page can say where the receipt went and offer an undo through `revertCommit`. When the receipt landed on the wrong entry, the same resolve operation takes it off again and records it as its own entry, marked so that the matcher leaves it alone. `requestId` retries keep today's contract: the same request returns the first result. The authority is unchanged: insertion's composite decision already requires the ledger's content-write and asset-write relationships, and a content writer may read the entries it is matched against (in [`model.fga`](../../backend-cluster/backend-v2/authz/model.fga), `reader` includes `writer`). Mobile receipt capture switches from `addEntries` to `insertReceiptTransaction`, so its receipts are stored and matched as well.

**Flags.** Every write in this decision is `*`. Only an exception becomes `!`: a review outcome above on either side, or a receipt entry on a mapped account still without an `import-id` N days after its date (open question 10). Resolving the exception restores `*`.

### D11. A transfer between two linked accounts is one entry

With checking, savings, and card accounts all mapped, a transfer or a card payment arrives twice, once from each account, and each bank words its side differently (`TRANSFER TO SAVINGS`, `TRANSFER FROM CHECKING`). The second row matches (D10 step 3) an entry that carries another mapped account's `import-id` and posts the same amount to this row's mapped account within three days, whatever the description, as `dedup.md`'s Layer 2b reads it. The merge adds the row's ID as `import-id-2`, the key `dedup.md` and the `bea` import path already read, and changes no amount. Two bank accounts may not map to the same ledger account: the mapping update refuses it, so every row names exactly one ledger account and a match cannot cross accounts.

### D12. Each bank account is set up where it is mapped

- **Create while mapping.** The mapping form may suggest a ledger account that the ledger does not have, named after the bank and the account (the suggestion comes from the LLM, on request and inside quota, as D9 requires). Accepting it opens that account with one `open` directive, dated the day of the account's earliest staged transaction, in its own commit; the mapping is saved only after the directive is written. The owner can edit the name first.
- **Sync per account.** `plaid_accounts.enabled` already decides which accounts sync reads, but nothing can set it: every account is created enabled and stays so. It becomes settable on each account. Switching it off stops fetching for that account, turns its automatic import off, and leaves its staged rows and ledger entries as they are; switching it on resumes from the Item's cursor.
- **One choice in the dashboard.** `enabled` and `autoImport` stay two settings on the three API surfaces, but the dashboard presents them as one choice per account, because two switches side by side read as the same question. "Don't import" is `enabled` off; "Import for review" is `enabled` on with `autoImport` off; "Import what I've booked before" is `autoImport = history`; "Import everything, AI categorizes the rest" is `autoImport = all`. The labels say what each option leaves to the owner: the third names the owner's own earlier bookings instead of "history", and the fourth names AI, because letting a model write categories into the books is a choice the owner should make knowingly. A bank that needs a new sign-in shows the choice as paused and keeps it.

### D13. Keep what the bank said

A readable payee and narration must not cost the information in the bank's own words: the store number and city, the processor prefix (`SQ *`, `PAYPAL *`), a check or reference number. The staging table is not a safe place for it, since sync overwrites modified rows and deletes removed ones.

- **In the ledger.** Every entry made or completed from a bank row carries `bank-description`, the bank's descriptor exactly as Plaid's `name` gave it. Neither history nor the LLM rewrites it. Matching and dedup (D10) compare this text, not the cleaned payee.
- **In sync.** Each staged row also keeps Plaid's `authorized_date`, `location`, `payment_channel`, and `check_number`. The matcher uses `authorized_date`, when present, as the purchase date in place of the posting date, which narrows D10's date window; the location gives a second signal against a receipt's printed address.
- **In the entry.** The entry also carries what a reader or an auditor would look for, each key only when the bank supplies a value: `bank-date`, `bank-channel`, `bank-location`, `check-number`, and `bank-reference`.

Every metadata key a bank row can put on an entry, and where each value comes from:

| Key | From Plaid | When it is written |
| --- | --- | --- |
| `import-id` | `transaction_id`, as `plaid:<id>` | Always |
| `import-id-2` | `pending_transaction_id` of the row this one replaced (D6), or the `transaction_id` of a transfer's other side (D11) | Only in those two cases |
| `import-rule` | none; `history`, `match`, or `ai` | Only on entries written or completed in the background (D5) |
| `bank-description` | `name`, unchanged | Always |
| `bank-date` | `date`, the posting date | When it differs from the entry's date |
| `bank-channel` | `payment_channel`: `in store`, `online`, or `other` | When present |
| `bank-location` | `location`: store number, address, city, region, postal code, country, joined in that order | When any part is present |
| `check-number` | `check_number` | When present |
| `bank-reference` | `payment_meta.reference_number` | When present |

These Plaid fields are kept on the staged row for matching and review but are not written to the ledger: `authorized_date` (it becomes the purchase date the matcher uses), `merchant_name` (the payee's last fallback, D4), `personal_finance_category` (the bank's taxonomy, which D4 does not use), `counterparties`, the location's coordinates, `logo_url`, and `website`.

The fullest case is a card purchase whose receipt arrived first and whose bank row then completed it. A check number never appears on a card purchase; it is shown here only so that every key appears once:

```beancount
2026-11-03 * "Corner Cafe" "Lunch" ^rcpt_8fK2mQx1
  import-id: "plaid:Kx3vQ9dYbLhE7mZpA1nW"
  import-id-2: "plaid:Pn8sT2cRfUjG4kXoB6yV"
  import-rule: "match"
  bank-description: "SQ *CORNER CAFE 0042 SAN FRANCISCO CA"
  bank-date: 2026-11-05
  bank-channel: "in store"
  bank-location: "0042, 1 Market St, San Francisco, CA, 94105, US"
  check-number: "1042"
  bank-reference: "REF20261105A7"
  Liabilities:HarborCard  -21.60 USD
  Expenses:Food            21.60 USD
```

The `^rcpt_` link ties the entry to its receipt document under git storage; under S3 storage the entry carries `receipt: "<url>"` instead. `import-id-2` holds the pending row's ID, because the purchase was first seen pending. An ordinary automatic import is much shorter:

```beancount
2026-11-05 * "Corner Grocer" "Groceries"
  import-id: "plaid:Zt5wM1aQeNcD8rHuJ3xS"
  import-rule: "history"
  bank-description: "CORNER GROCER #114 SAN FRANCISCO CA"
  bank-channel: "in store"
  Assets:FirstBank:Checking  -35.20 USD
  Expenses:Food:Groceries     35.20 USD
```

### What stays manual

Connecting a bank, reconnecting it, confirming account mappings, choosing how each account imports, reviewing every row that history does not explain or confirming what AI booked for it, and deciding every match that is not certain.

## Consequences

- With auto-import on, a purchase from a merchant the user has booked before reaches the ledger minutes after the bank posts it, without a person and without AI cost.
- New or ambiguous merchants, pending rows, and accounts without a mapping still wait for review. Auto-import shrinks the queue; it does not empty it. An owner who chooses "Import everything" trades the queue for entries flagged `!` that AI categorized and that still need a look.
- A new ledger gets little from history at first. "Import everything" lets it start, and each confirmation turns into history.
- A second login at the same bank can be connected. Linking an account twice is refused with a message naming the account.
- No refused or half-saved link leaves an Item at Plaid.
- Users learn by email when a bank needs reconnecting or has new accounts to share.
- Plaid AI spend becomes subject to each user's quota. Users who relied on unmetered suggestions may hit their limit sooner.
- A merchant reads the same on every entry, and the bank's own wording stays on each one as `bank-description`.
- Background work now writes ledger entries. The `import-rule` key and the audit log identify them.
- A receipt and its bank transaction become one entry in either order, and a transfer between linked accounts is booked once.
- Clients never choose between attaching and adding. The receipt page, mobile capture, an inbox job, and an MCP agent make one call, and its result says what happened.
- The receipt scenario that prompted this record needs no customer job on the bank side: rows reach the ledger on their own, and a receipt that arrived first is completed instead of duplicated. What remains outside is getting receipts in and pushing entries to the ERP.
- Background work now edits existing entries, not only appends: a merge adds an `import-id` and can change an amount. Each merge is its own commit marked `import-rule: "match"`, so it can be found and reverted.

## API parity

| Capability | REST | GraphQL | MCP |
| --- | --- | --- | --- |
| Set `autoImport` (`off`, `history`, `all`) and `targetFile` (new) | `PUT …/bank-accounts/{accountId}/auto-import` | `updatePlaidAccountAutoImport` | `setBankAccountAutoImport` |
| Set `enabled`, the account's sync switch (new) | `PUT …/bank-accounts/{accountId}/sync` | `updatePlaidAccountSync` | `setBankAccountSync` |
| Map to a ledger account that does not exist yet, opening it (`createAccount` on the mapping update) | existing mapping update | existing mapping update | `mapBankAccount` |
| Read `autoImport`, `targetFile` on bank accounts | existing account reads | existing account reads | existing account reads |
| Read `needsAttention` on bank connections | existing bank reads | existing bank reads | `listBankConnections` and the bank resources |
| Suggestions with `source`, `tier`, prior count, and the suggested `payee` and `narration` | `GET …/bank-transactions/suggested-categories` | `suggestPlaidTransactionCategories` | `bankSuggestedCategories` resource |
| Staged rows with `state` (`staged`, `needs_review` with its reason and candidates, `removed_after_import`) | `GET …/bank-transactions/unsynced` | `getUnsyncedPlaidTransactions` | `listStagedBankTransactions` |
| Resolve a row in review: merge into a named entry, or add it as new (new) | `POST …/bank-transactions/{transactionId}/resolve` | `resolvePlaidTransactionMatch` | `resolveStagedBankTransaction` |
| Submit results list what was merged, and into which entry and commit | existing submit | existing submit | `importStagedBankTransactions` |
| Optional `payee` and `narration` per row on submit, overriding the suggestion | existing submit | existing submit | `importStagedBankTransactions` |
| Staged rows show the bank's descriptor, purchase date, and location | existing staged read | existing staged read | `listStagedBankTransactions` |
| Receipt writes report `outcome` (`attached`, `inserted`, `needs_review`), the entry the receipt is on, and `commit` | `POST …/import/insert-receipt` | `insertReceiptTransaction` | `insertReceiptTransaction` |
| Receipts in review: flagged entries with `receipt-candidates` metadata | existing journal reads | existing journal reads | `listLedgerEntries` |
| Resolve a receipt in review: the same purchase as a named candidate, or a separate one (new) | `POST …/import/resolve-receipt` | `resolveReceiptMatch` | `resolveReceiptMatch` |

The new setting uses the same authority as the existing account-mapping update, resolving a bank row uses the submit's authority, and resolving a receipt uses the receipt insertion's authority. Link, update mode, and exchange stay GraphQL-only under their documented ceremony exception; the exchange gains an optional Link-metadata argument and a clearer conflict message. Automatic import is background behavior, not a customer operation.

## Implementation outline

| Change | Where |
| --- | --- |
| Link metadata passed with the exchange; account-level duplicate check; `persistent_account_id` stored; `/item/remove` on refusal; one transaction for Item and accounts (D1, D2) | `dashboard/src/features/plaid/pages/plaid-settings/hooks/use-plaid-link-launcher.ts` and `use-plaid-token-exchange.ts`, `plaid-resolver.mutation.ts`, `plaid-item-service.ts` `exchangePublicToken`, `plaid-client.ts`, `plaid-account-model` schema and migration |
| Body-hash deduplication, awaited sync, stuck-row reclaim, `error_code` checks, fallback job on (D3) | `plaid-webhook-handler.ts`, `plaid-webhook-event-model`, `plaid-webhook-service.ts`, `plaid-webhook-processor-job.ts`, `plaid-sync-service.ts`, `job-scheduler.ts` |
| History categorizer for category, payee, and narration; corrected descriptions; editable payee and narration in review (D4) | new `features/plaid/utils/history-categorizer.ts`, `plaid-item-service.ts` `suggestCategories`, `plaid-mapper.ts`, `banks-handler.ts`, `mcp-resources.ts`, `dashboard/src/features/plaid/components/transaction-review-table.tsx` |
| `auto_import` and `target_file` columns, the setting on three surfaces, the post-sync import step, and policy docs (D5) | `plaid-account-model` schema and migration, `plaid-sync-service.ts`, `banks-handler.ts`, `plaid-resolver.mutation.ts`, `bank-import-tool.ts`, `authz/README.md`, `features/plaid/AGENTS.md` |
| Pending carry-over and `removed_after_import` state (D6) | `plaid-sync-service.ts`, `plaid-transaction-model` schema and migration |
| Lock and compare-and-set on submit; per-row entry hash (D7) | `plaid-sync-service.ts` `submitTransactionsToLedger`, `plaid-transaction-model` |
| `needs_attention`, the email, and the banner (D8) | `plaid-item-model` schema and migration, `plaid-webhook-service.ts`, a new email template, `dashboard/src/features/plaid/pages/plaid-connections/` |
| Quota gating and confirmed mappings (D9) | the three LLM call sites in `plaid-item-service.ts`, `dashboard/src/features/plaid/pages/plaid-connections/components/account-mapping-form.tsx` |
| One matcher, the five-step order in submission, merges through the source-slice update, `import-id-2` in the already-imported check, the review state and the resolve operation on three surfaces (D10) | a shared matcher under `features/ledger/utils/`, `plaid-sync-service.ts` `submitTransactionsToLedger` and `assertNotAlreadyImported`, `plaid-transaction-model` schema and migration, `banks-handler.ts`, `plaid-resolver.mutation.ts`, `bank-import-tool.ts` |
| Matching inside the receipt write, `outcome` on its result, and receipt review resolution on three surfaces (D10) | `ledger-receipt-workflow.ts` `insertReceiptTransaction`, `receipt-insert-handler.ts`, `ledger-receipt-resolver.ts`, `mcp-tools.ts`, `dashboard/src/features/receipt/` (where the receipt went, and undo) |
| Mobile receipt capture through `insertReceiptTransaction` (D10) | `mobile/src/screens/receipt-capture-screen/use-receipt-workflow.ts` |
| Per-ledger lock around matching and writing (D7) | `plaid-sync-service.ts`, `ledger-receipt-workflow.ts` |
| Transfer pairing, and one ledger account per bank account (D11) | the shared matcher, the mapping update in `plaid-item-service.ts` |
| `bank-description` on every bank entry; `authorized_date`, `location`, `payment_channel`, and `check_number` kept by sync and used by the matcher (D13) | `plaid-client.ts`, `plaid-sync-service.ts`, `plaid-transaction-model` schema and migration, `plaid-mapper.ts`, the shared matcher |
| Opening a suggested account on acceptance, and the sync switch on three surfaces (D12) | the mapping update in `plaid-item-service.ts`, `plaid-account-model`, `banks-handler.ts`, `plaid-resolver.mutation.ts`, `bank-import-tool.ts`, `account-mapping-form.tsx` |

Order: D2, D3, and D7 first, because they fix correctness without changing the product; then D1 and D6; then D4, whose history suggestions are visible in review before anything writes automatically; then D13, whose extra fields the matcher uses; then D10 and D11 together with D5, so automatic import never adds what a receipt or the other side of a transfer already booked; then D8 and D9.

Tests cover each gap's failure case: a second login with disjoint accounts accepted and an overlapping one refused with `/item/remove` called; an account matched by `persistent_account_id` although its mask changed; a redelivered webhook dropped; a failed sync retried; pending-then-posted producing one entry; concurrent manual and automatic submits writing once; a high-tier history row imported and a medium-tier or AI row left staged under `history`; under `all`, the same row booked flagged `!` with `import-rule: "ai"`, confirmed into `*`, and left staged once the quota is used up; a user without write access getting no automatic entry; one email per transition; LLM calls refused over quota; a bank row merging into the receipt entry that arrived first (one entry, the bank's amount, the receipt's category); a receipt landing on the bank entry that arrived first (no new entry, the bank's amounts kept); two candidate receipt entries leaving the row in review; a receipt with two candidate bank entries written flagged, then resolved into one; a hand-entered entry never merged automatically; a transfer between two mapped accounts booked once; a receipt upload racing a bank merge writing one entry; a known merchant imported with the payee spelling its history uses; and every bank entry carrying the descriptor unchanged in `bank-description`. End to end, the Plaid sandbox can fire `SYNC_UPDATES_AVAILABLE` and `NEW_ACCOUNTS_AVAILABLE` (`/sandbox/item/fire_webhook`) and force a reauth (`/sandbox/item/reset_login`); [w2/blocked/009](../../.pm/w2/blocked/009.md) records why that journey is not yet runnable against the hosted QA account.

## Alternatives considered

- **Let customers' own jobs submit through the API.** It works today with an API key, and it stays valid for customer-specific rules. As the product answer it is rejected: it inherits LLM-only categories, and every customer would rebuild the same job.
- **Auto-submit LLM suggestions above a confidence threshold.** The confidence is the model's own estimate, uncalibrated, and the dashboard already ignores it. Rejected. `autoImport = all` is not this: it uses no threshold, the owner chooses it per account, and every entry the model categorized stays flagged until a person confirms it.
- **History-only automatic import, with no AI option.** A new ledger has no history, so automatic import would do nothing there until the owner had booked every merchant twice by hand. Rejected in favor of the opt-in `all`.
- **Drop the duplicate check.** Two Items on one account produce different transaction IDs, so double entries would pass the ledger's import-ID check. Rejected.
- **A unique index on ledger and institution.** It would make G1 permanent. Rejected.
- **Plaid's own transaction categories.** A bank's taxonomy is not the user's chart of accounts; `categorization.md` forbids using it. Rejected.
- **Auto-import on by default.** It would write to people's books without their consent. Rejected in favor of a per-account opt-in.
- **A Redis lock now.** Deferred: one instance runs today. It becomes required before scaling out (D7).
- **Keep receipts out of the ledger until the bank confirms them.** Cash never confirms, the user sees nothing for days, and the holding area becomes a second ledger. Rejected.
- **Flag a receipt entry `!` until its bank row arrives.** The flag is for people. It would mark every recent receipt and hide the real exceptions, while the waiting state can be read from `import-id`. Rejected.
- **A separate attach operation that clients call after choosing among candidates.** No client can know which arrived first, so every client and every agent would have to repeat the matching and the choice, and an extra MCP tool would compete for selection. Ambiguity goes to review instead, as on the bank side. Rejected. One write whose outcome depends on the ledger, not on an argument, is not the argument-selected multi-operation tool that [ADR 019](./ADR019-backend-v2-mcp-host-compatibility.md)'s 2026-10-18 amendment removed; bank submission merges the same way.
- **Append-only matching, as the skills do.** Skipping a duplicate without writing its ID leaves the next import to ask the same question. Rejected for the hosted path, which writes the ID because the entry it completes is unambiguous.

## Open questions

1. **Threshold.** Is the high tier (at least two consistent priors) strict enough for automatic writes, or should auto-import require three?
2. **Backlog.** When auto-import is switched on, should the rows already staged be imported too, after a preview, or only new arrivals?
3. **Inflows.** Should refunds and income be auto-imported when history matches, subject to `categorization.md`'s directional check, or outflows only?
4. **Reminders.** Is one email per transition enough, or should a reconnect reminder repeat after seven days?
5. **Orphans.** Who compares Plaid's Dashboard Items with `plaid_items` once and removes what leaked before D2?
6. **Visibility.** Should automatic entries also carry a tag, so they show in the journal without opening metadata?
7. **Tolerance.** Are 100–125% for the amount, and five days before to one day after the posting date, right? Should the amount tolerance depend on the kind of merchant, since restaurants take tips and stores do not?
8. **Hand-entered entries.** Should step 4 of D10 merge automatically when the description matches strongly, or always ask?
9. **Purchase date.** With `authorized_date` kept (D13), how far should D10's date window shrink when it is present: one day, or two? And should an entry added from a bank row be dated by it instead of the posting date?
10. **Unmatched receipts.** After how many days is a receipt entry on a mapped account with no bank match flagged: seven, ten, or a setting per account?
11. **Raw descriptor.** Plaid can also return the institution's untouched text as `original_description`. Is it different enough from `name` to store in its place?
12. **Receipt details on a bank entry.** When a receipt lands on a bank entry, should the receipt's payee and narration replace the bank's terser descriptor, or stay in metadata?

## Related findings not decided here

- Access tokens are encrypted with a key derived from `AUTH_SECRET` (`features/plaid/utils/encryption.ts`), so rotating that secret would make every stored token unreadable.
- GraphQL bank mutations have no `dryRun` ([w1/211](../../.pm/w1/211.md)), and a failed dry-run sync writes a sync log ([w1/189](../../.pm/w1/189.md)).
