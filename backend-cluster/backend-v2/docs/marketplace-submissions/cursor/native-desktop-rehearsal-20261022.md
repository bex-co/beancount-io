# Cursor desktop native MCP rehearsal — 2026-10-22 UTC

This follows the actual [community listing](https://cursor.directory/plugins/beancountio) through its Add to Cursor link, URL-only installation, native OAuth callback, tool discovery and desktop agent conversation. It is separate from the earlier [CLI companion rehearsal](./native-rehearsal-20261021.md). The official Cursor publisher application is prepared but unsent pending Publisher Terms approval.

## Client and connection

Cursor desktop 3.24.18, build `be4c9e5350d77747b42cd467cbd3370a753d4640`, runs the existing fresh QA user-data/extensions profile. Account sign-in reaches the native welcome flow; routine onboarding completes. The native Agents view, **This Mac / No Repo**, uses the displayed default **Cursor Grok 4.6 Medium** with no model override. The completed conversation reports **1m 59s**.

The community install link resolves to the canonical `https://beancount.io/api-gateway/mcp` URL, with no local command or embedded credential. The connector uses shared User MCP configuration rather than a workspace-local file. A fresh native Authenticate flow requests `openid`, `offline_access`, `ledger.read`, `ledger.write` and `ledger.admin`. The operator explicitly approves that scope for only the dedicated synthetic QA ledger and requests that the authorization remain after testing. Authorization completes and the native application displays **Connected: 44 tools, 8 resources**. No prompt-count claim is inferred from the earlier companion run.

The authorization and connector remain installed as requested. No end-session/revocation flow, token export, broader ledger selection or automatic-approval configuration is performed. The official publisher agreement is a separate action and is not covered by the QA grant decision.

## Observed native accounting calls

The agent discovers the pinned ledger context, `main.bean`, USD and the open `Assets:Cash` / `Expenses:Food:Coffee` accounts through the connected Beancount MCP. Expanded completed tool cards show:

| Check | Direct native result |
| --- | --- |
| `checkLedger` before | `checkLedger: ok`. |
| Cash BQL before | `Assets:Cash`, **49.75 USD**. |
| `appendLedgerText` | Exactly one observed call with `dry_run: true`, `allowInvalid: false` and `path: main.bean`; output says it would add one directive with no new bean-check errors. |
| Same Cash BQL after | **49.75 USD**, unchanged. |
| `checkLedger` after | `checkLedger: ok`. |
| Exact preview-payee BQL | **0 rows**. |

The preview is one balanced synthetic transaction, Cash −1.00 USD and Coffee +1.00 USD, with a unique test payee. No actual accounting commit is requested. The repeated balance query is:

```sql
SELECT account, sum(position)
WHERE account = "Assets:Cash"
GROUP BY account
```

One auxiliary journal lookup first supplies a bare text filter and receives `BAD_USER_INPUT: Trailing tokens`; that failed call is retained. It does not invalidate the successful BQL absence check or introduce a write. Subsequent journal/count reads are additional MCP observations, not independent pre/post commit evidence.

## Evidence limits

The host's tool text shows only `checkLedger: ok`; full structured commit identifiers/counts are not exposed in the inspected native cards. The agent reconstructs counts from journal reads, but that is not a matched pair of structured pre/post checks. Its final statement that unchanged balance proves no ledger mutation is broader than the available evidence and is not credited here.

Likewise, the dry-run card does not display a literal `wrote` array. The verified claims are the actual `dry_run: true` input, the one-directive/no-new-errors preview text, unchanged Cash balance and zero matching booked rows. No exact `wrote: []`, commit equality, whole-file equality or whole-session mutation-free assertion is made. Deployment revision remains unavailable in this host evidence.

Private consent receipts, completed native transcript, expanded tool cards, screenshots and an independently checked `verified-outcome.json` were local scratch and are not kept in the repository. The expanded completed-tool record has SHA-256 `8de504d762a43014c56b1f0fe2ea3679aad69c29e8901d9060ea344868d4a154`; raw credentials are not read or exported, and reasoning panels are not expanded.

This completes w6/m9/t003's fresh supported Cursor query/preview criterion through the installed community connection. w1/m34/t003 may reuse the Cursor portion; its combined VS Code/fallback-port acceptance remains separate. The subsequent typed `beancount` community search now returns Beancount.io at observed rank17; clicking it resolves to the canonical listing with Add to Cursor and no hidden/scan banners. The earlier name-indexing gap is cleared. Official Publisher Terms and official submission/review remain open; the completed community path does not require resubmission.
