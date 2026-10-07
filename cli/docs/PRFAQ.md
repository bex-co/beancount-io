**PRFAQ: One CLI for local Beancount and Beancount.io**

Strategy proposal · September 6, 2026 · Source review at `9a6cc106`

Status: Released as `bea` 0.3.1. Increment 1 and the local half of increment 3 are shipped. Increment 2, increment 4, and hosted importing are not built and not scheduled. FAQ 14 gives the state of each increment.

Recommendation: make the CLI the dependable way to operate a ledger from a terminal, script, or coding agent. Support local files and hosted books through familiar commands and explicit targets. Keep Python and reuse the Beancount ecosystem. Prioritize trustworthy output and writes before expanding embedded AI or command count.

The CLI is released: the distribution `beancount-io` installs the `bea` command from PyPI and Homebrew. This document remains the product direction. The announcement and some command examples below describe intended behavior that is only partly built, and each section says which part. Findings come from repository source, read-only CLI probes, the sibling Bex CLI, and upstream documentation. No production deployment, customer telemetry, or customer interviews were available; customer priorities and success thresholds are hypotheses.

FAQ 16 records the current CLI specification for internal planning. The generated [reference](REFERENCE.md) lists every command and flag.

**Proposed press release**

**Beancount.io introduces a unified CLI for your files, your hosted books, and the agents working with you**

Beancount.io today introduces an enhanced command-line experience for developers who want to maintain their books with the tools they already use. Users can validate and query local Beancount files without an account, work with hosted ledgers after signing in, and automate repeatable workflows with scripts and coding agents.

The CLI addresses a familiar problem: the same bookkeeping job often requires an editor, several Python commands, a browser, and custom API glue. Users must repeatedly establish which ledger they are operating on, whether a change is valid, and whether an interrupted import can be retried.

With the new experience, users choose a local file or hosted ledger and use consistent commands to inspect their books, prepare changes, and review the result. Imports produce a reviewable change plan with source identifiers and validation results. Applying a plan checks that the ledger has not changed since preparation and returns a concrete record of what was written.

People receive readable tables, useful defaults, and actionable errors. Scripts and agents receive documented JSON, predictable exit codes, and commands that never wait for hidden input. Existing Beancount files, Python importers, and plugins remain useful. Hosted workflows add remote access and collaboration through Beancount.io's public API.

Users can start locally and connect a hosted ledger when they need it. Local validation and reporting remain useful independently. Pricing and release availability will be stated when the launch scope is approved; this draft does not announce a new free API-key entitlement.

**1. Who is the primary customer? Is it a developer or an agent?**

Our initial customer should be the technically comfortable person responsible for a ledger: a developer managing personal or business finances, or a technical operator maintaining books for a small organization. Their coding agent and CI job are first-class operators of the product. The person or organization remains the buyer, grants access, and bears the consequences of a bookkeeping error.

| Priority | Customer and operator | Job to solve | Product implication |
| --- | --- | --- | --- |
| First | Developer or power user, working directly or through a coding agent | Maintain accurate plain-text books with less repetitive work | Excellent local setup, validation, imports, source preservation, and review |
| Next | Hosted customer or integration developer using scripts, CI, and scheduled jobs | Read and update Beancount.io reliably without browser glue | Scoped credentials, remote coverage, stable schemas, retries, and diagnostics |
| Expand after validation | Technical bookkeeper or small team managing several ledgers | Repeat a controlled workflow across clients and collaborators | Profiles, explicit targeting, history, permissions, and reusable configurations |

Do not treat “agents” as a separate market with no human customer. Supporting an agent means making operations discoverable, bounded, inspectable, and deterministic. An embedded chat command is only one interface to that capability.

This ordering fits the repository's existing local CLI, hosted service, and accounting skills. It does not establish which segment is largest or most profitable. Before committing to the full roadmap, observe four local users, four hosted users, and four automation builders completing real tasks; record setup failures, weekly jobs, and willingness to pay. Those interviews are discovery, not a statistically representative market study.

**2. What should customers use the CLI for?**

The core job is: “Turn financial source material into correct, explainable books, and make that workflow repeatable.” The recurring loop is inspect → prepare → validate → review → apply → report.

Support both local and remote operation as a product commitment. Local use provides immediate utility, offline accounting, ecosystem compatibility, and control over files. Hosted use provides access to shared books, linked banks, and service capabilities. A customer should not have to adopt hosting to obtain a good local CLI, or clone a repository merely to query a hosted ledger.

The boundary should be visible:

