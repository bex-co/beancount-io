# w6 · m11 — Complete app-directory and remote-community distribution

**Worker:** worker1 **Goal:** Users discover the existing hosted connector through approved ChatGPT/Claude entries and an accurate remote-MCP community entry. **Status:** todo

**Implementation estimate:** ~2h15m plus closing work, excluding external review latency. No recurring polling job is created.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./t001.md) | Follow existing ChatGPT application through review/publication | 45m | — |
| [t002](./t002.md) | Follow existing Claude connector application through review/publication | 45m | — |
| [t003](./t003.md) | Submit to Awesome Remote MCP Servers and verify merged entry | 45m | — |
| [t004](./t004.md) | Adoption surface | 30m | t001, t002, t003 |
| [t005](./t005.md) | Simplify | 30m | t004 |
| [t006](./t006.md) | Test coverage | 45m | t004, t005 |
| [t007](./t007.md) | Closeout | 15m | t006 |

## Definition of done

- Existing ChatGPT and Claude submissions are reused, required supported feedback is addressed, and both have actual approved public entries with verified native synthetic OAuth/query/preview paths.
- The remote-only community list has an accurate merged canonical entry and working setup links, without a duplicate contribution.
- The shared tracker retains actual submit/manage links, status, UTC last checked at, receipts/evidence and next actions. Publisher-confirmed submission, inspected review state and public publication remain distinct.
- All 17 tracker rows retain the execution owner below. Existing m8/m9/m10 and 041/042 publication gates remain open until their own acceptance holds; completing this milestone alone does not mean every w6 submission is finished.
- All standing closing tasks pass and mandatory archive moves are complete. Pending review, unavailable account access or unpaid fees are not completion.

## Source + Goal linkage

- **Source:** Explicit owner request on 2026-10-23: `$pm` to finish all submissions in `backend-cluster/backend-v2/docs/mcp-marketplaces.md` in w6; publisher confirms ChatGPT and Claude have already been submitted and supplies their concrete management URLs.
- **Goal linkage:** **A3 — Community & distribution** (primary), **A1 — Agent-native accounting** (secondary).
- **Expected outcome:** People find the hosted accounting connector in the two native app directories and the remote-service community list, then reach a real authenticated first query.
- **Why now:** Submitted applications need review ownership, while the existing queue conflated drafts/client tests with actual submission receipts. This work fills the newly authorized gaps and preserves existing channel owners.
- **Adoption surface:** included because the milestone adds public discovery and agent-facing connection paths. Existing host/registry work is reused.

## Full inventory ownership and execution order

The prepared [m9/t011](../blocked/m9/t011.md) official Cursor application awaits its exact final Publisher Terms confirmation. Docker [m9/t012](../blocked/m9/t012.md) is prepared at its exact synthetic-ledger consent decision. Cline [m9/t013](../blocked/m9/t013.md) is also at its exact synthetic-ledger consent decision. GitHub nomination [m9/t014](../blocked/m9/done/t014.md) is sent and archived. The next independent pick is [m10/t009](../m10/t009.md), LobeHub; this milestone's tasks remain independent; table order is priority, not a cross-platform dependency.

| Inventory target | Submission / receipt owner | Review, public verification or retained gate |
| --- | --- | --- |
| Cursor — official | [m9/t011](../blocked/m9/t011.md) | [m9/t003](../blocked/m9/t003.md), [m9/t006](../blocked/m9/t006.md) |
| Docker | [m9/t012](../blocked/m9/t012.md) | [m9/t002](../blocked/m9/t002.md), m9/t006 |
| Cline | [m9/t013](../blocked/m9/t013.md) | [m9/t004](../blocked/m9/t004.md), m9/t006 |
| GitHub curated gallery / VS Code | [m9/t014](../blocked/m9/done/t014.md) | [m9/t005](../blocked/m9/t005.md), m9/t006; existing w1/m34/t003 native owner retained |
| LobeHub | [m10/t009](../m10/t009.md) | [m10/t003](../m10/t003.md), [m10/t004](../m10/t004.md) |
| ChatGPT / OpenAI | Already submitted, publisher-confirmed 2026-10-23 | [m11/t001](./t001.md), existing specific application |
| Claude | Already submitted, publisher-confirmed 2026-10-23 | [m11/t002](./t002.md), existing specific application |
| Awesome Remote MCP Servers | [m11/t003](./t003.md) | Same task retains upstream receipt, review and merged entry |
| Glama | Existing connector; [m8/t003](../blocked/m8/t003.md) coordinates existing [w2/088](../../w2/blocked/088.md) claim/test-profile ownership | w2/088 full-day health repair, then [m8/t004](../blocked/m8/t004.md); no duplicate listing |
| Smithery | [m8/t002](../blocked/m8/t002.md) | Removed legacy intake remains blocked; platform/publisher must provide a working supported replacement route |
| MCPServers.org | Accepted free submission; preserve existing receipt | [m10/t001](../m10/t001.md), m10/t004; moderator publication then actual connection checks |
| MCPMarket | Accepted Free Queue repository submission; preserve existing receipt | [m10/t002](../m10/t002.md), m10/t004; reviewer publication then endpoint/OAuth metadata and connection checks |
| MCP.so | [041](../blocked/041.md) | Explicit approval of the observed $39 fee or a documented free route; no payment authorized by this plan |
| PulseMCP | [042](../blocked/042.md) | Platform reopens supported submission/edit intake; no submission sent while paused |
| Official MCP Registry | Already published under completed w2/m36 | Existing release workflow/canonical record; no duplicate namespace or routine resubmission |
| cursor.directory — community | Already published under [m9/t003](../blocked/m9/t003.md) | Preserve published entry and completed native QA; separate from official Cursor submission |
| Windsurf / legacy Cascade | Source-backed unavailable marketplace route under [m9/t001](../blocked/m9/done/t001.md) | m9/t006 retains explicit eligibility/revisit evidence; manual remote configuration is not a catalog submission |

## Execution rules

- Use only the documented, specifically requested intake for each target. A supported upstream catalog PR/issue or one-off nomination is distinct from repository code shipping, which stays direct to main. No bulk, unrelated outreach, fake engagement or new paid placement.
- Carry existing authorization forward. Before declaring a blocker, inspect the actual current step, finish all independently authorized preparation, and name the precise unmet access, scope, mandatory approval or platform condition. Generic hypothetical terms are not proof that no action can proceed.
- An actual platform/tool approval requirement still applies. Keep any narrow question at the final concrete action and continue independent tasks while it is pending; never treat silence as approval. Do not infer payment approval or broader data access from this planning request.
- Close receipt-stage tasks on actual accepted receipts only; keep pending publication in the owning verification task. If a submission itself is blocked, it stays open with owner and **Unblock:** event. No supported target disappears or becomes done because its draft or compatibility test passed.
- The tracker is the current status source. Each actual review pass updates only observed rows and retains their real check time and evidence; document edits do not refresh unobserved statuses. No recurring monitoring automation is part of this request.
