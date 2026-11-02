/**
 * The ledger files that still `include` the one a delete was refused for, or
 * null when the refusal is anything else. The server refuses with
 * `<path> is still included by <a>, <b>; remove the include …` (w21/587).
 */
export function deleteRefusalIncluders(
  message: string,
  path: string,
): string[] | null {
  const prefix = `${path.replace(/^\/+/, "")} is still included by `;
  for (const report of message.split("; ")) {
    if (!report.startsWith(prefix)) continue;
    const includers = report
      .slice(prefix.length)
      .split(", ")
      .map((includer) => includer.trim())
      .filter(Boolean);
    if (includers.length > 0) return includers;
  }
  return null;
}