| Workflow | Local target | Hosted target |
| --- | --- | --- |
| Check, journal, accounts, BQL, financial reports | Execute against the selected entry file and its includes | Request the server's corresponding result |
| Record or edit entries | Prepare and validate file changes | Prepare and submit authorized server changes |
| Import a bank export | Execute a configured Python importer locally | Execute the importer locally, then submit reviewed output to the selected hosted ledger |
| Operate an already linked bank | Outside a standalone file's capabilities | List, sync, review, and submit through the bank API |
| Format files or execute Python plugins | Local runtime capability | Explicit checkout/local processing if needed; never imply arbitrary server Python execution |
| Collaborators, API keys, hosted ledger lifecycle | Not applicable | Hosted account and ledger commands |
| Reconcile and close a period | Compose checks, statements, and review | Compose the same customer workflow using supported remote capabilities |

“Support all operations” should mean a documented path for every supported customer operation, including browser handoffs where required. It should not mean every verb must have a fictitious implementation on both targets. Maintain a coverage table with the command, target, permission, transport, and any limitation. Infrastructure administration remains in the separate internal tooling.

**3. What does the research say about today's product?**

The local experience is dependable; hosted coverage is thin.

| Observed today | Consequence |
| --- | --- |
| The CLI has local init, check, format, query, balance, four reports, directive list and add, import, price commands, and the upstream `bean-doctor` tools, plus hosted login and ledger management. Hosted commands use a client generated from the pinned v1 OpenAPI contract. | The product exists and is released; the open work is hosted operation. [Command registration](../src/cli/main.py), [client](../src/cli/api/client.py), [reference](REFERENCE.md) |
| Local commands resolve one target: `--file`, then `BEA_FILE`, then `main.bean` or `main.beancount` in the current directory. `--json` and `--no-input` are global, and exit codes distinguish validation, usage, authentication, and conflict failures. | The automation contract holds for local files. There is no `--ledger` target. [Entry point](../src/cli/main.py), [errors](../src/cli/errors.py), [usage guide](USAGE.md) |
| Every local write validates the candidate ledger and replaces the entry file atomically under a per-file lock; a bulk add is all-or-nothing. Readers and reports refuse partial answers outside a terminal unless `--allow-errors` is passed. | A failed write cannot look successful. [Write validation](../src/bea_engine/ledger/write.py), [writer](../src/bea_engine/ledger/writer.py), [reader](../src/bea_engine/ledger/reader.py), [add command](../src/cli/commands/add.py), [reports](../src/cli/commands/report.py) |
| The pinned v1 contract contains 113 operations, including queries, structured entries, files, linked banks, collaborators, commit history, receipts, archives, and managed prices. The CLI calls only the account and ledger-lifecycle operations. | Remote usefulness is achievable from the existing contract. [Pinned snapshot](../openapi/v1.json), [published snapshot](../../backend-cluster/backend-v2/docs/openapi/v1.json) |
| The REST structured entry endpoint, as reviewed on September 6 and not re-checked, accepted eight directive variants, at most 100 per request, and omitted cost basis and other Beancount details. Local directive models now carry metadata. | The REST model is not a lossless representation of arbitrary Beancount source. [REST entry contract](../../backend-cluster/backend-v2/src/features/ledger/api/rest/v1/entries-handler.ts), [local models](../src/bea_engine/ledger/models.py) |
| Device login and protected credential storage exist, `BEA_TOKEN` takes precedence over the stored login, and hosted ledger creation defaults to private. Multiple CLI profiles do not exist. | Automation auth and private defaults are in place; profiles are not built. [Device flow](../src/cli/auth/device_flow.py), [credentials](../src/cli/auth/credentials.py), [ledger commands](../src/cli/commands/cloud/ledger/app.py) |

Source declarations and the checked-in contract establish implemented intent, not whether every operation works in a deployed environment. Live conformance remains a release gate.

**4. What should the first five minutes feel like?**

The product is the "Beancount.io CLI", the distribution is `beancount-io`, and the command is `bea`. The name `beancount-cli` on PyPI belongs to an unrelated third-party project. The commands below are shipped, with the target, output, and exit-code contract they rely on. `--ledger`, a `journal` command, and named contexts are not built.

```sh
# Start with files; no account required.
bea init ./books
bea --file ./books/main.bean check
bea --file ./books/main.bean query "SELECT account, sum(position) GROUP BY account"

# Manage hosted books.
bea cloud login
bea cloud ledger list

# Obtain the same documented interface from a script or coding agent.
bea --json --no-input list transaction --limit 100

# Not built:
#   bea --ledger alice/personal report balance-sheet
```

Today the target resolves as `--file`, then `BEA_FILE`, then `main.bean` or `main.beancount` in the current directory, and a local failure never switches execution to hosting. The rest of the target model is proposed and not built. `--file` and `--ledger` are mutually exclusive. A named context can store a local entry file or a hosted ledger plus server profile. Explicit target flags take precedence over environment settings, project configuration, and a deliberately selected user context, in that order. Without a configured target, retain the convenient local `main.bean` behavior; otherwise explain how to choose one.

