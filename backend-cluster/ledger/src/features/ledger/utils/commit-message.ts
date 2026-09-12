/**
 * The commit message for an entry-append commit.
 *
 * A ledger's `git log` is the audit record a user actually reads, and "Add 1
 * entries" advertises that nothing wrote it (w2/010). Extracted from the route
 * handler so the count-to-noun rule can be tested without standing up a Gitea
 * client.
 */
export function addEntriesCommitMessage(count: number): string {
  return `Add ${count} ${count === 1 ? "entry" : "entries"}`;
}
