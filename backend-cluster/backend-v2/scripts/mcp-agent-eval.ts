/**
 * MCP agent journeys — real coding-agent clients against the hosted MCP endpoint.
 *
 *   BEANCOUNT_MCP_TOKEN=bcio_… BEANCOUNT_MCP_LEDGER=<owner>/mcp-agent-eval \
 *   [BEANCOUNT_MCP_READONLY_TOKEN=bcio_…] \
 *     yarn mcp:agent-eval [--client claude|codex|all] [--journey <id>[,<id>…]|all] [--attempts 1]
 *                         [--timeout-sec 300] [--max-mcp-calls 40]
 *                         [--claude-model <model>] [--codex-model <model>]
 *                         [--claude-bin <path>] [--codex-bin <path>]
 *                         [--url https://beancount.io/api-gateway/mcp] [--out <dir>]
 *
 * Every attempt is a live, billed client session. Nothing here runs in CI; the
 * scorers, parsers, and process limits are covered deterministically by
 * `scripts/__tests__/mcp-agent-eval.test.ts`.
 *
 * Each attempt resets the dedicated eval ledger to `evals/mcp-agent/fixtures`,
 * runs one journey through one client — typed, or by selecting a server prompt
 * — across one or more user turns, reads the ledger back, and scores the final
 * answers and the persisted state. The harness refuses to run unless each
 * credential reaches exactly one ledger named `mcp-agent-eval[-suffix]`, so a
 * reset can never touch anything else. See docs/mcp-agent-eval.md.
 */

import { spawnSync } from "node:child_process";
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { MCP_PROMPTS } from "@/features/ai-agent/api/mcp-prompts";
import type { Identity } from "@/server/api/identity";
import { type BoundedRun, runBounded } from "./mcp-agent-eval/process";
import {
  type Assertion,
  classify,
  confirmationAssertion,
  type Journey,
  type LedgerState,
  matchesFixture,
  type Outcome,
  redact,
  scoreAnswer,
  scoreState,
  unexplainedCommits,
  unsafeTargetReason,
} from "./mcp-agent-eval/score";
import {
  type ClientName,
  combineTurns,
  MCP_SERVER_NAME,
  mcpCallsInLine,
  parseClaudeStream,
  parseCodexStream,
  type RunMetrics,
} from "./mcp-agent-eval/transcripts";

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const EVAL_DIR = path.join(PACKAGE_ROOT, "evals", "mcp-agent");
const DEFAULT_URL = "https://beancount.io/api-gateway/mcp";
const TOKEN_ENV = "BEANCOUNT_MCP_TOKEN";
const READ_ONLY_TOKEN_ENV = "BEANCOUNT_MCP_READONLY_TOKEN";
const LEDGER_ENV = "BEANCOUNT_MCP_LEDGER";
const CLIENTS: readonly ClientName[] = ["claude", "codex"];

interface Suite {
  readonly fixture: string;
  readonly ledgerFile: string;
  readonly journeys: readonly Journey[];
}

export function loadSuite(): { suite: Suite; fixture: string } {
  const suite = JSON.parse(
    readFileSync(path.join(EVAL_DIR, "journeys.json"), "utf8"),
  ) as Suite;
  return {
    suite,
    fixture: readFileSync(path.join(EVAL_DIR, suite.fixture), "utf8"),
  };
}

interface InstalledClient {
  readonly bin: string;
  readonly version: string;
}

/** How the first turn reached the client. */
type Invocation = "typed" | "native prompt" | "retrieved prompt";