JSON output carries the resolved file. Still proposed: show the resolved server and ledger in previews, `context show`, and diagnostics, and bind every prepared change to that target so switching context cannot redirect its application. Credentials stay in per-user storage; project configuration would contain references, not tokens.

The diagnostics proposed here as one `doctor` command shipped under other names. `bea doctor` is upstream `bean-doctor`: twelve ledger-debugging subcommands, such as `lex`, `parse`, `roundtrip`, `context`, and `missing-open`, forwarded to the engine. `bea engine status` reports the engine version and location, whether it is provisioned, any interpreter override, and the optional features. `bea cloud status` reports who is logged in, where the credential came from, and when it expires; it asks the server. `bea price status` reports managed price sources. No single command reports the resolved target, and there is no `auth status` name. [Reference](REFERENCE.md).

**5. How should we use the REST API?**

Public v1 REST is the CLI's only hosted transport. Login, account status, and the ledger commands all call a client generated from the pinned v1 OpenAPI snapshot, and the CLI has no GraphQL adapter. Each command has a known transport; a failed authorization request never triggers a fallback to another surface. [Client](../src/cli/api/client.py), [pinned snapshot](../openapi/v1.json).

The contract is far wider than the CLI's use of it. It covers queries, structured entries, file operations, linked-bank operations, collaborators, commit history, receipts, archives, and managed prices; the CLI calls only account and ledger-lifecycle operations. The backend's [operation classification table](../../backend-cluster/backend-v2/src/server/api/op-class.ts) records each operation's surfaces.

Prioritize backend work that makes customer workflows dependable:

1. Give CLI-used operations stable OpenAPI operation identifiers and concrete response schemas. Only 13 of the 113 operations carry an `operationId`, and many responses are unconstrained. Generate transport types after the contract is useful; hand-design the user-facing command experience.
2. Document pagination, precise amounts, validation state, errors, and revision information. Reuse existing domain result types where possible.
3. Expose a revision-bound change operation with preview, atomic application of its supported change set, idempotency, and a returned commit/revision.
4. Bring collaboration, commit-history, and receipt operations, which the contract already exposes, into the CLI in the order demonstrated customer jobs need them. Keep browser authentication and bank-link ceremonies as explicit handoffs.

Reuse the shared authorization and service boundaries. The CLI should never need internal ledger-service, Gitea-admin, or infrastructure credentials. Relevant foundations already exist in the [shared route declaration](../../backend-cluster/backend-v2/src/server/rest/v1-route.ts), [REST error translation](../../backend-cluster/backend-v2/src/server/rest/error-middleware.ts), and [repository change service](../../backend-cluster/backend-v2/src/features/ledger/service/ledger-repo-service.ts).

**6. Should we import Beancount modules, wrap their commands, or install them when used?**

Keep Python and Typer. Reuse libraries for structured accounting operations; use subprocesses where the upstream product is itself an application or needs a separate environment. We already use Beancount, Beanquery, and the vendored Fava core. As built, the `bea` frontend never imports them: ledger loading runs in a bundled helper inside a managed engine environment ([ADR014](../../docs/adrs/ADR014-cli-beancount-parity.md)). A language rewrite would add migration work without fixing the main customer problems.

| Capability | Recommended reuse | Installation and execution policy |
| --- | --- | --- |
| Parse, book, validate, represent amounts, print new directives | Beancount v3 APIs | Include in the normal installation; import when its command runs |
| Local BQL | Beanquery | Include with local accounting; preserve typed results through our output layer |
| Reports | Existing vendored Fava reporting core | Reuse behind a small adapter; test compatibility with supported dependency versions |
| CSV/OFX and other configured importer workflows | Beangulp and source-specific importers | Optional: `bea engine enable beangulp` adds it to the managed engine; reuse importer identification, extraction, deduplication, and test harness |
| Full local Fava browser UI | Upstream Fava application | Separate environment/process; the CLI already ships a package named `fava`, so co-installation needs deliberate namespace handling |
| Embedded assistant (`bea ask`) | Existing AI integration | Shipped as the optional `ask` extra, loaded only for that command; external agents need no embedded dependency |
| Git | Installed Git executable | Delegate repository operations; provide credential setup and useful recovery instructions |

