/**
 * What a tool result looks like as *text* (w2/m28:t001).
 *
 * MCP gives a tool two channels, and before this they carried the same bytes:
 * `content` held `JSON.stringify(envelope)` and `structuredContent` held the
 * envelope. So a BQL result — a text table the server had already rendered —
 * reached the model as `{"ok":true,"result":"   account   balance\n-------"}`,
 * escapes and all, and an empty result reached it as `""`, which says nothing
 * about whether the query was wrong or the ledger simply had no match.
 *
 * The split this module draws: `content` is what a person would read, and
 * `structuredContent` stays the full typed payload a program parses. Text
 * therefore leads with the fact an agent needs to branch on — how many rows,
 * what was written — and repeats the payload only when repeating it is cheap.
 */

/**
 * Longest payload worth repeating under the summary line.
 *
 * Above it the text block would just be a second copy of `structuredContent`,
 * paid for in the model's context window for no gain: a client that wants the
 * data reads the structured channel, which is typed and published in
 * `tools/list`.
 */
const SHORT_PAYLOAD_LIMIT = 400;

/** The text block for a successful tool result. */
export function renderToolText(toolName: string, result: unknown): string {
  const payload = (result as { result?: unknown } | null)?.result;

  // The one tool whose payload is already prose: `runBqlQuery` returns the
  // rendered table, so wrapping it in JSON only escaped the newlines that
  // made it a table in the first place.
  if (toolName === "runBqlQuery" && typeof payload === "string") {
    return renderBqlTable(payload);
  }

  const summary = summaryLine(toolName, payload);
  // Only structured payloads are worth repeating: a scalar is already in the
  // summary line, and printing it twice is noise wearing the shape of data.
  if (typeof payload !== "object" || payload === null) return summary;
  const json = JSON.stringify(payload);
  return json.length <= SHORT_PAYLOAD_LIMIT ? `${summary}\n${json}` : summary;
}

/**
 * A BQL result as the shell rendered it, with the row count in front.
 *
 * The count is the first thing an agent branches on — "did my filter match
 * anything" — and it is otherwise only obtainable by counting lines, which is
 * exactly what this does once so the model does not have to.
 */
function renderBqlTable(table: string): string {
  const rows = countTableRows(table);
  if (rows === 0) return "0 rows — no postings matched";
  return `${rows} ${rows === 1 ? "row" : "rows"}\n${table.replace(/\s+$/, "")}`;
}

/**
 * How many data rows a rendered shell table has.
 *
 * The shell prints a header, a run of dashes, then one line per row, so the
 * dashed rule is the divider to count from. A result with no rule (BQL's
 * plain-text results, e.g. `PRINT`) falls back to counting non-empty lines,
 * which is the honest answer for a payload that has no rows to speak of.
 */
function countTableRows(table: string): number {
  const lines = table.split("\n").filter((line) => line.trim().length > 0);
  const rule = lines.findIndex((line) => /^[\s-]*-{3,}[\s-]*$/.test(line));
  return rule === -1 ? lines.length : lines.length - rule - 1;
}

/**
 * One line saying what happened, for every tool that is not BQL.
 *
 * Deliberately small: the cases below are the shapes the MCP tools actually
 * return, and a shape with nothing summarizable says so rather than inventing
 * a sentence the payload does not support.
 */
function summaryLine(toolName: string, payload: unknown): string {
  if (payload === undefined || payload === null) return `${toolName}: ok`;
  if (typeof payload === "boolean" || typeof payload === "number") {
    return `${toolName}: ${payload}`;
  }
  if (typeof payload === "string") return firstLine(payload);
  if (Array.isArray(payload)) return countNoun(payload.length, "item");

  const record = payload as Record<string, unknown>;
  // Every write tool leads with `summary` for exactly this reason (w2/m26).
  if (typeof record.summary === "string") return firstLine(record.summary);
  if (typeof record.rowCount === "number") {
    const truncated = record.truncated === true ? " (truncated)" : "";
    return `${countNoun(record.rowCount, "row")}${truncated}`;
  }
  // A payload that is one collection under one key — `{ledgers: [...]}`,
  // `{files: [...]}` — is countable, and the count is the useful line.
  const entries = Object.entries(record);
  const onlyList = entries.length === 1 && Array.isArray(entries[0][1]);
  if (onlyList) {
    const [key, list] = entries[0];
    return countNoun((list as unknown[]).length, key.replace(/s$/, ""));
  }
  return `${toolName}: ok`;
}

function countNoun(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

function firstLine(text: string): string {
  const [line = ""] = text.split("\n");
  return line.length > 200 ? `${line.slice(0, 197)}...` : line;
}
