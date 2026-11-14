import { BQL_ROW_COUNT, BQL_TRUNCATED } from "../tools/bql-result-metadata";

/**
 * What a tool result looks like as *text* (w2/m28:t001).
 *
 * MCP gives a tool two channels. Before w2/m28 they carried the same bytes:
 * `content` held `JSON.stringify(envelope)` and `structuredContent` held the
 * envelope. So a BQL result — a text table the server had already rendered —
 * reached the model as `{"ok":true,"result":"   account   balance\n-------"}`,
 * escapes and all, and an empty result reached it as `""`, which says nothing
 * about whether the query was wrong or the ledger simply had no match.
 *
 * Text therefore leads with the fact an agent needs to branch on — how many
 * rows, what was written — and then carries the data itself. It must carry
 * all of it: a client may hand the model only `content`. claude.ai's connector
 * does, so when a long payload was cut down to its summary line, an agent saw
 * `42 items` from `listStagedBankTransactions` and `listBankConnections: ok`,
 * with no row, id or amount to act on, while a client that reads
 * `structuredContent` saw everything. MCP asks the same of a tool that returns
 * structured content: also return it serialized in a text block.
 */

/** The text block for a successful tool result. */
export function renderToolText(
  toolName: string,
  result: unknown,
  /**
   * What the call's `structuredContent` carries, when it is not `result`
   * itself: a paginated read adds its has-more signal beside `result`.
   */
  structured: unknown = result,
): string {
  const payload = (result as { result?: unknown } | null)?.result;

  // The one tool whose payload is already prose: `runBqlQuery` returns the
  // rendered table, so wrapping it in JSON only escaped the newlines that
  // made it a table in the first place. The table is the whole payload.
  if (toolName === "runBqlQuery" && typeof payload === "string") {
    return renderBqlTable(
      payload,
      Reflect.get(result as object, BQL_ROW_COUNT),
      Reflect.get(result as object, BQL_TRUNCATED) === true,
    );
  }

  return withStructuredContent(summaryLine(toolName, payload), structured);
}

/**
 * A result's lead line(s), then its `structuredContent` serialized on one line.
 *
 * Every tool result's text block ends this way, failures included, except
 * `runBqlQuery`'s, whose table is already the whole payload. So a client that
 * reads only text still receives every field a client of the structured
 * channel does. Compact JSON escapes every newline inside a value, so the
 * last line is always the whole payload and parses on its own.
 */
export function withStructuredContent(
  lead: string,
  structured: unknown,
): string {
  return `${lead}\n${JSON.stringify(structured)}`;
}

/**
 * A BQL result as the shell rendered it, with the row count in front.
 *
 * Counts come from the same executed query as the text. Rendered cells may
 * contain newlines, so text boundaries cannot reveal canonical rows. An empty
 * result says only that it is empty: LIMIT 0, a HAVING that removes every
 * group, and a WHERE nothing matches all return zero rows, and the count
 * cannot tell them apart (w6/014).
 */
function renderBqlTable(
  table: string,
  rows: unknown,
  truncated: boolean,
): string {
  const known = typeof rows === "number" && Number.isInteger(rows) && rows >= 0;
  const count = known
    ? countNoun(rows, "row")
    : "BQL result — row count unavailable";
  // The count is of the whole result; the text below it is not, so the lead
  // line says so before an agent reads a partial table as complete (w23/010).
  const summary = truncated
    ? `${count} (output truncated; the last line says where — add LIMIT or a narrower WHERE)`
    : count;
  // Strip only the final line terminator: a row of blank cells renders as a
  // whitespace-only line, so `trimEnd()` ate trailing data rows and left the
  // count claiming rows the text never showed (w23/194).
  const readable = table.trim() === "" ? "" : table.replace(/\n$/, "");
  return readable ? `${summary}\n${readable}` : summary;
}

/**
 * One line saying what happened, for every tool that is not BQL.
 *
 * Deliberately small: the cases below are the shapes the MCP tools actually
 * return, and a shape with nothing summarizable says so rather than inventing
 * a sentence the payload does not support. It leads the payload; it never
 * stands in for it.
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