Beancount v3 split several tools into independent projects. Beangulp replaces the old ingest framework, and Beanquery provides its own query interface. This is an integration opportunity, not a reason to recreate those engines. [Beancount](https://github.com/beancount/beancount), [Beangulp](https://github.com/beancount/beangulp), [Beanquery API](https://github.com/beancount/beanquery/blob/master/beanquery/__init__.py).

The normal installation can immediately check and query a local ledger. AI dependencies are out of it: they are the optional `ask` extra, and command imports are lazy. Consider a smaller remote-only distribution only if installation measurements demonstrate a meaningful need. Avoid forcing the first-time local user to discover an extra before the first useful command.

Distinguish lazy imports from lazy installation. An ordinary `check`, `query`, or agent run must not silently download packages. For a known optional integration, report the missing dependency and installation command. A plugin module name alone does not identify a trusted package to install; custom Python code must come from an explicitly configured project environment. Interactive setup can offer an explicit install; unattended operation should fail promptly unless setup has been separately requested. One deliberate exception shipped: the Beancount engine lives in a managed environment that Homebrew builds at install time and a PyPI install builds on first use, from the release's pinned locks.

Distribution is shipped: `beancount-io` publishes to PyPI from a `cli-v<version>` tag, and `brew install bex-co/tap/bea` is a thin formula over that same sdist — a uv-created virtualenv in `libexec` populated from the release's hash-pinned `requirements.lock`, so no dependency resolves or compiles on a user's machine. There is no frozen interpreter and no vendored Python, so a ledger project's own importers and plugins keep working. `bea upgrade` dispatches to the owning package manager and never rewrites its own files; the passive update notice is terminal-only, daily, and silent under `--json`, `--no-input`, `CI`, and `BEA_NO_UPDATE_NOTIFIER`.

Use uv's existing environment and dependency machinery rather than building a package manager. Global tools run in isolated environments and do not automatically see a ledger project's importer packages. For custom importers/plugins, document a ledger project containing the CLI and its dependencies, a lockfile, and invocation through that project's `uv run`. For simple global setups, uv supports explicit extras and `--with`. Do not mutate uv-managed tool environments with ad hoc pip calls. [uv tool environments](https://docs.astral.sh/uv/concepts/tools/), [project versus tool execution](https://docs.astral.sh/uv/guides/tools/).

Keep dependency versions and provenance inspectable. Preserve Fava attribution and upstream license notices when changing distribution. Retain compatibility checks around the vendored core, including its existing use of a private Beancount loader API. [Packaging](../pyproject.toml), [Fava notice](../NOTICE.fava), [loader adapter](../src/fava/beans/load.py).

**7. How should importing work across local and hosted books?**

Separate extraction from applying changes. A CSV file is an input to a bookkeeping workflow; it is not automatically a valid set of postings.

Local importing is shipped as `bea import`. It previews entries from a CSV mapping or a configured Python importer, always skips exact ID matches, puts possible duplicates up for review, and writes only with `--apply`, after validation ([importing guide](IMPORTING.md)). The stored plan described next, with its source digest, base revision, and target binding, is not built, and neither is applying an import to a hosted ledger.

The proposed workflow chooses a configured importer, extracts candidates against the existing ledger, identifies duplicates, surfaces uncertain categories, and produces a plan. The plan records the source file digest, importer/configuration version, target, base revision, proposed postings, validation results, and unresolved rows. Local plans can be stored in the ledger project's ignored scratch directory.

Beangulp supplies the importer framework and deduplication hooks. Its default duplicate detection is heuristic, so add persistent source transaction identifiers where available and a reviewed fallback policy for ambiguous matches. Do not equate heuristic similarity with exactly-once application. [Importer protocol and deduplication](https://github.com/beancount/beangulp/blob/master/beangulp/importer.py).

Run arbitrary Python importers on the user's machine or their explicitly configured runner. For a hosted target, retrieve the required ledger snapshot through authorized APIs, extract locally, then submit the reviewed change against that snapshot's revision. Do not upload Python code for execution in the ledger service.

For general importer output, preserve Beancount source and metadata. Convenience JSON transaction input can coexist with this path, but must reject unsupported fields rather than drop them. An import of more than 100 directives must not be silently split into apparently atomic `/entries` calls. General import-to-hosting waits for an adequate source-change contract.

Already linked bank accounts use the existing hosted bank workflow. Initial bank connection remains a browser step. Receipt extraction and optional AI categorization are explicit capabilities; they do not become prerequisites for deterministic CSV importing.

**8. What makes writing safe enough for unattended operation?**

The central artifact is the prepared change, not a confirmation prompt. A person or authorized automation policy can review and approve it; application must execute that same content against that same target and base revision.

Shipped for local changes: every writer validates the candidate ledger and replaces the entry file atomically under a per-file lock, and a bulk add is all-or-nothing ([write validation](../src/bea_engine/ledger/write.py)). Prepared changes and every hosted item in this section are not built. The full local design: stage the affected content and validate the complete include graph before writing. Coordinate the final file-hash check and replacement under a project lock for participating writers. Atomic replacement alone does not prevent a concurrent overwrite, and external editors may ignore that lock; document this boundary and use an isolated checkout for unattended jobs requiring exclusive writes. Start with an atomic single-file change; advertise multi-file atomicity only after an implemented recovery or transaction mechanism proves it. Invalid or unresolved rows leave the ledger untouched by default. An explicitly requested partial mode must report every rejected row and exit nonzero.

For hosted changes, server-side validation, authorization, conflict detection, and durable idempotency are authoritative. Return the new revision and per-change result. Current REST file operations expose a blob SHA, but do not provide a general atomic multi-file, preview, or idempotency contract. Existing bank dry runs are useful precedent, not evidence that every write already supports preview. [File routes](../../backend-cluster/backend-v2/src/features/ledger/api/rest/v1/files-handler.ts), [bank routes](../../backend-cluster/backend-v2/src/features/ledger/api/rest/v1/banks-handler.ts).

Until durable idempotency exists, do not automatically retry an ambiguous timed-out append. Tell the caller the outcome is unknown and how to inspect it. Preserve existing domain deduplication for bank transactions. Deletion, publication, and permission changes require explicit intent; new hosted ledgers default to private. An automation confirmation flag never overrides server authorization or an unresolved validation failure.

**9. Can local and hosted execution produce identical results?**

Offer consistent workflow semantics for a tested set of capabilities. Do not promise universal engine equivalence.

Local execution uses Python Beancount/Beanquery/Fava. Hosted execution uses rustledger WASM plus service adapters. The hosted plugin registry implements selected Fava plugins and surfaces skipped plugins; it cannot execute arbitrary Python plugin packages installed on a user's laptop. [Hosted plugin registry](../../backend-cluster/ledger/src/foundation/rustledger/plugins/index.ts), [plugin handling](../../backend-cluster/ledger/src/foundation/rustledger/plugins/strip.ts).

Expose engine/version and supported capabilities, together with validation warnings. Test common fixtures across both paths: includes, currencies, costs/lots, prices, date filters, balance assertions, and supported plugins. Preserve source bytes outside intentional edits, including comments and metadata. For unsupported plugin-dependent ledgers, explain the difference before publishing or presenting a comparison as equivalent.

Analytical output must disclose invalid-ledger state. Automation defaults to failure on validation errors: under `--json`, piped stdout, `CI`, or `--strict`, the `query`, `list`, and `report` commands refuse unless `--allow-errors` is passed. The terminal is the exception. When stdout is a terminal they print the data, with loader errors or missing-price summaries as a banner on stderr, and exit 0. Converted text amounts render at the ledger's per-currency display precision; JSON keeps full precision. Silent authoritative-looking totals are unacceptable. Capability discovery and local-versus-hosted parity testing are not built.

**10. What should agents and scripts be able to depend on?**

One automation contract across command families:

- `--output json` with `--json` as an alias; stable versioned schemas; money as decimal strings with currency; dates in documented formats; explicit target, engine, validation state, and pagination metadata.
- Data on stdout. In JSON mode, failures produce a structured error on stderr with a nonzero exit code; prompts, progress, and ANSI decoration are disabled. Explicit file/archive output keeps its documented binary or text format.
- `--no-input`, automatically effective without a terminal. Missing arguments or consent fail with a remediation command instead of waiting for input. JSON mode alone must also avoid prompts.
- Structured input from files/stdin, with schemas and size limits; no need to construct shell-escaped transaction strings.
- Bounded list results, explicit `--all` pagination, and a visible indication of truncation. Never silently total one page as the complete ledger.
- Documented error categories for usage, auth/permission, validation, conflict, rate limit, unavailable dependencies, and unknown write outcome. Preserve the backend request ID for support.
- Explicit deadlines and cancellation, with bounded retries for declared read operations or idempotency-protected writes. Respect server rate-limit information; classify a BQL POST as a read by its operation semantics.
- A compact command/schema/capability discovery surface. Keep ordinary help short and put detailed examples at the relevant command.

Built today: `--json` (there is no `--output json` spelling), data on stdout with JSON errors on stderr, `--no-input`, exit codes 1 to 4 for validation, usage, authentication, and conflict failures, bounded lists that report truncation, and bulk transactions from a JSON file. Not built: `--all` pagination and a command, schema, or capability discovery surface.

Existing accounting skills should compose these deterministic primitives. Reconciliation and month-end close still require matching evidence and resolving uncertainty; exposing a command should not convert an unverifiable statement into an approved close.

Keep MCP for clients that use MCP. Shell-capable agents can call the CLI directly. Share behavioral expectations with the backend services rather than requiring CLI → MCP → API indirection.

**11. How should authentication, self-hosting, and pricing work?**

Retain the existing browser/device login for people. Its current session credential expires after 30 days, which reinforces the need for a separate unattended credential path. `BEA_TOKEN` supplies a credential for CI, and `bea cloud status` shows the credential source and expiry. Token input on stdin, named server profiles for hosted and self-hosted deployments, and a display of effective capabilities are not built. Credentials must remain bound to the intended server; selecting another profile must not forward a token there accidentally. [Device credential lifetime](../../backend-cluster/backend-v2/src/features/auth/service/cli-auth-service.ts).

Use narrow ledger-scoped API keys for unattended jobs. REST credentials can address their authorized ledgers; MCP additionally requires a ledger pin. Existing API keys cannot mint replacement keys. [Identity](../../backend-cluster/backend-v2/src/server/api/identity.ts), [API-key service](../../backend-cluster/backend-v2/src/features/apikeys/service/api-key-service.ts), [MCP credential gate](../../backend-cluster/backend-v2/src/features/ai-agent/api/mcp-route.ts).

Keep local accounting free of hosted authentication. Describe the embedded assistant separately: `bea ask` is an optional extra that operates on local files but requires hosted credentials and uses a hosted AI proxy. “Local ledger” does not mean “offline AI.” [Ask command](../src/cli/commands/ask.py), [agent implementation](../src/cli/ask/agent.py).

API-key issuance currently requires a paid plan; already issued keys continue working after a subscription lapse. That is a material constraint on developer adoption. Launch documentation must state it. I recommend testing a limited developer automation allowance, with usage-based limits and paid hosted convenience, before deciding to make API access a broad acquisition channel. This is a pricing experiment requiring an explicit product decision, not a CLI workaround using browser credentials.

**12. Does supporting both targets mean building synchronization?**

It means providing a clear bridge; a new synchronization engine is a separate undertaking.

Ship direct remote commands and archive export first. Improve clone/setup using Git's existing mechanisms. Later, provide explicit status, diff, pull, and push workflows with conflict recovery; preserve the user's working tree and avoid overwriting remote changes.

Do not promise that REST login automatically authenticates Git. The current CLI clones over SSH, and the backend's Git HTTP proxy has a separate Basic-auth path. A seamless experience needs explicit SSH setup, credential-helper work, or server credential integration. [CLI clone](../src/cli/commands/cloud/ledger/app.py), [Git authentication](../../backend-cluster/backend-v2/src/features/gitea/api/git-proxy-handler.ts).

An archive is a snapshot, not a synchronized checkout. Offline cloud edits need an explicit base revision and conflict policy before they can be applied. Defer automatic background sync until evidence shows it is more valuable than dependable explicit Git workflows.

**13. What should we learn from `../bex/lego/cli`?**

The most useful lesson is architectural restraint: own the experience while reusing mature machinery. Bex's entry point delegates to a pinned upstream CLI and adds its own auth, configuration, branding, and selected native workflows. Its native agent command also delegates to an external runtime. For us, the equivalent is retaining Beancount, Beanquery, Fava, Beangulp, and Git under a coherent product interface.

| Bex observation | Application to Beancount |
| --- | --- |
| Dedicated configuration/auth identity and workspace selection | Named profiles and contexts; make the current ledger and credential source easy to inspect |
| Terminal/CI-aware behavior and explicit output modes | Friendly interactive selection, deterministic automation, and stronger JSON guarantees |
| Missing runtime errors include an installation command | Explain missing importer/AI dependencies precisely; avoid silent installation |
| Upgrade behavior understands installation channels | Versioned releases, reproducible installation, and package-manager-specific upgrade instructions |
| Mature upstream functionality is reused behind supported integration points | Spend engineering effort on the bookkeeping workflow and reliability contract |

Do not copy its shortcomings. In the inspected upstream confirmation path, choosing JSON alone can still lead to a prompt unless confirmation is supplied. Broadly importing an upstream command tree can also expose unsupported commands or upstream branding. Its advertised installer has prerequisites. Our compatibility and packaging matrix must test the real user journey, including absent dependencies and non-terminal execution.

Bex is a source-level design reference, not evidence that its choices caused better adoption. Its implementation language and upstream CLI are not reasons to rewrite our Python product. Research references: [Bex entry point](../../../bex/lego/cli/main.go), [Bex README](../../../bex/lego/cli/README.md), [native runtime launch](../../../bex/lego/cli/internal/code/launch.go), and the pinned upstream source identified in Bex's `go.mod`. These sibling links require the research checkout and are not dependencies of the proposed product.

**14. What ships first, and who owns it?**

Use gated increments. Do not block an improved local CLI on every REST expansion, or announce complete cloud importing before its write contract exists.

| Increment | Observable customer outcome | Lead and dependencies | Exit gate | State |
| --- | --- | --- | --- | --- |
| 1. Dependable foundation | A new user can select a file, check/query it, and script the result; a failed write cannot look successful | CLI lead; docs/release support | Executable docs; JSON/no-input contract; explicit targets; validated local writes; private hosted creation; existing behavior migration coverage | Shipped. |
| 2. Useful hosted operator | A user or scoped CI job can discover a ledger, inspect its books, and export a snapshot | CLI + backend; current auth and typed v1 contracts | Live auth/permission, paging, expiry, self-hosted profile, and bounded read-retry journeys pass | Not built and not scheduled. The shipped parts are `BEA_TOKEN`, `bea cloud status`, and REST-backed ledger list, show, create, clone, and delete. There is no hosted query, report, or journal, no `--ledger`, no archive export, and no profile. |
| 3. Repeatable importing | A user can prepare, review, and apply an import locally; then use the same workflow for a hosted target | CLI/import owner; backend revision/preview/idempotency work gates hosted application | Duplicate source, invalid row, stale revision, interrupted apply, metadata preservation, and repeated request scenarios pass | Local half shipped as `bea import`. The stored, revision-bound plan and hosted application are not built and not scheduled. |
| 4. Broader operations | Users can complete demonstrated collaboration, receipt, close, and Git workflows | Relevant backend/domain owners + CLI | Coverage register names every supported operation and limitation; browser and conflict recovery journeys pass | Not built and not scheduled. |

Assign one product owner to the cross-target contract and one engineering owner to each increment. Backend changes remain separate package-scoped changes coordinated through API contracts. Existing skills receive updates once the command contract is stable.

Before promising a calendar for the hosted increments, timebox one technical investigation: a revision-bound hosted change using the existing batch primitive. Its result determines the largest dependency and effort. The other question raised here, reproducible importer and plugin environments beside the vendored Fava namespace, is settled by the managed engine in [ADR014](../../docs/adrs/ADR014-cli-beancount-parity.md). Protect the remaining increments from scope expansion into an SDK framework, plugin marketplace, new accounting engine, or background sync service.

**15. How will we know the enhancement worked?**

The primary outcome is retained successful bookkeeping workflows per ledger owner. Command invocation count and agent token usage are weak substitutes: a broken loop can generate many calls.

Proposed release and pilot gates, not measured baselines; no pilot has been run:

- At least 10 of 12 pilot participants complete their assigned local or hosted first-value journey without engineering intervention; median time from documented installation to a validated result is under five minutes on supported systems.
- Every documented automation example passes without a terminal, including failures and expired credentials. The tested import suite produces no duplicate application or silent partial success, and no lost concurrent update within the supported local locking and server revision contracts.
- Warm `--help` and `--version` have a p95 below 500 ms on the declared reference machines, make no network calls, and do not initialize AI integrations. Measure cold installation separately before setting a download/size target.
- In the four-week pilot, at least 6 of 12 participants repeat a real workflow in three distinct weeks. Segment results by local, hosted, and agent/CI use; small samples guide iteration rather than prove market size.
- Track hosted automation activation, paid conversion, and auth/import support burden against a measured baseline. Local usage measurement is opt-in and excludes ledger contents, filenames, payees, amounts, queries, and tokens.

The largest risks are engine differences, Python environment friction, incomplete REST contracts, ambiguous writes, and insufficient customer demand. Each has an explicit response above: capabilities and fixtures, uv-managed environments, contract work, revision/idempotency semantics, and observed pilot journeys. Preserve current command compatibility where safe; document intentional changes such as private creation defaults and nonzero partial-failure exits, and provide a migration guide before declaring a stable automation interface.

**16. Internal FAQ: what is the current CLI specification?**

This describes `bea` 0.3.1. The generated [reference](REFERENCE.md) is authoritative for every command and flag, and the [usage guide](USAGE.md) describes the contract. It is an inventory of current behavior, not a promise that every behavior is desirable or that hosted workflows have passed live verification.

**What package, runtime, and dependencies do we ship?**

| Area | Current specification |
| --- | --- |
| Package and executable | `beancount-io`, version `0.3.1`; one command, `bea` |
| Runtime and packaging | Python `>=3.12`; Typer command tree; one distribution that bundles the engine helper and the vendored Fava subset as resources |
| Accounting dependencies | None in the frontend. Beancount, Beanquery, and the helper's other dependencies install into a managed engine environment pinned by the [engine manifest](../src/cli/engine/manifest.json) |
| Frontend dependencies | `typer>=0.27.0`, `httpx>=0.27`, `pydantic>=2.0`, `pydantic-settings>=2.0`, `prompt-toolkit>=3.0`, `python-frontmatter>=1.1`, `attrs>=23` |
| Optional packages | The `ask` extra adds `openai>=1.0` and `pydantic-ai>=0.3`. `bea engine enable` adds `beangulp` or `beanprice` to the managed engine |
| Hosted client | Generated from the pinned v1 OpenAPI snapshot |
| Distribution | `brew install bex-co/tap/bea` and `uv tool install beancount-io`; updating is `bea upgrade` |

See [package metadata](../pyproject.toml), [lockfile](../uv.lock), [installation guide](../README.md), and [command registration](../src/cli/main.py).

**Which commands exist?**

| Family | Commands |
| --- | --- |
| Local ledger | `init`, `check`, `format`, `query`, `balance`, `import`, `example`, `treeify`, `ask` |
| Directives | `add` and `list` for `transaction`, `open`, `close`, `balance`, `pad`, `note`, `event`, `price`, `commodity`, `document`, and `custom`; `add transactions` for bulk JSON |
| Reports | `report overview`, `report income-statement`, `report balance-sheet`, `report trial-balance` |
| Prices | `price status`, `price refresh`, `price export`; other arguments forward to upstream `bean-price` |
| Importer tooling | `ingest identify`, `ingest extract`, `ingest archive` |
| Debugging | `doctor`, with twelve upstream `bean-doctor` subcommands |
| Maintenance | `upgrade`, `engine status`, `engine enable` |
| Hosted | `cloud login`, `cloud logout`, `cloud status`, and `cloud ledger list`, `show`, `create`, `clone`, `delete` |

Global options are `--file`/`-f`, `--json`, `--no-input`, `--yes`/`-y`, `--debug`, `--strict`, `--offline`, `--strict-prices`, the shell-completion options, and `--version`. There is no `--ledger`, `--output json`, or profile selector.

**How are files, servers, and credentials selected?**

Local commands use `--file`, then `BEA_FILE`, then `main.bean` or `main.beancount` in the current directory. There is no project-root search and no named context.

`BEA_API_URL` defaults to `https://api.v3.beancount.io`; `BEA_DASHBOARD_URL` defaults to `https://beancount.io`. Named server profiles do not exist. [Settings](../src/cli/settings.py), [configuration](../src/cli/config.py).

`bea cloud login` runs the browser device flow and stores `credentials.json` under `$BEA_CONFIG_DIR`, by default `~/.config/bea`. `BEA_TOKEN`, when set, is used instead of the stored login. `bea cloud logout` revokes the token and clears the stored credential, and exits nonzero when it cannot revoke. [Device flow](../src/cli/auth/device_flow.py), [credential storage](../src/cli/auth/credentials.py), [cloud commands](../src/cli/commands/cloud/app.py).

**What is the current write contract?**

Writers run in the engine. `bea add`, `bea import --apply`, and confirmed `bea ask` edits each validate the candidate ledger before atomically replacing the entry file, under a per-file lock that the writers share. A bulk `add transactions` is all-or-nothing. Directive models carry metadata. Managed price feed files are read-only. There is no stored prepared change and no hosted write command. [Models](../src/bea_engine/ledger/models.py), [writer](../src/bea_engine/ledger/writer.py), [write validation](../src/bea_engine/ledger/write.py), [add command](../src/cli/commands/add.py).

**What exactly does the current AI feature do?**

`bea ask` needs the `ask` extra and a hosted credential. It uses the fixed model `gpt-4o` through `{api_url}/api-gateway/ai/openai/`; there are no model or provider flags. Queries execute locally, but prompts and tool results participate in hosted model requests.

Interactive edits are confirmed, validated, and written atomically. In `--print` mode the write tool skips writing because no confirmation is possible. Prompt history is stored as `ask_history` in the per-user configuration directory.

Skills are discovered from the current directory's `.agents/skills/` and from the per-user skills directory. These instruction files do not register new CLI subcommands. [Ask command](../src/cli/commands/ask.py), [agent tools](../src/cli/ask/agent.py), [REPL](../src/cli/ask/repl.py), [skill loader](../src/cli/ask/skills.py).

**What can automation and tests rely on today?**

`--json` emits data on stdout and JSON errors on stderr. Exit codes are 0 for success, 1 for validation, 2 for usage, 3 for authentication, and 4 for conflict. `--no-input` never prompts. [Output helper](../src/cli/output.py), [errors](../src/cli/errors.py).

The package's verification gate is `make check-all`: Ruff lint, Vulture dead-code detection, Ruff format check, strict mypy, pytest, the OpenAPI pin check, and the generated-docs check. It does not establish production API conformance. The hosted client is generated from the pinned OpenAPI snapshot. [Makefile](../Makefile), [tests](../tests), [codegen configuration](../pyproject.toml).

**Which proposed capabilities must we avoid presenting as current?**

There are no commands for hosted queries, reports, or journals, general remote file editing, archive export, sync, reconciliation, migration, month-end close, context management, or capability and schema discovery. The repository has skills and backend operations related to several of these jobs; their existence does not make them CLI features. FAQ 14 gives the state of each increment.