export interface AttemptResult {
  readonly journey: string;
  readonly client: ClientName;
  readonly attempt: number;
  /** Always a live client run; replayed or mocked runs are never reported here. */
  readonly source: "live";
  readonly invocation: Invocation;
  readonly userTurns: number;
  readonly outcome: Outcome;
  readonly reason: string | null;
  readonly wallMs: number | null;
  readonly exitCode: number | null;
  readonly model: {
    readonly requested: string | null;
    readonly reported: string | null;
  };
  readonly metrics: RunMetrics | null;
  readonly assertions: readonly Assertion[];
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const withLedger = (text: string, target: string) =>
  text.split("{ledger}").join(target);

/**
 * Claude Code selects server prompts natively. Codex has no prompt picker, so
 * its documented equivalent is retrieving the prompt and sending its text.
 */
export function invocationFor(journey: Journey, client: ClientName): Invocation {
  if (!journey.invoke) return "typed";
  return client === "claude" ? "native prompt" : "retrieved prompt";
}

/**
 * The installed client, not a package binary: `yarn` puts this package's
 * `node_modules/.bin` first on PATH, and a dependency installs an older `codex`
 * there, so a bare `codex` would silently benchmark the wrong client.
 */
export function resolveClient(
  name: string,
  override?: string,
  searchPath = process.env.PATH ?? "",
  excludedRoot = path.join(PACKAGE_ROOT, "node_modules"),
): string | null {
  if (override) return override;
  for (const dir of searchPath.split(path.delimiter)) {
    if (!dir) continue;
    const resolved = path.resolve(dir);
    if (
      resolved === excludedRoot ||
      resolved.startsWith(`${excludedRoot}${path.sep}`)
    )
      continue;
    const candidate = path.join(resolved, name);
    try {
      accessSync(candidate, constants.X_OK);
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // Not in this directory.
    }
  }
  return null;
}

/**
 * Claude Code offers each server prompt as `/mcp__<server>__<prompt>`, taking
 * its arguments positionally in the order the server declares them.
 */
export function slashCommand(
  name: string,
  args: Readonly<Record<string, string>>,
  declared: readonly string[],
): string {
  const unknown = Object.keys(args).filter((key) => !declared.includes(key));
  if (unknown.length)
    throw new Error(`prompt ${name} has no argument ${unknown.join(", ")}`);
  const values: (string | undefined)[] = declared.map((key) => args[key]);
  while (values.length && values[values.length - 1] === undefined)
    values.pop();
  const skipped = values.indexOf(undefined);
  if (skipped >= 0)
    throw new Error(
      `prompt ${name}: positional arguments cannot skip ${declared[skipped]}`,
    );
  if (values.some((value) => /\s/.test(value ?? "")))
    throw new Error(
      `prompt ${name}: slash-command arguments cannot contain whitespace`,
    );
  return [`/mcp__${MCP_SERVER_NAME}__${name}`, ...values].join(" ");
}

/** The command line for one turn. The credential travels only in the environment. */
export function clientCommand(
  client: ClientName,
  text: string,
  options: {
    readonly bin: string;
    readonly url: string;
    readonly model?: string;
    readonly workdir: string;
    readonly lastMessagePath: string;
    /** The session to continue; the first turn starts a new one. */
    readonly resume?: string | null;
    /** A session nothing will resume need not be kept. */
    readonly ephemeral?: boolean;
  },
): { command: string; args: string[] } {
  if (client === "claude") {
    const config = {
      mcpServers: {
        [MCP_SERVER_NAME]: {
          type: "http",
          url: options.url,
          headers: { Authorization: `Bearer \${${TOKEN_ENV}}` },
        },
      },
    };
    return {
      command: options.bin,
      args: [
        "-p",
        text,
        "--mcp-config",
        JSON.stringify(config),
        "--strict-mcp-config",
        "--allowedTools",
        `mcp__${MCP_SERVER_NAME}`,
        "--permission-mode",
        "dontAsk",
        "--output-format",
        "stream-json",
        "--verbose",
        ...(options.resume ? ["--resume", options.resume] : []),
        ...(options.model ? ["--model", options.model] : []),
      ],
    };
  }
  const shared = [
    "--json",
    "--ignore-user-config",
    // Claude Code gets only the eval server. Codex also offers the ChatGPT
    // account's apps (a GitHub connector fetched each prompt's playbook) and a
    // shell that reads the whole disk, so both are off for parity (w5/963).
    "--disable",
    "apps",
    "--disable",
    "shell_tool",
    "--skip-git-repo-check",
    "-o",
    options.lastMessagePath,
    "-c",
    `mcp_servers.${MCP_SERVER_NAME}.url=${JSON.stringify(options.url)}`,
    "-c",
    `mcp_servers.${MCP_SERVER_NAME}.bearer_token_env_var=${JSON.stringify(TOKEN_ENV)}`,
    "-c",
    'approval_policy="never"',
    "-c",
    'sandbox_mode="read-only"',
    ...(options.model ? ["-m", options.model] : []),
  ];
  if (options.resume) {
    // `exec resume` has no -C; the process's working directory selects the session.
    return {
      command: options.bin,
      args: ["exec", "resume", ...shared, options.resume, text],
    };
  }
  return {
    command: options.bin,
    args: [
      "exec",
      ...shared,
      ...(options.ephemeral ? ["--ephemeral"] : []),
      "-C",
      options.workdir,
      text,
    ],
  };
}

const known = (values: readonly (number | null)[]) =>
  values.filter((v): v is number => typeof v === "number");

const mean = (values: readonly (number | null)[]) => {
  const numbers = known(values);
  return numbers.length
    ? numbers.reduce((a, b) => a + b, 0) / numbers.length
    : null;
};

const median = (values: readonly (number | null)[]) => {
  const numbers = known(values).sort((a, b) => a - b);
  if (!numbers.length) return null;
  const mid = Math.floor(numbers.length / 2);
  return numbers.length % 2
    ? numbers[mid]
    : (numbers[mid - 1] + numbers[mid]) / 2;
};

/** Per journey and client; a metric no attempt reported stays null. */
export function summarize(results: readonly AttemptResult[]) {
  const groups = new Map<string, AttemptResult[]>();
  for (const r of results) {
    const key = `${r.journey}|${r.client}`;
    const group = groups.get(key);
    if (group) group.push(r);
    else groups.set(key, [r]);
  }
  return [...groups.values()].map((rs) => {
    const count = (outcome: Outcome) =>
      rs.filter((r) => r.outcome === outcome).length;
    const metric = (pick: (m: RunMetrics) => number | null) =>
      rs.map((r) => (r.metrics ? pick(r.metrics) : null));
    return {
      journey: rs[0].journey,
      client: rs[0].client,
      invocation: rs[0].invocation,
      attempts: rs.length,
      pass: count("pass"),
      fail: count("fail"),
      incomplete: count("incomplete"),
      error: count("error"),
      medianWallMs: median(rs.map((r) => r.wallMs)),
      meanMcpCalls: mean(metric((m) => m.mcpCalls)),
      // Calls to anything but the eval server, so a client that reaches
      // outside it shows how often.
      meanOutsideCalls: mean(metric((m) => m.otherToolCalls)),
      meanTurns: mean(metric((m) => m.turns)),
      meanCostUsd: mean(metric((m) => m.costUsd)),
      meanInputTokens: mean(metric((m) => m.inputTokens)),
      meanOutputTokens: mean(metric((m) => m.outputTokens)),
    };
  });
}

// --- hosted ledger access ----------------------------------------------------

async function connect(url: string, token: string): Promise<Client> {
  const client = new Client({ name: "mcp-agent-eval", version: "1.0.0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    }),
  );
  return client;
}

async function callTool<T>(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const response = await client.callTool({ name, arguments: args });
  const payload = response.structuredContent as
    | {
        ok?: boolean;
        result?: unknown;
        error?: { code?: string; message?: string };
      }
    | undefined;
  if (response.isError || !payload?.ok) {
    throw new Error(
      `${name} failed: ${payload?.error?.code ?? "no structured result"} ${payload?.error?.message ?? ""}`.trim(),
    );
  }
  return payload.result as T;
}

const accessibleLedgers = async (client: Client) =>
  (await callTool<{ fullName: string }[]>(client, "listLedgers", {})).map(
    (l) => l.fullName,
  );

const listFiles = async (client: Client) =>
  (
    await callTool<{ path: string; type: string }[]>(
      client,
      "listLedgerFiles",
      {},
    )
  ).map((e) => (e.type === "file" ? e.path : `${e.path}/`));

/** Commit ids on the eval ledger, newest first; null when they cannot be read. */
async function readCommitIds(
  client: Client,
  target: string,
): Promise<string[] | null> {
  try {
    const [owner, name] = target.split("/");
    const read = await client.readResource({
      uri: `beancount://${owner}/${name}/commits?limit=50`,
    });
    const text = (read.contents[0] as { text?: unknown } | undefined)?.text;
    const parsed: unknown = typeof text === "string" ? JSON.parse(text) : null;
    return Array.isArray(parsed)
      ? parsed.flatMap((c) =>
          typeof (c as { sha?: unknown })?.sha === "string"
            ? [(c as { sha: string }).sha]
            : [],
        )
      : null;
  } catch {
    return null;
  }
}

async function readState(
  client: Client,
  ledgerFile: string,
): Promise<LedgerState> {
  try {
    const [files, [file], check] = await Promise.all([
      listFiles(client),
      callTool<{ content?: unknown; endLine?: number; totalLines?: number }[]>(
        client,
        "readLedgerFiles",
        { files: [{ path: ledgerFile }] },
      ),
      callTool<{ errors?: unknown[] }>(client, "checkLedger", {}),
    ]);
    if (!file || typeof file.content !== "string")
      throw new Error(`${ledgerFile} returned no content`);
    if (
      file.totalLines !== undefined &&
      file.endLine !== undefined &&
      file.endLine < file.totalLines
    ) {
      throw new Error(`${ledgerFile} was returned truncated`);
    }
    if (!Array.isArray(check.errors))
      throw new Error("checkLedger returned no error list");
    return {
      ok: true,
      files,
      content: file.content,
      errorCount: check.errors.length,
    };
  } catch (error) {
    return { ok: false, reason: message(error) };
  }
}

/** Restores the fixture. `known` is a state read since the last write, which saves a round of reads. */
async function resetLedger(
  client: Client,
  suite: Suite,
  fixture: string,
  known?: LedgerState,
): Promise<void> {
  const before = known?.ok ? known : await readState(client, suite.ledgerFile);
  if (matchesFixture(before, fixture, suite.ledgerFile)) return;
  const listed = before.ok ? before.files : await listFiles(client);
  const directories = listed.filter((p) => p.endsWith("/"));
  if (directories.length) {
    throw new Error(
      `the eval ledger has directories (${directories.join(", ")}); remove them by hand`,
    );
  }
  const description = "Reset the mcp-agent-eval fixture";
  await callTool(
    client,
    listed.includes(suite.ledgerFile) ? "updateLedgerFiles" : "createLedgerFiles",
    { description, files: [{ path: suite.ledgerFile, content: fixture }] },
  );
  const extra = listed.filter((p) => p !== suite.ledgerFile);
  if (extra.length) {
    await callTool(client, "deleteLedgerFiles", {
      description,
      files: extra.map((path) => ({ path })),
    });
  }
  const after = await readState(client, suite.ledgerFile);
  if (!after.ok) throw new Error(`could not verify the reset: ${after.reason}`);
  if (!matchesFixture(after, fixture, suite.ledgerFile))
    throw new Error("the reset did not restore the fixture exactly");
}

async function retrievePrompt(
  client: Pick<Client, "getPrompt">,
  invoke: NonNullable<Journey["invoke"]>,
): Promise<string> {
  const result = await client.getPrompt({
    name: invoke.name,
    arguments: { ...invoke.args },
  });
  return result.messages
    .map((m) => {
      const content = m.content as { type: string; text?: string };
      return content.type === "text" ? (content.text ?? "") : "";
    })
    .join("\n\n");
}

/**
 * Clients receive the deployed prompts, so a playbook repaired in this working
 * tree changes nothing a client sees until it is deployed. Names every invoked
 * prompt whose served text differs from what this checkout renders for the
 * same arguments and ledger pin.
 */
export async function promptDrift(
  client: Pick<Client, "getPrompt">,
  journeys: readonly Journey[],
  target: string,
): Promise<string[]> {
  // Only the ledger pin shapes a playbook's text.
  const identity = { ledgerScope: target } as Identity;
  const drifted = new Set<string>();
  for (const { invoke } of journeys) {
    if (!invoke || drifted.has(invoke.name)) continue;
    const local = MCP_PROMPTS.find((p) => p.name === invoke.name)?.build(
      { ...invoke.args },
      identity,
    );
    if (local !== (await retrievePrompt(client, invoke)))
      drifted.add(invoke.name);
  }
  return [...drifted];
}

// --- one attempt ---------------------------------------------------------------

interface RunContext {
  readonly harness: Client;
  readonly suite: Suite;
  readonly fixture: string;
  readonly target: string;
  readonly url: string;
  readonly env: NodeJS.ProcessEnv;
  readonly token: string;
  readonly readOnlyToken: string | null;
  /** Each server prompt's argument names, in declared order. */
  readonly promptArgs: Readonly<Record<string, readonly string[]>>;
  readonly installed: Partial<Record<ClientName, InstalledClient | null>>;
  readonly models: Partial<Record<ClientName, string>>;
  readonly timeoutSec: number;
  readonly maxMcpCalls: number;
  readonly signal: AbortSignal;
  readonly transcriptDir: string;
  readonly scrub: (text: string) => string;
}

function incompleteReasonFor(
  ctx: RunContext,
  client: ClientName,
  run: BoundedRun,
  metrics: RunMetrics,
): string | null {
  const requested = ctx.models[client];
  if (run.spawnError) return `could not start ${client}: ${run.spawnError}`;
  if (run.cancelled) return "cancelled";
  if (run.timedOut) return `timed out after ${ctx.timeoutSec}s`;
  if (run.limitReason) return run.limitReason;
  if (metrics.mcpServerConnected === false)
    return "the client did not connect to the MCP server";
  // An alias such as "sonnet" cannot be compared with the full id a client reports.
  if (
    requested?.includes("-") &&
    metrics.reportedModel &&
    metrics.reportedModel !== requested
  ) {
    return `the client used ${metrics.reportedModel}, not the requested ${requested}`;
  }
  if (!metrics.finalAnswer) {
    const stderr = run.stderrTail.trim();
    const details = [
      `exit ${run.exitCode ?? "none"}`,
      metrics.clientError,
      stderr && `stderr: ${stderr.slice(-300)}`,
    ];
    return `no final answer (${details.filter(Boolean).join("; ")})`;
  }
  return null;
}

async function firstTurnText(
  ctx: RunContext,
  journey: Journey,
  invocation: Invocation,
): Promise<string> {
  if (invocation === "typed")
    return withLedger(journey.prompt ?? "", ctx.target);
  const invoke = journey.invoke as NonNullable<Journey["invoke"]>;
  return invocation === "native prompt"
    ? slashCommand(
        invoke.name,
        invoke.args ?? {},
        ctx.promptArgs[invoke.name] ?? [],
      )
    : retrievePrompt(ctx.harness, invoke);
}

interface TurnsOutcome {
  readonly turns: RunMetrics[];
  readonly runs: BoundedRun[];
  readonly gate: Assertion[];
  readonly transcript: string;
  readonly incomplete: string | null;
}

/** Sends each user turn in one session, stopping at the first turn that did not finish. */
async function runTurns(
  ctx: RunContext,
  journey: Journey,
  client: ClientName,
  bin: string,
  token: string,
  texts: readonly string[],
  workdir: string,
): Promise<TurnsOutcome> {
  const lastMessagePath = path.join(workdir, "last-message.txt");
  const env = { ...ctx.env, [TOKEN_ENV]: token };
  const turns: RunMetrics[] = [];
  const runs: BoundedRun[] = [];
  const gate: Assertion[] = [];
  const transcript: string[] = [];
  let sessionId: string | null = null;
  let calls = 0;
  let incomplete: string | null = null;

  for (const [turn, text] of texts.entries()) {
    if (turn > 0 && !sessionId) {
      incomplete = `turn ${turn + 1}: the client reported no session to continue`;
      break;
    }
    if (
      journey.confirmationTurn !== undefined &&
      turn === journey.confirmationTurn + 1
    ) {
      const before = await readState(ctx.harness, ctx.suite.ledgerFile);
      gate.push(
        confirmationAssertion(ctx.fixture, ctx.suite.ledgerFile, before),
      );
    }
    rmSync(lastMessagePath, { force: true });
    const { command, args } = clientCommand(client, text, {
      bin,
      url: ctx.url,
      model: ctx.models[client],
      workdir,
      lastMessagePath,
      resume: turn > 0 ? sessionId : null,
      ephemeral: texts.length === 1,
    });
    const run = await runBounded({
      command,
      args,
      cwd: workdir,
      env,
      timeoutMs: ctx.timeoutSec * 1000,
      signal: ctx.signal,
      onLine: (line) => {
        calls += mcpCallsInLine(client, line);
        return calls > ctx.maxMcpCalls
          ? `stopped after exceeding ${ctx.maxMcpCalls} MCP calls`
          : null;
      },
    });
    runs.push(run);
    transcript.push(
      JSON.stringify({ type: "harness.turn", turn: turn + 1 }),
      run.stdout,
    );
    const lines = run.stdout.split("\n");
    const metrics =
      client === "claude"
        ? parseClaudeStream(lines)
        : parseCodexStream(
            lines,
            existsSync(lastMessagePath)
              ? readFileSync(lastMessagePath, "utf8")
              : null,
          );
    turns.push(metrics);
    sessionId = metrics.sessionId ?? sessionId;
    const reason = incompleteReasonFor(ctx, client, run, metrics);
    if (reason) {
      incomplete = texts.length > 1 ? `turn ${turn + 1}: ${reason}` : reason;
      break;
    }
  }
  return {
    turns,
    runs,
    gate,
    transcript: transcript.join("\n"),
    incomplete,
  };
}

async function runAttempt(
  ctx: RunContext,
  journey: Journey,
  client: ClientName,
  attempt: number,
  known?: LedgerState,
): Promise<{ result: AttemptResult; state?: LedgerState }> {
  const invocation = invocationFor(journey, client);
  const requested = ctx.models[client] ?? null;
  const result = (
    fields: Partial<AttemptResult> & { outcome: Outcome },
  ): AttemptResult => ({
    journey: journey.id,
    client,
    attempt,
    source: "live",
    invocation,
    userTurns: 0,
    reason: null,
    wallMs: null,
    exitCode: null,
    model: { requested, reported: null },
    metrics: null,
    assertions: [],
    ...fields,
  });
  const bail = (outcome: Outcome, reason: string) => ({
    result: result({ outcome, reason }),
  });

  const installed = ctx.installed[client];
  if (!installed) return bail("incomplete", `${client} is not installed or not on PATH`);
  const token =
    journey.credential === "read-only" ? ctx.readOnlyToken : ctx.token;
  if (!token)
    return bail(
      "incomplete",
      `set ${READ_ONLY_TOKEN_ENV} to a read-only key pinned to the eval ledger`,
    );

  // Build the turns before touching the ledger: a malformed journey fails the
  // same way every attempt and should not cost a reset.
  let texts: string[];
  try {
    texts = [
      await firstTurnText(ctx, journey, invocation),
      ...(journey.followUps ?? []).map((t) => withLedger(t, ctx.target)),
    ];
  } catch (error) {
    return bail("error", `could not build the first turn: ${message(error)}`);
  }
  try {
    await resetLedger(ctx.harness, ctx.suite, ctx.fixture, known);
  } catch (error) {
    return bail("error", `fixture reset failed: ${message(error)}`);
  }

  // The ledger is shared with whatever else writes to it, so note where its
  // history stood once the fixture was restored (w5/961).
  const commitsBefore = await readCommitIds(ctx.harness, ctx.target);

  const workdir = mkdtempSync(path.join(tmpdir(), "mcp-agent-eval-"));
  try {
    const run = await runTurns(
      ctx,
      journey,
      client,
      installed.bin,
      token,
      texts,
      workdir,
    );
    writeFileSync(
      path.join(ctx.transcriptDir, `${journey.id}-${client}-${attempt}.jsonl`),
      ctx.scrub(run.transcript),
    );
    const metrics = combineTurns(run.turns);
    // Read state even for an incomplete run: an interrupted write is still a write.
    const state = await readState(ctx.harness, ctx.suite.ledgerFile);
    const assertions = [
      ...scoreAnswer(metrics.finalAnswer ?? "", journey.facts),
      ...run.gate,
      ...scoreState(journey, ctx.fixture, ctx.suite.ledgerFile, state),
    ];
    const failed = assertions.filter((a) => !a.ok).map((a) => a.detail);
    const foreign = unexplainedCommits(
      commitsBefore,
      await readCommitIds(ctx.harness, ctx.target),
      metrics.mcpWrites,
    );
    const last = run.runs[run.runs.length - 1];
    // A stopped client may still have a write in flight, so only a run that
    // ended on its own leaves a state the next reset can trust.
    const endedOnItsOwn =
      last !== undefined && !last.timedOut && !last.cancelled && !last.limitReason;
    return {
      result: result({
        // A commit nobody in this attempt made is not the client's failure.
        outcome: foreign > 0 ? "error" : classify(run.incomplete, assertions),
        reason:
          foreign > 0
            ? `ledger written outside this attempt: ${foreign} commit(s) that no write call of the client accounts for`
            : (run.incomplete ?? (failed.length ? failed.join("; ") : null)),
        userTurns: run.turns.length,
        wallMs: run.runs.reduce((ms, r) => ms + r.elapsedMs, 0),
        exitCode: last?.exitCode ?? null,
        model: { requested, reported: metrics.reportedModel },
        metrics,
        assertions,
      }),
      state: endedOnItsOwn ? state : undefined,
    };
  } finally {
    rmSync(workdir, { recursive: true, force: true });
  }
}

// --- report ----------------------------------------------------------------------

function buildReport(input: {
  url: string;
  server: { name: string; version: string };
  clients: readonly ClientName[];
  installed: RunContext["installed"];
  models: RunContext["models"];
  promptDrift: readonly string[] | null;
  results: AttemptResult[];
  timeoutSec: number;
  maxMcpCalls: number;
  attempts: number;
  cleanup: string;
}) {
  return {
    generatedAt: new Date().toISOString(),
    endpoint: input.url,
    server: {
      ...input.server,
      deployedRevision: "unavailable (the endpoint does not report one)",
      /** Invoked prompts whose deployed text differs from this working tree; null when no journey invokes one. */
      promptsDifferingFromWorkingTree: input.promptDrift,
    },
    clients: Object.fromEntries(
      input.clients.map((c) => [
        c,
        {
          version: input.installed[c]?.version ?? null,
          bin: input.installed[c]?.bin ?? null,
          requestedModel: input.models[c] ?? null,
          reportedModels: [
            ...new Set(
              input.results
                .filter((r) => r.client === c)
                .map((r) => r.model.reported)
                .filter(Boolean),
            ),
          ],
        },
      ]),
    ),
    limits: {
      timeoutSec: input.timeoutSec,
      maxMcpCalls: input.maxMcpCalls,
      attemptsPerPair: input.attempts,
    },
    summary: summarize(input.results),
    results: input.results,
    cleanup: input.cleanup,
  };
}

type Report = ReturnType<typeof buildReport>;

const fmt = (value: number | null, digits = 0) =>
  value === null ? "n/a" : value.toFixed(digits);

function renderMarkdown(report: Report): string {
  const rows = report.summary.map(
    (s) =>
      `| ${s.journey} | ${s.client} | ${s.invocation} | ${s.pass}/${s.attempts} | ${s.fail} | ${s.incomplete} | ${s.error} | ${fmt(
        s.medianWallMs === null ? null : s.medianWallMs / 1000,
        1,
      )} | ${fmt(s.meanMcpCalls, 1)} | ${fmt(s.meanOutsideCalls, 1)} | ${fmt(s.meanTurns, 1)} | ${fmt(s.meanCostUsd, 3)} | ${fmt(s.meanInputTokens)} | ${fmt(s.meanOutputTokens)} |`,
  );
  const clients = Object.entries(report.clients).map(
    ([name, c]) =>
      `${name} ${c.version ?? "not installed"}${c.bin ? ` at ${c.bin}` : ""} (model ${
        c.reportedModels.join(", ") || c.requestedModel || "not reported"
      })`,
  );
  const drift = report.server.promptsDifferingFromWorkingTree;
  const failures = report.results
    .filter((r) => r.outcome !== "pass")
    .map(
      (r) =>
        `- ${r.journey} / ${r.client} #${r.attempt}: **${r.outcome}** — ${r.reason ?? "no reason recorded"}`,
    );
  return [
    `# MCP agent journeys — ${report.generatedAt}`,
    "",
    `Endpoint ${report.endpoint} (server ${report.server.name} ${report.server.version}; deployed revision ${report.server.deployedRevision}). All results are live client runs.`,
    "",
    ...(drift === null
      ? []
      : [
          drift.length
            ? `Deployed prompts that differ from this working tree (changes not yet deployed): ${drift.join(", ")}.`
            : "Every invoked prompt's deployed text matches this working tree.",
          "",
        ]),
    `Clients: ${clients.join("; ")}. Limits: ${report.limits.timeoutSec}s per turn and ${report.limits.maxMcpCalls} MCP calls per attempt.`,
    "",
    "| Journey | Client | Invocation | Pass | Fail | Incomplete | Error | Median wall s | MCP calls | Outside calls | Turns | Cost USD | Input tokens | Output tokens |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "`n/a` means the client does not report that metric.",
    "",
    ...(failures.length
      ? ["## Non-passing attempts", "", ...failures, ""]
      : []),
    `Cleanup: ${report.cleanup}`,
    "",
  ].join("\n");
}

function writeReport(
  outDir: string,
  report: Report,
  scrub: (text: string) => string,
): void {
  const markdown = scrub(renderMarkdown(report));
  writeFileSync(
    path.join(outDir, "report.json"),
    scrub(JSON.stringify(report, null, 2)),
  );
  writeFileSync(path.join(outDir, "report.md"), markdown);
  console.log(`\n${markdown}\nReport: ${scrub(outDir)}`);
}

// --- main ---------------------------------------------------------------------

function versionOf(bin: string): string | null {
  const result = spawnSync(bin, ["--version"], {
    encoding: "utf8",
    timeout: 15_000,
  });
  return result.status === 0
    ? result.stdout.trim().split("\n")[0] || null
    : null;
}

function usage(problem: string): never {
  console.error(
    `${problem}\nSee backend-cluster/backend-v2/docs/mcp-agent-eval.md.`,
  );
  process.exit(2);
}

function parseOptions(suite: Suite) {
  const { values } = parseArgs({
    options: {
      client: { type: "string", default: "all" },
      journey: { type: "string", default: "all" },
      attempts: { type: "string", default: "1" },
      "timeout-sec": { type: "string", default: "300" },
      "max-mcp-calls": { type: "string", default: "40" },
      "claude-model": { type: "string" },
      "codex-model": { type: "string" },
      "claude-bin": { type: "string" },
      "codex-bin": { type: "string" },
      url: { type: "string", default: DEFAULT_URL },
      out: { type: "string" },
    },
  });
  const selected = new Set((values.journey ?? "all").split(","));
  const journeys = suite.journeys.filter(
    (j) => selected.has("all") || selected.has(j.id),
  );
  const clients = CLIENTS.filter(
    (c) => values.client === "all" || c === values.client,
  );
  const [attempts, timeoutSec, maxMcpCalls] = [
    values.attempts,
    values["timeout-sec"],
    values["max-mcp-calls"],
  ].map(Number);
  if (!journeys.length) {
    usage(
      `Unknown journey ${values.journey}; choose ids from ${suite.journeys.map((j) => j.id).join(", ")}, or all.`,
    );
  }
  if (!clients.length)
    usage(`Unknown client ${values.client}; choose claude, codex, or all.`);
  if (
    ![attempts, timeoutSec, maxMcpCalls].every(
      (n) => Number.isInteger(n) && n > 0,
    )
  ) {
    usage(
      "--attempts, --timeout-sec, and --max-mcp-calls must be positive integers.",
    );
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return {
    journeys,
    clients,
    attempts,
    timeoutSec,
    maxMcpCalls,
    url: values.url as string,
    models: { claude: values["claude-model"], codex: values["codex-model"] },
    bins: { claude: values["claude-bin"], codex: values["codex-bin"] },
    outDir: path.resolve(
      values.out ??
        path.join(PACKAGE_ROOT, "tmp", "mcp-agent-eval", "runs", stamp),
    ),
  };
}

async function main(): Promise<number> {
  const token = process.env[TOKEN_ENV];
  const target = process.env[LEDGER_ENV];
  const readOnlyToken = process.env[READ_ONLY_TOKEN_ENV] || null;
  if (!token) usage(`Set ${TOKEN_ENV} to an API key pinned to the eval ledger.`);
  if (!target)
    usage(`Set ${LEDGER_ENV} to the eval ledger as owner/mcp-agent-eval.`);

  const { suite, fixture } = loadSuite();
  const options = parseOptions(suite);
  const owner = target.split("/")[0];
  const scrub = (text: string) =>
    redact(text, [token, readOnlyToken ?? ""], owner)
      .split(homedir())
      .join("~");

  let harness: Client;
  try {
    harness = await connect(options.url, token);
  } catch (error) {
    console.error(
      scrub(`Could not connect to ${options.url}: ${message(error)}`),
    );
    return 1;
  }

  const transcriptDir = path.join(options.outDir, "transcripts");
  mkdirSync(transcriptDir, { recursive: true });
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);

  const results: AttemptResult[] = [];
  let cleanup = "fixture restored";
  try {
    const unsafe = unsafeTargetReason(
      target,
      await accessibleLedgers(harness),
    );
    if (unsafe) usage(scrub(unsafe));
    if (
      readOnlyToken &&
      options.journeys.some((j) => j.credential === "read-only")
    ) {
      const readOnly = await connect(options.url, readOnlyToken);
      try {
        const reason = unsafeTargetReason(
          target,
          await accessibleLedgers(readOnly),
        );
        if (reason) usage(scrub(`read-only credential: ${reason}`));
      } finally {
        await readOnly.close().catch(() => undefined);
      }
    }

    const promptArgs = Object.fromEntries(
      (await harness.listPrompts()).prompts.map((p) => [
        p.name,
        (p.arguments ?? []).map((a) => a.name),
      ]),
    );
    const drift = options.journeys.some((j) => j.invoke)
      ? await promptDrift(harness, options.journeys, target)
      : null;
    if (drift?.length) {
      console.log(
        `note: deployed prompts differ from this working tree (changes not yet deployed): ${drift.join(", ")}`,
      );
    }
    const installed = Object.fromEntries(
      options.clients.map((client) => {
        const bin = resolveClient(client, options.bins[client]);
        const version = bin ? versionOf(bin) : null;
        return [client, bin && version ? { bin, version } : null];
      }),
    ) as RunContext["installed"];
    const env: NodeJS.ProcessEnv = { ...process.env };
    delete env.CLAUDECODE;
    delete env[READ_ONLY_TOKEN_ENV];
    const ctx: RunContext = {
      harness,
      suite,
      fixture,
      target,
      url: options.url,
      env,
      token,
      readOnlyToken,
      promptArgs,
      installed,
      models: options.models,
      timeoutSec: options.timeoutSec,
      maxMcpCalls: options.maxMcpCalls,
      signal: controller.signal,
      transcriptDir,
      scrub,
    };

    const plan = options.journeys.flatMap((journey) =>
      options.clients.flatMap((client) =>
        Array.from({ length: options.attempts }, (_, i) => ({
          journey,
          client,
          attempt: i + 1,
        })),
      ),
    );
    let known: LedgerState | undefined;
    for (const { journey, client, attempt } of plan) {
      if (controller.signal.aborted) break;
      const { result, state } = await runAttempt(
        ctx,
        journey,
        client,
        attempt,
        known,
      );
      known = state;
      results.push(result);
      console.log(
        scrub(
          `${journey.id} / ${client} #${attempt}: ${result.outcome}${result.reason ? ` — ${result.reason}` : ""}`,
        ),
      );
    }

    try {
      await resetLedger(harness, suite, fixture, known);
    } catch (error) {
      cleanup = `fixture reset failed: ${message(error)}`;
    }

    const server = harness.getServerVersion();
    const report = buildReport({
      url: options.url,
      server: {
        name: server?.name ?? "unknown",
        version: server?.version ?? "unknown",
      },
      clients: options.clients,
      installed,
      models: options.models,
      promptDrift: drift,
      results,
      timeoutSec: options.timeoutSec,
      maxMcpCalls: options.maxMcpCalls,
      attempts: options.attempts,
      cleanup,
    });
    writeReport(options.outDir, report, scrub);
  } finally {
    await harness.close().catch(() => undefined);
  }
  if (controller.signal.aborted) return 130;
  return results.length > 0 &&
    results.every((r) => r.outcome === "pass") &&
    cleanup === "fixture restored"
    ? 0
    : 1;
}

if (require.main === module) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      const owner = process.env[LEDGER_ENV]?.split("/")[0];
      console.error(
        `mcp-agent-eval failed: ${redact(message(error), [process.env[TOKEN_ENV] ?? "", process.env[READ_ONLY_TOKEN_ENV] ?? ""], owner)}`,
      );
      process.exit(1);
    },
  );
}
