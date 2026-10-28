import {
  hasTopLevelGroupBy,
  topLevelFromSpan,
  topLevelWindowCall,
} from "@/foundation/rustledger/window-from-guard";

/**
 * Drop `FROM postings` under top-level windows (w23/139).
 *
 * The engine numbers windows only in its default postings scope: bare
 * FROM (or the scope/quoted forms, which never leave it) works, while
 * the identical window over explicit `FROM postings` fails as
 * `Window functions not supported in subquery expressions`. Bare and
 * postings return identical rows in identical order under every
 * clause, so removing the FROM rescues the working form byte for
 * byte. Only implemented window names move (`row_number`, `rank`,
 * `dense_rank` — anything else answers `not yet implemented` bare,
 * which the guard reports instead), only exact `FROM postings`
 * without an alias, and never with GROUP BY (windows cannot number
 * grouped rows even bare). Runs after the unquote — quoted postings
 * arrives here already bare — and before the terminator, so every
 * later stage sees the bare form it already handles.
 */
export function dropPostingsFromForWindows(query: string): string {
  const found = topLevelWindowCall(query);
  if (found === undefined || !found.implemented) return query;
  if (hasTopLevelGroupBy(query)) return query;
  const span = topLevelFromSpan(query);
  if (span === undefined || !span.postings) return query;
  let start = span.start;
  while (start > 0 && /\s/.test(query[start - 1] as string)) start -= 1;
  return query.slice(0, start) + query.slice(span.end);
}
