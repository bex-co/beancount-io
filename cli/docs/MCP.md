# `bea mcp` — a local, read-only MCP server

`bea mcp` lets a coding agent read one local ledger over the Model Context
Protocol, with no account and no network. It is the local counterpart of the
hosted [Beancount.io MCP endpoint](../../backend-cluster/backend-v2/docs/mcp.md),
which serves hosted ledgers and is a separate surface: this server never sees a
hosted ledger and the hosted tool list does not apply to it.

## Connect your agent

Replace `/path/to/main.bean` with your ledger's absolute path.

**Claude Code**

```bash norun # connects a coding agent; needs an installed agent
claude mcp add beancount -- bea --file /path/to/main.bean mcp
claude mcp list        # beancount: ... ✔ Connected
```

Or share it with a project through `.mcp.json`:

```json
{ "mcpServers": { "beancount": { "command": "bea", "args": ["--file", "/path/to/main.bean", "mcp"] } } }
```

**Codex** — in `~/.codex/config.toml`:

```toml
[mcp_servers.beancount]
command = "bea"
args = ["--file", "/path/to/main.bean", "mcp"]
```

The Claude Code steps were run against a real client (it reports the server
connected). The Codex block follows Codex's documented `mcp_servers` format and
has not been run against a Codex install.

## Tools

| Tool | Runs | Notes |
| --- | --- | --- |
| `check` | `bea check` | Ledger errors, if any |
| `balance` | `bea balance` | `accounts`, `time`, `conversion`, `allow_errors` |
| `query` | `bea query` | One BQL statement; shell utilities (`.run`, `.output`) are refused |
| `report` | `bea report KIND` | `overview`, `income-statement`, `balance-sheet`, `trial-balance`, `holdings`, `register`, `capital-gains`, `cash-flow`, `budget` |
| `list_transactions` | `bea list transaction` | `limit` (1–500), dates, `account`, `flag`, `search`, `sort`, `details` |

Each tool returns the exact `bea --json` envelope as text, so what an agent reads
here is what `bea --json …` prints; a failing read comes back with `isError` and
bea's own error message. An answer over 200,000 characters is cut and says so.

## What it will not do

- **No writes.** Every tool is a fixed read command, none takes a file path, and
  the ledger is fixed when the server starts. Adding entries stays with the
  `beancount-add` and `beancount-import` skills and `bea add`.
- **Argument text is data.** Option values travel as `--name=value` and
  positionals after `--`, so a value such as `--output=x` is never read as an
  option.
- **One ledger, one process.** There is no hosted access, credential, or
  discovery; run one server per ledger.

## Protocol notes

Newline-delimited JSON-RPC 2.0 on stdin/stdout (the MCP stdio transport), protocol
versions 2025-06-18, 2025-03-26 and 2024-11-05. It answers `initialize`, `ping`,
`tools/list` and `tools/call`; it advertises tools only (no resources or
prompts); JSON-RPC batches are refused. Stdout carries protocol messages only;
closing stdin ends the server. Each call starts a `bea --json` process, so a
first call on a large ledger takes as long as that command does.
