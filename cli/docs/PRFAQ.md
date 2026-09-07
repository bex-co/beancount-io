**PRFAQ: One CLI for local Beancount and Beancount.io**

Strategy proposal · September 6, 2026 · Source review at `9a6cc106`

Recommendation: make the CLI the dependable way to operate a ledger from a terminal, script, or coding agent. Support local files and hosted books through familiar commands and explicit targets. Keep Python and reuse the Beancount ecosystem. Prioritize trustworthy output and writes before expanding embedded AI or command count.

This is a proposed product direction, not a description of a released product. The announcement and command examples below describe intended behavior. Findings come from repository source, read-only CLI probes, the sibling Bex CLI, and upstream documentation. No production deployment, customer telemetry, or customer interviews were available; customer priorities and success thresholds are hypotheses.

FAQ 16 records the current CLI specification for internal planning. Its command inventory describes implemented behavior, including defaults and limitations that differ from the proposal.

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

The foundations are stronger than the current end-to-end experience.

| Observed today | Consequence |
| --- | --- |
| The CLI has local check/format/query, directive reads and writes, four reports, and hosted auth/ledger management. Hosted commands use generated GraphQL. | Extend an existing product rather than start a new CLI. [Command registration](../src/cli/main.py), [client](../src/cli/api/client.py) |
| Most local commands use `main.bean` in the current directory. The usage guide promises `--file` and universal `--json`; the executable does not implement them. A read-only probe of `read transaction --json` exits 2. | Fix the command contract and documentation before calling the CLI dependable for agents. [Configuration](../src/cli/config.py), [output](../src/cli/output.py), [usage guide](USAGE.md) |
| Local writes append directly; bulk transaction writes can append successful rows, report failures, and still exit successfully. Readers/reports can omit loader errors from their output. | An apparently successful automation run can leave incomplete or invalid books. Correctness and exit status are first-release work. [Writer](../src/cli/directives/writer.py), [bulk command](../src/cli/commands/write.py), [reader](../src/cli/directives/reader.py), [reports](../src/cli/commands/report.py) |
| The public v1 contract contains 50 operations, covering substantial bookkeeping and bank functionality. | Remote usefulness is achievable without waiting for complete API parity. [Published snapshot](../../backend-cluster/backend-v2/docs/openapi/v1.json) |
| The REST structured entry endpoint accepts eight directive variants, at most 100 per request, and omits cost basis and other Beancount details. Local directive models also omit transaction/posting metadata. | Neither model is a lossless representation of arbitrary Beancount source. [REST entry contract](../../backend-cluster/backend-v2/src/features/ledger/api/rest/v1/entries-handler.ts), [local models](../src/cli/directives/models.py) |
| Device login and protected credential storage already exist. API-key environment overrides and multiple CLI profiles do not. Hosted ledger creation currently defaults to public. | Preserve the login foundation; add automation auth, target visibility, and private creation defaults. [Device flow](../src/cli/auth/device_flow.py), [credentials](../src/cli/auth/credentials.py), [ledger commands](../src/cli/commands/ledger/app.py) |

Source declarations and the checked-in contract establish implemented intent, not whether every operation works in a deployed environment. Live conformance remains a release gate.

**4. What should the first five minutes feel like?**

*Amended 2026-09-07 (w2/m24).* This section originally recommended keeping the existing executable name. That recommendation was superseded: `beancount-cli` on PyPI is an unrelated, actively maintained third-party project, so the old name could never be published. The product is the "Beancount.io CLI", the distribution is `beancount-io`, and the command is `bea`. Milestone w2/m24 shipped the rename together with the target, output, and exit-code contract below; `--ledger`, `init`, `journal`, and named contexts remain proposed.

```sh
# Start with files; no account required.
bea --file ./books/main.bean check
bea --file ./books/main.bean query "SELECT account, sum(position) GROUP BY account"

# Work directly with hosted books.
bea auth login
bea ledger list

# Obtain the same documented interface from a script or coding agent.
bea --json --no-input list transaction --limit 100

# Still proposed, not implemented:
#   bea init ./books
#   bea --ledger alice/personal report balance-sheet
```

