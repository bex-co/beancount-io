/**
 * The sha of the commit a Gitea write response reports (w23/m42), or
 * `undefined` when it names none: a write that landed and lost its answer has
 * nothing to report, and a response that is not an object has no commit.
 */
export function commitShaOf(response: unknown): string | undefined {
  const data = (response as { data?: unknown } | null | undefined)?.data as
    { commit?: { sha?: string } } | null | undefined;
  return data?.commit?.sha || undefined;
}
