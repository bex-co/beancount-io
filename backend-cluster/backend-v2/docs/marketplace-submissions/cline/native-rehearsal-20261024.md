# Cline native rehearsal — 2026-10-24 UTC

The official Cline CLI3.0.73 and public `@cline/sdk`/core0.0.95 use isolated
configuration, provider/global settings and workspace paths; HOME is unchanged.
Existing user/extension settings and other retained clients are untouched.

## Authorization and native accounting checks

The actual CLI MCP wizard completed dynamic client registration and browser
OAuth after the operator approved the displayed access. Only the synthetic QA
ledger was selected, with all-ledger access unselected. Native default scopes
are `openid offline_access ledger.read ledger.write ledger.admin`. The callback
reported authentication success and the CLI reported OAuth authorization complete.
Credentials remain only in ignored local client settings, never in this packet.

The public SDK's native MCP manager/client loads the same settings and lists44
tools. It completes `checkLedger`, `readLedgerFiles` and structured BQL through
`https://beancount.io/api-gateway/mcp`. No alternate bearer-token transport or
model provider credential is used for this SDK rehearsal.

From2026-10-24T01:32:42.129Z to01:32:46.372Z, the actual client performed one
`appendLedgerText` call with `dry_run: true` and `allowInvalid: false`, between
before/after reads. Assertions passed:

- `dry_run` is true, `wrote` is empty and there are no new validation errors.
- Ledger commit, entry counts and zero-error state are unchanged.
- `main.bean` bytes and file blob are unchanged. SHA-256:
  `77c3a591efd311e01d03d2f3a91f2919151c0fb0708e1abe1a10ce6ec7e29915`.
- Cash BQL returns49.75USD before and after.
- The unique preview payee has zero persisted rows before and after.

These checks used one selected synthetic ledger. There was no real accounting
write, model call or resource enumeration in this SDK sequence. Tool enumeration
must not be represented as resource enumeration or a fresh authenticated
VS Code extension journey. Deployment revision is not exposed by these results.
The task-owned OAuth settings/grant are retained as requested.

## Catalog and submission controls

At2026-10-24T01:38:46Z the current public catalog returned HTTP200,203entries,
including149MCP servers; generation timestamp2026-09-18T20:15:28.359Z. An all-entry
name/identity/endpoint/repository check found no canonical match. Response SHA-256:
`187ebe2b130e25f261a805cc5930a19e275ece2c34ab21bd9df966a566b9848c`.
A current all-states upstream issue search also returned no Beancount result.
The supplied icon is verified as400×400PNG. Public metadata and test results do
not themselves establish a submission receipt, review acceptance or publication.

## Real Agent follow-through

After the native installation/OAuth above, an actual Cline CLI Agent session
used its supported `openai-codex` provider sign-in, separately from MCP OAuth.
The operator's previously approved Codex login was completed through the official
browser flow; no existing token was extracted or copied into another client.
`--auto-approve false` required individual approval of README reads and each
of the two accounting reads. The Agent read the complete setup README and called
the exposed native `checkLedger` and `runBqlQueryStructured` tools. It returned
zero ledger errors and exactly49.75USD for `Assets:Cash`, with no writes or preview
calls. Its provider selected `gpt-6.1-sol`.

This is real model-driven use of the documented, already authorized connection.
The human completed native wizard/browser OAuth; the Agent did not autonomously
perform a fresh installation or protocol-level tool-list request. The separate
native manager evidence above supplies actual44-tool discovery and the one
preview. Do not conflate these stages or claim an authenticated extension test.