`--file` and `--ledger` are mutually exclusive. A named context can store a local entry file or a hosted ledger plus server profile. Explicit target flags take precedence over environment settings, project configuration, and a deliberately selected user context, in that order. Without a configured target, retain the convenient local `main.bean` behavior; otherwise explain how to choose one. A local failure must not switch execution to hosting.

Show the resolved file or server/ledger in previews, `context show`, diagnostics, and JSON metadata. Bind every prepared change to that target so switching context cannot redirect its application. Keep credentials in per-user storage; project configuration contains references, not tokens.

Add `doctor`, `auth status`, and concise examples to help. Doctor reports the resolved target, interpreter, package versions, missing capabilities, and credential source without exposing secrets. A local doctor invocation does not require a network probe; remote checks are explicit.

**5. How should we use the REST API?**

Use public v1 REST as the default transport for covered hosted operations. Keep narrowly defined GraphQL adapters for existing device login and useful capabilities that REST does not expose yet. Each command has a known transport; a failed authorization request never triggers a fallback to another surface.

Today REST supports ledger discovery, queries, journals, reports, vocabulary, validation errors, file operations, structured entries, linked-bank operations, archives, and API-key lifecycle. Ledger creation/deletion/rename, collaboration, Git history, and receipt workflows still have GraphQL-only gaps. These are recorded in the backend's [operation classification table](../../backend-cluster/backend-v2/src/server/api/op-class.ts).

Prioritize backend work that makes customer workflows dependable:

1. Give CLI-used operations stable OpenAPI operation identifiers and concrete response schemas. The current 50 operations lack `operationId`, and many responses are unconstrained. Generate transport types after the contract is useful; hand-design the user-facing command experience.
2. Document pagination, precise amounts, validation state, errors, and revision information. Reuse existing domain result types where possible.
3. Expose a revision-bound change operation with preview, atomic application of its supported change set, idempotency, and a returned commit/revision.
4. Add lifecycle, collaboration, and receipt capabilities in the order demonstrated customer jobs need them. Keep browser authentication and bank-link ceremonies as explicit handoffs.

Reuse the shared authorization and service boundaries. The CLI should never need internal ledger-service, Gitea-admin, or infrastructure credentials. Relevant foundations already exist in the [shared route declaration](../../backend-cluster/backend-v2/src/server/rest/v1-route.ts), [REST error translation](../../backend-cluster/backend-v2/src/server/rest/error-middleware.ts), and [repository change service](../../backend-cluster/backend-v2/src/features/ledger/service/ledger-repo-service.ts).

**6. Should we import Beancount modules, wrap their commands, or install them when used?**

Keep Python and Typer. Reuse libraries for structured accounting operations; use subprocesses where the upstream product is itself an application or needs a separate environment. We already use Beancount, Beanquery, and the vendored Fava core. A language rewrite would add migration work without fixing the main customer problems.

| Capability | Recommended reuse | Installation and execution policy |
| --- | --- | --- |
| Parse, book, validate, represent amounts, print new directives | Beancount v3 APIs | Include in the normal installation; import when its command runs |
| Local BQL | Beanquery | Include with local accounting; preserve typed results through our output layer |
| Reports | Existing vendored Fava reporting core | Reuse behind a small adapter; test compatibility with supported dependency versions |
| CSV/OFX and other configured importer workflows | Beangulp and source-specific importers | Optional import dependencies in an explicit environment; reuse importer identification, extraction, deduplication, and test harness |
| Full local Fava browser UI | Upstream Fava application | Separate environment/process; the CLI already ships a package named `fava`, so co-installation needs deliberate namespace handling |
| Embedded chat | Existing AI integration | Optional extra, loaded only for chat; external agents need no embedded chat dependency |
| Git | Installed Git executable | Delegate repository operations; provide credential setup and useful recovery instructions |

