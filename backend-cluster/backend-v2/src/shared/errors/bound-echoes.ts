/**
 * A refusal's text with what it echoes kept short and inert (w1/225).
 *
 * Messages interpolate the caller's input — a path, a query, an id, a
 * username — and a 5,000-character value came back whole, terminal escapes
 * and carriage returns included, on MCP, REST and GraphQL alike. Each run of
 * non-space characters longer than {@link ECHO_MAX} keeps its first
 * {@link ECHO_MAX} and an ellipsis, and every control character but tab and
 * line feed is escaped as `\uXXXX`. Idempotent, so a translator may
 * apply it to text a DomainError already bounded.
 */
export const ECHO_MAX = 120;

const LONG_RUN = new RegExp(`\\S{${ECHO_MAX + 1},}`, "gu");
// `\p{Cc}`: C0, DEL and C1.
const CONTROL = /(?![\t\n])\p{Cc}/gu;

/** A run's closing quote or bracket, kept after the ellipsis so the message still reads. */
const CLOSER = /['"`)\]}]$/u;

export function boundEchoes(text: string): string {
  return text
    .replace(
      CONTROL,
      (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
    )
    .replace(
      LONG_RUN,
      (run) =>
        `${[...run].slice(0, ECHO_MAX).join("")}…${CLOSER.exec(run)?.[0] ?? ""}`,
    );
}
