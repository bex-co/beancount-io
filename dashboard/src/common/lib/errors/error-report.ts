const MAX_STACK_LINES = 20;

function firstLines(text: string | null | undefined): string {
  if (!text) return "";
  const lines = text.trim().split("\n");
  const kept = lines.slice(0, MAX_STACK_LINES);
  if (lines.length > kept.length) kept.push("…");
  return kept.join("\n");
}

interface ErrorReportInput {
  error: unknown;
  componentStack?: string | null;
  url: string;
  userAgent: string;
  time: Date;
}

/**
 * Plain-text report a reader can copy to support. It carries what identifies
 * the failure — the error, where and when it happened, and the browser — and
 * nothing from the session: no cookies, tokens, or request variables.
 */
export function formatErrorReport({
  error,
  componentStack,
  url,
  userAgent,
  time,
}: ErrorReportInput): string {
  const name = error instanceof Error ? error.name : "Error";
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? firstLines(error.stack) : "";
  const components = firstLines(componentStack);

  return [
    `${name}: ${message}`,
    `URL: ${url}`,
    `Time: ${time.toISOString()}`,
    `Browser: ${userAgent}`,
    stack && `\nStack:\n${stack}`,
    components && `\nComponents:\n${components}`,
  ]
    .filter(Boolean)
    .join("\n");
}
