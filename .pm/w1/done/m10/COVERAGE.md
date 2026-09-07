# w1/m10 baseline coverage map

Captured from the repository's `VERB_TABLE` and `isReachableOn` on 2026-09-06. This is the starting inventory, not a claim that implementation is complete. Keep the baseline rows when updating progress; record the tested replacement/binding instead of removing a gap.

There are 144 verbs, 111 eligible on at least one surface, and 33 excluded from the current parity target. GraphQL has 105/105 eligible bindings, REST 58/111, and MCP 44/107. All 63 missing operations have an owner below; 53 also lack a REST binding. MCP presence includes either a tool or a resource.

## Every eligible baseline operation

“Present” means the registry already maps a binding; behavioral equivalence still needs verification. “Excluded” means the current per-surface exception applies. Each implementation task must cover every gap assigned to it, including legacy aliases.

| Verb | GraphQL | REST | MCP | Gap owner |
| --- | --- | --- | --- | --- |
| `apikeys.list` | Present | Present | Present | Existing binding; contract audit |
| `apikeys.create` | Present | Present | Present | Existing binding; contract audit |
| `apikeys.revoke` | Present | Present | Present | Existing binding; contract audit |
| `Query.userProfile` | Present | Gap | Gap | [t019](./done/t019.md) |
| `Mutation.deleteAccount` | Present | Gap | Gap | [t020](./done/t020.md) |
| `Query.allTierQuotas` | Present | Gap | Gap | [t019](./done/t019.md) |
| `Query.health` | Present | Gap | Gap | [t019](./done/t019.md) |
| `Query.featureFlags` | Present | Gap | Gap | [t019](./done/t019.md) |
| `Mutation.createLedger` | Present | Gap | Gap | [t008](./done/t008.md) |
| `Mutation.updateLedger` | Present | Gap | Gap | [t008](./done/t008.md) |
| `Mutation.deleteLedger` | Present | Gap | Gap | [t008](./done/t008.md) |
| `Query.listPublicKeys` | Present | Gap | Gap | [t009](./done/t009.md) |
| `Query.getPublicKey` | Present | Gap | Gap | [t009](./done/t009.md) |
| `Mutation.createPublicKey` | Present | Gap | Gap | [t009](./done/t009.md) |
| `Mutation.deletePublicKey` | Present | Gap | Gap | [t009](./done/t009.md) |
| `Query.listLedgerCollaborators` | Present | Gap | Gap | [t010](./done/t010.md) |
| `Query.getLedgerCollaboratorPermission` | Present | Gap | Gap | [t010](./done/t010.md) |
| `Mutation.addOrUpdateLedgerCollaborator` | Present | Gap | Gap | [t011](./done/t011.md) |
| `Mutation.deleteLedgerCollaborator` | Present | Gap | Gap | [t011](./done/t011.md) |
| `Mutation.leaveLedger` | Present | Gap | Gap | [t011](./done/t011.md) |
| `Query.listLedgers` | Present | Present | Gap | [t007](./done/t007.md) |
| `Query.listUserOwnedLedgers` | Present | Gap | Gap | [t007](./done/t007.md) |
| `Query.searchLedgers` | Present | Gap | Gap | [t007](./done/t007.md) |
| `Query.getLedger` | Present | Present | Gap | [t007](./done/t007.md) |
| `Query.getLedgerOverview` | Present | Gap | Gap | [t012](./done/t012.md) |
| `Query.getLedgerIncomeStatement` | Present | Present | Gap | [t012](./done/t012.md) |
| `Query.getLedgerBalanceSheet` | Present | Present | Gap | [t012](./done/t012.md) |
| `Query.getLedgerTrialBalance` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerAttributes` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerCommodities` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerEvents` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerDocuments` | Present | Gap | Gap | [t012](./done/t012.md) |
| `Query.getLedgerPayeeTransactions` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerNarrationTransactions` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerPayeeAccounts` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerErrors` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerCurrencies` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerSourceFiles` | Present | Gap | Gap | [t013](./done/t013.md) |
| `Query.getLedgerTags` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerYears` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerLinks` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerNarrations` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerPayees` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerAccountLastEntries` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerEntriesCountPerType` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerAccountReport` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerIntervalTotals` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerJournal` | Present | Present | Gap | [t013](./done/t013.md) |
| `Query.getLedgerEntryContext` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerPlaintextJournal` | Present | Gap | Gap | [t013](./done/t013.md) |
| `Query.getLedgerAccountJournal` | Present | Gap | Gap | [t013](./done/t013.md) |
| `Query.getLedgerAccounts` | Present | Present | Gap | [t012](./done/t012.md) |
| `Query.getLedgerAccountDirectives` | Present | Present | Present | Existing binding; contract audit |
| `Query.getLedgerAssetDownloadUrl` | Present | Gap | Gap | [t015](./done/t015.md) |
| `Query.getLedgerArchiveDownloadUrl` | Present | Gap | Gap | [t015](./done/t015.md) |
| `Query.getLatestLedgerCommit` | Present | Gap | Gap | [t014](./done/t014.md) |
| `Query.listCommits` | Present | Gap | Gap | [t014](./done/t014.md) |
| `Query.getCommitDetails` | Present | Gap | Gap | [t014](./done/t014.md) |
| `Query.ledgerMeta` | Present | Gap | Gap | [t007](./done/t007.md) |
| `Query.journalEntries` | Present | Gap | Gap | [t013](./done/t013.md) |
| `Mutation.starLedger` | Present | Gap | Gap | [t021](./done/t021.md) |
| `Mutation.unstarLedger` | Present | Gap | Gap | [t021](./done/t021.md) |
| `Mutation.bulkEntries` | Present | Present | Gap | [t016](./done/t016.md) |
| `Mutation.insertReceiptTransaction` | Present | Gap | Gap | [t024](./done/t024.md) |
| `Mutation.deleteLedgerEntrySourceSlice` | Present | Gap | Gap | [t017](./done/t017.md) |
| `Mutation.deleteMultipleLedgerEntrySourceSlices` | Present | Gap | Gap | [t017](./done/t017.md) |
| `Mutation.updateLedgerEntrySourceSlice` | Present | Gap | Gap | [t017](./done/t017.md) |
| `Mutation.addEntries` | Present | Gap | Gap | [t016](./done/t016.md) |
| `Mutation.renameLedgerFile` | Present | Gap | Gap | [t018](./done/t018.md) |
| `ledger.queryShellText` | Present | Present | Present | Existing binding; contract audit |
| `ledger.queryShell` | Present | Present | Gap | [t006](./done/t006.md) |
| `ledger.listDirContent` | Present | Present | Present | Existing binding; contract audit |
| `ledger.readFiles` | Present | Present | Present | Existing binding; contract audit |
| `ledger.editFiles.create` | Present | Present | Present | Existing binding; contract audit |
| `ledger.editFiles.update` | Present | Present | Present | Existing binding; contract audit |
| `ledger.editFiles.delete` | Present | Present | Present | Existing binding; contract audit |
| `ledger.downloadArchive` | Excluded | Present | Gap | [t015](./done/t015.md) |
| `ledger.downloadArchive.legacy` | Excluded | Present | Gap | [t015](./done/t015.md) |
| `Query.getUserProfile` | Present | Gap | Gap | [t021](./done/t021.md) |
| `Query.getUserFollowers` | Present | Gap | Gap | [t021](./done/t021.md) |
| `Query.getUserFollowing` | Present | Gap | Gap | [t021](./done/t021.md) |
| `Query.getUserStarredRepos` | Present | Gap | Gap | [t021](./done/t021.md) |
| `Query.getPullRequestDetails` | Present | Gap | Gap | [t022](./done/t022.md) |
| `Mutation.createPullRequestFromPatch` | Present | Gap | Gap | [t022](./done/t022.md) |
| `Mutation.approvePullRequest` | Present | Gap | Gap | [t022](./done/t022.md) |
| `Mutation.rejectPullRequest` | Present | Gap | Gap | [t022](./done/t022.md) |
| `Query.suggestTransactionCategories` | Present | Gap | Gap | [t024](./done/t024.md) |
| `Mutation.parseFile` | Present | Gap | Gap | [t023](./done/t023.md) |
| `Mutation.parseReceipt` | Present | Gap | Gap | [t023](./done/t023.md) |
| `Query.aiCfoUsage` | Present | Gap | Gap | [t024](./done/t024.md) |
| `Query.generateTempAssetDownloadUrl` | Present | Gap | Gap | [t025](./done/t025.md) |
| `Mutation.generateTempAssetUploadUrl` | Present | Gap | Gap | [t025](./done/t025.md) |
| `Query.getPlaidItems` | Present | Present | Present | Existing binding; contract audit |
| `Query.getPlaidItem` | Present | Present | Present | Existing binding; contract audit |
| `Query.getPlaidAccounts` | Present | Present | Present | Existing binding; contract audit |
| `Query.getPlaidAccountsForLedger` | Present | Present | Present | Existing binding; contract audit |
| `Mutation.unlinkPlaidItem` | Present | Present | Present | Existing binding; contract audit |
| `Mutation.reconcilePlaidAccounts` | Present | Present | Present | Existing binding; contract audit |
| `Mutation.updatePlaidAccountMapping` | Present | Present | Present | Existing binding; contract audit |
| `Mutation.updatePlaidAccountCurrency` | Present | Present | Present | Existing binding; contract audit |
| `Mutation.refreshPlaidItemStatus` | Present | Present | Present | Existing binding; contract audit |
| `Query.getUnsyncedPlaidTransactions` | Present | Present | Present | Existing binding; contract audit |
| `Query.suggestPlaidTransactionCategories` | Present | Present | Present | Existing binding; contract audit |
| `Query.suggestPlaidAccountMapping` | Present | Present | Present | Existing binding; contract audit |
| `Mutation.syncPlaidTransactions` | Present | Present | Present | Existing binding; contract audit |
| `Mutation.submitPlaidTransactionsToLedger` | Present | Present | Present | Existing binding; contract audit |
| `Mutation.deletePlaidTransactions` | Present | Present | Present | Existing binding; contract audit |
| `ai.agent` | Excluded | Present | Excluded | Existing binding; contract audit |
| `ai.askAgent` | Excluded | Present | Excluded | Existing binding; contract audit |
| `ai.openaiChatCompletions` | Excluded | Present | Excluded | Existing binding; contract audit |
| `ai.anthropicMessages` | Excluded | Present | Excluded | Existing binding; contract audit |

## Existing bindings with known contract work

- [t003](./done/t003.md), [t004](./done/t004.md), [t005](./done/t005.md): target selection, account operations, grant consent, audience and discovery compatibility.
- [t006](./done/t006.md): all supported optional report inputs, actual resource matching, pagination, and typed/text BQL representations.
- [t018](./done/t018.md): already-mapped file operations, line ranges, SHA conflicts, validation, atomicity, commits, and preview behavior.
- [t026](./done/t026.md): API-key expiry/restriction arguments, output fields, and credential invariants.
- [t027](./done/t027.md): bank filters, result fields, discriminator branches, and supported/unsupported previews.
- [t028](./done/t028.md), [t029](./done/t029.md), [t030](./done/t030.md): the remaining inventory of outputs, refusals, budgets, audit, client behavior, and full workflow evidence.

## Baseline operations outside the current parity target

These rows are retained to make eligibility changes visible. Their exclusion follows the current PDP credential catalog and named ceremony/projection lists, not old exemption prose. Do not silently move an eligible row into this list.

- `Query.getUserByExactMatch`
- `Mutation.updateUsername`
- `Mutation.updateProfile`
- `Query.validateEmailToken`
- `Mutation.logout`
- `Mutation.signIn`
- `Mutation.refreshToken`
- `Mutation.signInWithOneTimeToken`
- `Mutation.createOneTimeToken`
- `Mutation.sendForgotPasswordLink`
- `Mutation.resetPassword`
- `Mutation.signUp`
- `Mutation.verifySignUpOtp`
- `Query.getCliAuthSession`
- `Query.getCliAuthRequest`
- `Mutation.createCliAuthSession`
- `Mutation.confirmCliAuthSession`
- `Mutation.denyCliAuthSession`
- `Mutation.consumeCliAuthSession`
- `Query.subscriptionStatus`
- `Mutation.createSubscriptionSession`
- `Mutation.createStripePortalSession`
- `Mutation.cancelSubscription`
- `Mutation.resumeSubscription`
- `Mutation.upgradeSubscription`
- `Query.accountHierarchy`
- `Query.homeCharts`
- `Query.getFeed`
- `Mutation.followUser`
- `Mutation.unfollowUser`
- `Mutation.createPlaidLinkToken`
- `Mutation.createPlaidUpdateModeLinkToken`
- `Mutation.exchangePlaidPublicToken`

## Maintaining the completion contract

1. t001 reconciles this baseline with current code and records actual argument/result/effect and credential constraints in backend-owned fixtures/documentation. Runtime tests must not depend on the location of an eventually archived .pm milestone.
2. A grouped tool or shared REST route closes a row only when its specific selector and contract are executable and tested. BQL or file-edit approximations do not close structured operations by assertion.
3. Existing exclusions stay explicit. If eligibility contradicts credential policy, resolve the contradiction before claiming parity; unfinished decisions block closeout.
4. Record additional eligible operations and material parameter gaps under this same milestone, updating tasks and dependencies. No remaining family is deferred outside the milestone.
5. t029 verifies the complete matrix and zero deferred counts against live registrations; t034 closes only after the behavioral and deployment evidence also satisfies the README.
