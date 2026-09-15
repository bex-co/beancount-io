/**
 * Reads what each coding-agent client printed. Metrics a client does not
 * report stay `null` — an unavailable cost is not a zero cost.
 */

export type ClientName = "claude" | "codex";

export interface RunMetrics {
  /** The model the client says it used; null when the client does not say. */
  readonly reportedModel: string | null;
  readonly finalAnswer: string | null;
  readonly turns: number | null;
  readonly costUsd: number | null;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly cachedInputTokens: number | null;
  readonly mcpCalls: number;
  readonly mcpErrors: number;
  readonly otherToolCalls: number;
  readonly mcpServerConnected: boolean | null;
  readonly clientError: string | null;
}

export const MCP_SERVER_NAME = "beancount";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function events(lines: readonly string[]): Json[] {
  return lines.flatMap((line) => {
    if (!line.trim().startsWith("{")) return [];
    try {
      return [JSON.parse(line) as Json];
    } catch {
      return [];
    }
  });
}

const num = (value: unknown) => (typeof value === "number" ? value : null);

const sum = (values: readonly unknown[]) =>
  values.some((v) => typeof v === "number") ? values.reduce<number>((total, v) => total + (num(v) ?? 0), 0) : null;

const isMcpTool = (content: Json) =>
  content.type === "tool_use" && String(content.name).startsWith(`mcp__${MCP_SERVER_NAME}__`);

/** Number of MCP tool calls one output line starts, for the live call limit. */
export function mcpCallsInLine(client: ClientName, line: string): number {
  const [event] = events([line]);
  if (!event) return 0;
  if (client === "claude") {
    return event.type === "assistant" ? (event.message?.content ?? []).filter(isMcpTool).length : 0;
  }
  return event.type === "item.started" && event.item?.type === "mcp_tool_call" ? 1 : 0;
}

export function parseClaudeStream(lines: readonly string[]): RunMetrics {
  let reportedModel: string | null = null;
  let connected: boolean | null = null;
  let result: Json | undefined;
  const mcpToolIds = new Set<string>();
  let otherToolCalls = 0;
  let mcpErrors = 0;
  let lastText: string | null = null;
  for (const event of events(lines)) {
    if (event.type === "system" && event.subtype === "init") {
      reportedModel = event.model ?? null;
      const server = (event.mcp_servers ?? []).find((s: Json) => s.name === MCP_SERVER_NAME);
      connected = server?.status === "connected";
    } else if (event.type === "assistant") {
      for (const c of event.message?.content ?? []) {
        if (c.type === "text") lastText = c.text;
        else if (isMcpTool(c)) mcpToolIds.add(c.id);
        else if (c.type === "tool_use") otherToolCalls++;
      }
    } else if (event.type === "user") {
      for (const c of event.message?.content ?? []) {
        if (c?.type === "tool_result" && mcpToolIds.has(c.tool_use_id) && c.is_error) mcpErrors++;
      }
    } else if (event.type === "result") {
      result = event;
    }
  }
  return {
    reportedModel,
    finalAnswer: typeof result?.result === "string" ? result.result : lastText,
    turns: num(result?.num_turns),
    costUsd: num(result?.total_cost_usd),
    inputTokens: sum([result?.usage?.input_tokens, result?.usage?.cache_creation_input_tokens]),
    outputTokens: num(result?.usage?.output_tokens),
    cachedInputTokens: num(result?.usage?.cache_read_input_tokens),
    mcpCalls: mcpToolIds.size,
    mcpErrors,
    otherToolCalls,
    mcpServerConnected: connected,
    clientError: !result
      ? "client printed no result event"
      : result.is_error || result.subtype !== "success"
        ? `client reported ${result.subtype ?? "an error"}`
        : null,
  };
}

export function parseCodexStream(lines: readonly string[], lastMessage: string | null): RunMetrics {
  const usage: Json[] = [];
  let mcpCalls = 0;
  let mcpErrors = 0;
  let otherToolCalls = 0;
  let lastText: string | null = null;
  let failure: string | null = null;
  let completed = false;
  for (const event of events(lines)) {
    if (event.type === "turn.completed") {
      completed = true;
      if (event.usage) usage.push(event.usage);
    } else if (event.type === "turn.failed" || event.type === "error") {
      failure = String(event.error?.message ?? event.message ?? event.type);
    } else if (event.type === "item.completed") {
      const item = event.item ?? {};
      if (item.type === "agent_message") lastText = item.text ?? lastText;
      else if (item.type === "mcp_tool_call" && item.server === MCP_SERVER_NAME) {
        mcpCalls++;
        if (item.error || item.status === "failed" || item.result?.is_error || item.result?.isError) mcpErrors++;
      } else if (/tool_call|command_execution|web_search|file_change/.test(String(item.type))) {
        otherToolCalls++;
      }
    }
  }
  return {
    reportedModel: null,
    finalAnswer: lastMessage?.trim() || lastText,
    turns: null,
    costUsd: null,
    inputTokens: sum(usage.map((u) => u.input_tokens)),
    outputTokens: sum(usage.map((u) => u.output_tokens)),
    cachedInputTokens: sum(usage.map((u) => u.cached_input_tokens)),
    mcpCalls,
    mcpErrors,
    otherToolCalls,
    mcpServerConnected: null,
    clientError: failure ?? (completed ? null : "client completed no turn"),
  };
}