Beancount v3 split several tools into independent projects. Beangulp replaces the old ingest framework, and Beanquery provides its own query interface. This is an integration opportunity, not a reason to recreate those engines. [Beancount](https://github.com/beancount/beancount), [Beangulp](https://github.com/beancount/beangulp), [Beanquery API](https://github.com/beancount/beanquery/blob/master/beanquery/__init__.py).

Choose a normal installation that can immediately check and query a local ledger. First remove mandatory AI dependencies from that experience and make command imports lazy. Consider a smaller remote-only distribution only if installation measurements demonstrate a meaningful need. Avoid forcing the first-time local user to discover an extra before the first useful command.

Distinguish lazy imports from lazy installation. An ordinary `check`, `query`, or agent run must not silently download packages. For a known optional integration, report the missing dependency and installation command. A plugin module name alone does not identify a trusted package to install; custom Python code must come from an explicitly configured project environment. Interactive setup can offer an explicit install; unattended operation should fail promptly unless setup has been separately requested.

Use uv's existing environment and dependency machinery rather than building a package manager. Global tools run in isolated environments and do not automatically see a ledger project's importer packages. For custom importers/plugins, document a ledger project containing the CLI and its dependencies, a lockfile, and invocation through that project's `uv run`. For simple global setups, uv supports explicit extras and `--with`. Do not mutate uv-managed tool environments with ad hoc pip calls. [uv tool environments](https://docs.astral.sh/uv/concepts/tools/), [project versus tool execution](https://docs.astral.sh/uv/guides/tools/).

Keep dependency versions and provenance inspectable. Preserve Fava attribution and upstream license notices when changing distribution. Retain compatibility checks around the vendored core, including its existing use of a private Beancount loader API. [Packaging](../pyproject.toml), [Fava notice](../NOTICE.fava), [loader adapter](../src/fava/beans/load.py).

**7. How should importing work across local and hosted books?**

Separate extraction from applying changes. A CSV file is an input to a bookkeeping workflow; it is not automatically a valid set of postings.

The proposed workflow chooses a configured importer, extracts candidates against the existing ledger, identifies duplicates, surfaces uncertain categories, and produces a plan. The plan records the source file digest, importer/configuration version, target, base revision, proposed postings, validation results, and unresolved rows. Local plans can be stored in the ledger project's ignored scratch directory.

Beangulp supplies the importer framework and deduplication hooks. Its default duplicate detection is heuristic, so add persistent source transaction identifiers where available and a reviewed fallback policy for ambiguous matches. Do not equate heuristic similarity with exactly-once application. [Importer protocol and deduplication](https://github.com/beancount/beangulp/blob/master/beangulp/importer.py).

Run arbitrary Python importers on the user's machine or their explicitly configured runner. For a hosted target, retrieve the required ledger snapshot through authorized APIs, extract locally, then submit the reviewed change against that snapshot's revision. Do not upload Python code for execution in the ledger service.

For general importer output, preserve Beancount source and metadata. Convenience JSON transaction input can coexist with this path, but must reject unsupported fields rather than drop them. An import of more than 100 directives must not be silently split into apparently atomic `/entries` calls. General import-to-hosting waits for an adequate source-change contract.

Already linked bank accounts use the existing hosted bank workflow. Initial bank connection remains a browser step. Receipt extraction and optional AI categorization are explicit capabilities; they do not become prerequisites for deterministic CSV importing.

**8. What makes writing safe enough for unattended operation?**

The central artifact is the prepared change, not a confirmation prompt. A person or authorized automation policy can review and approve it; application must execute that same content against that same target and base revision.

For local changes, stage the affected content and validate the complete include graph before writing. Coordinate the final file-hash check and replacement under a project lock for participating writers. Atomic replacement alone does not prevent a concurrent overwrite, and external editors may ignore that lock; document this boundary and use an isolated checkout for unattended jobs requiring exclusive writes. Start with an atomic single-file change; advertise multi-file atomicity only after an implemented recovery or transaction mechanism proves it. Invalid or unresolved rows leave the ledger untouched by default. An explicitly requested partial mode must report every rejected row and exit nonzero.

For hosted changes, server-side validation, authorization, conflict detection, and durable idempotency are authoritative. Return the new revision and per-change result. Current REST file operations expose a blob SHA, but do not provide a general atomic multi-file, preview, or idempotency contract. Existing bank dry runs are useful precedent, not evidence that every write already supports preview. [File routes](../../backend-cluster/backend-v2/src/features/ledger/api/rest/v1/files-handler.ts), [bank routes](../../backend-cluster/backend-v2/src/features/ledger/api/rest/v1/banks-handler.ts).

Until durable idempotency exists, do not automatically retry an ambiguous timed-out append. Tell the caller the outcome is unknown and how to inspect it. Preserve existing domain deduplication for bank transactions. Deletion, publication, and permission changes require explicit intent; new hosted ledgers default to private. An automation confirmation flag never overrides server authorization or an unresolved validation failure.

**9. Can local and hosted execution produce identical results?**

Offer consistent workflow semantics for a tested set of capabilities. Do not promise universal engine equivalence.

Local execution uses Python Beancount/Beanquery/Fava. Hosted execution uses rustledger WASM plus service adapters. The hosted plugin registry implements selected Fava plugins and surfaces skipped plugins; it cannot execute arbitrary Python plugin packages installed on a user's laptop. [Hosted plugin registry](../../backend-cluster/ledger/src/foundation/rustledger/plugins/index.ts), [plugin handling](../../backend-cluster/ledger/src/foundation/rustledger/plugins/strip.ts).

Expose engine/version and supported capabilities, together with validation warnings. Test common fixtures across both paths: includes, currencies, costs/lots, prices, date filters, balance assertions, and supported plugins. Preserve source bytes outside intentional edits, including comments and metadata. For unsupported plugin-dependent ledgers, explain the difference before publishing or presenting a comparison as equivalent.

Analytical output must disclose invalid-ledger state. Default automation to failure on validation errors; an explicit option may return partial analysis with diagnostics. Silent authoritative-looking totals are unacceptable. Capability discovery and parity testing are proposed work, not existing CLI features.

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

Existing accounting skills should compose these deterministic primitives. Reconciliation and month-end close still require matching evidence and resolving uncertainty; exposing a command should not convert an unverifiable statement into an approved close.

Keep MCP for clients that use MCP. Shell-capable agents can call the CLI directly. Share behavioral expectations with the backend services rather than requiring CLI → MCP → API indirection.

**11. How should authentication, self-hosting, and pricing work?**

Retain the existing browser/device login for people. Its current session credential expires after 30 days, which reinforces the need for a separate unattended credential path. Add token input through a documented environment variable or stdin for CI, named server profiles for hosted and self-hosted deployments, and `auth status` showing credential source, expiry, and effective capabilities where discoverable. Credentials must remain bound to the intended server; selecting another profile must not forward a token there accidentally. [Device credential lifetime](../../backend-cluster/backend-v2/src/features/auth/service/cli-auth-service.ts).

Use narrow ledger-scoped API keys for unattended jobs. REST credentials can address their authorized ledgers; MCP additionally requires a ledger pin. Existing API keys cannot mint replacement keys. [Identity](../../backend-cluster/backend-v2/src/server/api/identity.ts), [API-key service](../../backend-cluster/backend-v2/src/features/apikeys/service/api-key-service.ts), [MCP credential gate](../../backend-cluster/backend-v2/src/features/ai-agent/api/mcp-route.ts).

Keep local accounting free of hosted authentication. Describe embedded chat separately: today it operates on local files but requires hosted credentials and uses a hosted AI proxy. “Local ledger” does not mean “offline AI.” [Chat command](../src/cli/commands/chat.py), [agent implementation](../src/cli/chat/agent.py).

API-key issuance currently requires a paid plan; already issued keys continue working after a subscription lapse. That is a material constraint on developer adoption. Launch documentation must state it. I recommend testing a limited developer automation allowance, with usage-based limits and paid hosted convenience, before deciding to make API access a broad acquisition channel. This is a pricing experiment requiring an explicit product decision, not a CLI workaround using browser credentials.

**12. Does supporting both targets mean building synchronization?**

It means providing a clear bridge; a new synchronization engine is a separate undertaking.

Ship direct remote commands and archive export first. Improve clone/setup using Git's existing mechanisms. Later, provide explicit status, diff, pull, and push workflows with conflict recovery; preserve the user's working tree and avoid overwriting remote changes.

Do not promise that REST login automatically authenticates Git. The current CLI clones over SSH, and the backend's Git HTTP proxy has a separate Basic-auth path. A seamless experience needs explicit SSH setup, credential-helper work, or server credential integration. [CLI clone](../src/cli/commands/ledger/app.py), [Git authentication](../../backend-cluster/backend-v2/src/features/gitea/api/git-proxy-handler.ts).

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

| Increment | Observable customer outcome | Lead and dependencies | Exit gate |
| --- | --- | --- | --- |
| 1. Dependable foundation | A new user can select a file, check/query it, and script the result; a failed write cannot look successful | CLI lead; docs/release support | Executable docs; JSON/no-input contract; explicit targets; validated local writes; private hosted creation; existing behavior migration coverage |
| 2. Useful hosted operator | A user or scoped CI job can discover a ledger, inspect its books, and export a snapshot | CLI + backend; current auth and typed v1 contracts | Live auth/permission, paging, expiry, self-hosted profile, and bounded read-retry journeys pass |
| 3. Repeatable importing | A user can prepare, review, and apply an import locally; then use the same workflow for a hosted target | CLI/import owner; backend revision/preview/idempotency work gates hosted application | Duplicate source, invalid row, stale revision, interrupted apply, metadata preservation, and repeated request scenarios pass |
| 4. Broader operations | Users can complete demonstrated collaboration, receipt, close, and Git workflows | Relevant backend/domain owners + CLI | Coverage register names every supported operation and limitation; browser and conflict recovery journeys pass |

Assign one product owner to the cross-target contract and one engineering owner to each increment. Backend changes remain separate package-scoped changes coordinated through API contracts. Existing skills receive updates once the command contract is stable.

Before promising a calendar, timebox two technical investigations: a revision-bound hosted change using the existing batch primitive, and reproducible importer/plugin environments with the vendored Fava namespace. Their results determine the largest dependencies and effort. Protect the first increment from scope expansion into an SDK framework, plugin marketplace, new accounting engine, or background sync service.

**15. How will we know the enhancement worked?**

The primary outcome is retained successful bookkeeping workflows per ledger owner. Command invocation count and agent token usage are weak substitutes: a broken loop can generate many calls.

Proposed release and pilot gates, not measured baselines:

- At least 10 of 12 pilot participants complete their assigned local or hosted first-value journey without engineering intervention; median time from documented installation to a validated result is under five minutes on supported systems.
- Every documented automation example passes without a terminal, including failures and expired credentials. The tested import suite produces no duplicate application or silent partial success, and no lost concurrent update within the supported local locking and server revision contracts.
- Warm `--help` and `--version` have a p95 below 500 ms on the declared reference machines, make no network calls, and do not initialize AI integrations. Measure cold installation separately before setting a download/size target.
- In the four-week pilot, at least 6 of 12 participants repeat a real workflow in three distinct weeks. Segment results by local, hosted, and agent/CI use; small samples guide iteration rather than prove market size.
- Track hosted automation activation, paid conversion, and auth/import support burden against a measured baseline. Local usage measurement is opt-in and excludes ledger contents, filenames, payees, amounts, queries, and tokens.

The largest risks are engine differences, Python environment friction, incomplete REST contracts, ambiguous writes, and insufficient customer demand. Each has an explicit response above: capabilities and fixtures, uv-managed environments, contract work, revision/idempotency semantics, and observed pilot journeys. Preserve current command compatibility where safe; document intentional changes such as private creation defaults and nonzero partial-failure exits, and provide a migration guide before declaring a stable automation interface.

**16. Internal FAQ: what is the current CLI specification?**

*Amended 2026-09-07 (w2/m24).* The inventory below is a **historical** record of the pre-rename CLI, kept because the rest of this document argues against it. Milestone w2/m24 has since renamed the distribution to `beancount-io` and the executable to `bea`, replaced `read`/`write` with `list`/`add` and `chat` with the optional `ask` extra, removed `ledger init` in favor of `ledger create --clone`, defaulted hosted creation to private, added global `--file` / `--json` / `--no-input` / `--yes` / `--version` with the `--file` > `BEA_FILE` > `./main.bean` resolution order, defined the 0/1/2/3/4 exit-code table, made bulk writes all-or-nothing, and moved per-user state to `~/.config/bea/` behind `BEA_*` variables. `docs/USAGE.md` describes the shipped behavior; the mentions of `beancount-cli` below are deliberate history.

This baseline describes version `0.1.0` at the source revision recorded above. It was checked against command registration, implementation, and the existing executable's help/argument parsing. It is an inventory of current behavior, not a promise that every behavior is desirable or that hosted workflows have passed live verification.

**What package, runtime, and dependencies do we ship?**

| Area | Current specification |
| --- | --- |
| Package and executable | `beancount-cli`, version `0.1.0`; entry point `cli.main:app` |
| Runtime and packaging | Python `>=3.12`; Typer command tree; Hatchling builds a wheel containing `cli` and the vendored `fava` package |
| Accounting dependencies | `beancount>=3.2`, `beanquery>=0.2`; vendored Fava supplies local loading/reporting behavior |
| HTTP and models | `httpx>=0.27`, `pydantic>=2.0`, `pydantic-settings>=2.0`; synchronous GraphQL client generated with Ariadne Codegen |
| Other mandatory dependencies | `typer>=0.12`, `ply>=3.11`, `pyexcel>=0.7.3`, `python-dateutil>=2.9.0`, `openai>=1.0`, `pydantic-ai>=0.3`, `prompt-toolkit>=3.0`, `python-frontmatter>=1.1` |
| Dependency management | Package-local `uv.lock` for development; no runtime optional extras. Beangulp is not a declared dependency. Chat dependencies are imported during top-level command registration. |
| Documented distribution | `uv tool install 'git+https://github.com/bex-co/beancount-io#subdirectory=cli'`; local checkout installation is also documented. Upgrade uses `uv tool install --reinstall` with the same source. |

These are declared dependency ranges, not the exact versions of every user's installation. See [package metadata](../pyproject.toml), [lockfile](../uv.lock), [installation guide](../README.md), and [command registration](../src/cli/main.py).

**Which commands exist, and what are their defaults?**

The executable registers **39 leaf commands**: four standalone commands, three auth commands, five ledger commands, eleven directive readers, twelve directive writers, and four reports. Group names alone are not additional operations.

| Command or family | Current inputs and behavior |
| --- | --- |
| `check` | No command-specific arguments/options. Loads CWD's `main.bean`; prints success or source/line diagnostics and exits 1 for ledger errors. |
| `format [DIRECTORY]` | Directory defaults to `.`. Recursively formats `*.bean` files in place; `--dry-run` lists changes without writing. It does not discover files by the ledger's include graph or scan the `.beancount` extension. |
| `query [QUERY_STRING]` | Runs BQL on local `main.bean` and prints a text table. Omitting the query starts Beanquery's interactive shell. |
| `chat [QUESTION]` | Uses local `main.bean` with hosted AI. `--print/-p` answers once and requires a question; otherwise opens a REPL with QUESTION as editable initial input. |
| `auth login`, `auth logout`, `auth whoami` | Browser/device sign-in, logout, and human-readable Email/Username/Tier. No command-specific options. |
| `ledger create NAME` | Hosted creation; optional `--description/-d`, `--private/--public`. Default is **public**. It does not download or clone the ledger. |
| `ledger init NAME` | Hosted creation followed by an attempted SSH clone; creation options plus `--dir`. Default clone directory is CWD / ledger name. This is not an offline local-ledger scaffold. |
| `ledger list` | `--limit/-l` defaults to 50. Requests the first page; no exposed `--page`, cursor, or `--all`. |
| `ledger clone OWNER/NAME` | Fetches hosted metadata, then runs `git clone` using the SSH URL; optional `--dir`. Requires Git and separately working SSH access. |
| `ledger delete OWNER/NAME` | Immediately requests hosted deletion. No confirmation, preview, or `--yes` option. |
| `read TYPE` | Eleven types listed below. `--limit/-l` defaults to 50; optional inclusive `--from-date` and `--to-date`. Account-bearing types accept substring `--account/-a`; price/commodity accept exact `--currency/-c`. No paging or machine output. |
| `write TYPE` | Eleven types listed below. Requires `--date` plus type-specific flags; appends to local `main.bean`. No general preview or post-write ledger check. |
| `write transactions --from PATH` | Reads a JSON array matching `TransactionDirective`, validates and appends each row independently. This is not a CSV/OFX bank importer or a general stdin interface. |
| `report overview`, `report income-statement`, `report balance-sheet`, `report trial-balance` | Local Fava-derived text reports. All accept `--conversion/-x` (default `USD`), `--time/-t`, and `--account/-a`. The first three also accept `--interval/-i` (default `monthly`); trial balance does not. |

The eleven directive names shared by `read` and individual `write` commands are `transaction`, `open`, `close`, `balance`, `pad`, `note`, `event`, `price`, `commodity`, `document`, and `custom`.

Top-level options are `-h/--help`, `--install-completion`, and `--show-completion`. There is no implemented global `--version`, `--file`, `--ledger`, `--json`, `--output`, `--no-input`, or profile selector. `format --dry-run` is a specific existing option, not a general write-preview facility. Sources: [local commands](../src/cli/commands), [ledger commands](../src/cli/commands/ledger/app.py), [report options](../src/cli/commands/report.py).

**How are files, servers, and credentials selected?**

Local check/query/read/write/report/chat commands use `Path("main.bean")` relative to the current working directory. Loaders resolve includes where the operation uses a full ledger load; writes append to the entry file itself. There is no project-root search or configured entry-file override. Formatting is the exception: it takes an explicit directory.

`BEANCOUNT_API_URL` defaults to `https://api.v3.beancount.io`; `BEANCOUNT_DASHBOARD_URL` defaults to `https://beancount.io`. Hosted account/ledger calls use the API base plus `/api-gateway/` through the generated GraphQL client. The current CLI does not call public v1 REST for those operations. Environment overrides exist, but named profiles, project configuration discovery, and automatic `.env` loading are not configured. [Settings](../src/cli/config.py), [API client](../src/cli/api/client.py).

Login prints a public user code, opens the dashboard's `/auth/login/device` page, and polls with a private device code. The backend allows a ten-minute authorization ceremony and issues a 30-day CLI session credential; the client stores and checks the returned expiry. Credentials live in one `~/.beancount-cli/credentials.json` containing `token` and `expireAt`, written by atomic replacement with directory mode 0700 and file mode 0600. There is no automatic refresh, token environment override, key-management command, or separate credential slot per server. Logout attempts remote revocation but suppresses revocation errors before clearing the local file and reporting success. [Device flow](../src/cli/auth/device_flow.py), [credential storage](../src/cli/auth/credentials.py), [auth commands](../src/cli/commands/auth.py), [server lifetimes](../../backend-cluster/backend-v2/src/features/auth/service/cli-auth-service.ts).

**What is the current transaction and write contract?**

`write transaction` requires `--date YYYY-MM-DD` and repeated `--posting 'ACCOUNT NUMBER CURRENCY'`; optional flags supply payee, narration, transaction flag (default `*`), tags, and links. This shorthand cannot express cost basis or posting prices. The underlying transaction model, accessible through bulk JSON, does support Decimal amounts, posting costs/prices/flags, tags, and links, but omits transaction and posting metadata. It is not a lossless source-editing format.

Other writers take direct flags: account/currencies for opening, account/amount for balance assertions, account/source for padding, and so on. Custom values use repeatable `--value` with `text:`, `number:`, `amount:`, or `account:` prefixes. Document writes append a document directive; they do not upload the referenced file.

The writer serializes with Beancount's printer and appends directly. It does not stage changes, validate the complete resulting ledger, deduplicate, lock, or provide transaction-wide rollback. Bulk JSON row failures leave already appended rows in place and can still return exit 0. The directive reader discards loader errors; report commands do not print the loader errors they receive. Run `check` separately to inspect ledger validity, while recognizing that it cannot undo a previous write. [Write commands](../src/cli/commands/write.py), [models](../src/cli/directives/models.py), [writer](../src/cli/directives/writer.py), [reader](../src/cli/directives/reader.py).

**What exactly does the current AI feature do?**

Chat requires a stored hosted credential and hardcodes `gpt-4o` through `{api_url}/api-gateway/ai/openai/`; there are no model/provider selection flags. Its tools run local BQL, append raw directive text, and fetch skill instructions. Queries execute locally, but prompts and tool results participate in hosted model requests.

Interactive writes offer Yes, No, Yes to all, or Deny all; session-wide choices last for the running REPL. Approved text is appended without a ledger check. In `--print` mode, the write tool skips writing because no confirmation callback is installed. Answers render as Markdown, not JSON. Prompt history is stored in `~/.beancount-cli/chat_history`; model conversation history is held in the running session.

Skills are discovered from immediate subdirectories of CWD's `.agents/skills/`, then `~/.beancount-cli/agent/skill/`, with project names taking precedence. Names/descriptions are indexed in the prompt; full bodies load on request. Malformed files are skipped. `allowed-tools` is parsed metadata, not an enforced permission boundary. These instruction files do not register new CLI subcommands. [Chat command](../src/cli/commands/chat.py), [agent tools](../src/cli/chat/agent.py), [REPL](../src/cli/chat/repl.py), [skill loader](../src/cli/chat/skills.py).

**What can automation and tests rely on today?**

Ordinary output is text/tables on stdout; the shared error helper prints `Error: ...` on stderr and exits 1. Argument parsing can exit 2. There is no versioned JSON schema or documented error-category mapping. Besides bulk row failures, `ledger init` can report overall success after creation even when cloning fails, and logout success does not prove remote revocation. Interactive BQL, browser login, and chat have no shared no-input mode. [Output helper](../src/cli/output.py), [ledger implementation](../src/cli/commands/ledger/app.py).

The package's verification gate is `make check-all`: Ruff lint, Vulture dead-code detection, Ruff format check, strict mypy over `src/cli`, and pytest. Existing test files cover credentials/device flow, writer serialization, output/utilities, chat/skills, Fava imports, and forecast logic. That inventory does not establish complete command coverage or production API conformance. Client code generation reads the GraphQL schema/operations and regenerates `src/cli/api/gql_client`; it is not OpenAPI generation. [Makefile](../Makefile), [tests](../tests), [codegen configuration](../pyproject.toml).

**Which documented or proposed capabilities must we avoid presenting as current?**

The existing [usage guide](USAGE.md) promises `--file`, universal `--json`, and an archive/project-setup behavior for `ledger create` that the implementation does not provide. Read-only executable probes confirmed that `--version`, global `--file`, and `read transaction --json` are rejected. Use the inventory above and command help as the baseline until the guide and implementation converge.

There are no registered native commands for local initialization, bank-export importing, reconciliation, migration, month-end close, remote accounting reports/queries, general remote file editing, archive export, sync, doctor, context management, or capability/schema discovery. The repository has skills and backend operations related to several of these jobs; their existence does not make them current CLI features. The release increments in FAQ 14 describe the work needed to move beyond this baseline.
