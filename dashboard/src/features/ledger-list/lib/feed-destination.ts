import type { GetFeedQuery } from "@/graphql/definitions";

type FeedItem = GetFeedQuery["getFeed"]["items"][number];

interface LedgerDestination {
  owner: string;
  name: string;
  commitSha?: string;
}

export function getLedgerDestination(item: FeedItem): LedgerDestination | null {
  const match = item.link.match(
    /^\/ledger\/([^/]+)\/([^/]+)(?:\/commit\/([^/?#]+))?/,
  );
  const owner = match?.[1];
  const name = match?.[2];

  if (!owner || !name) return null;

  return {
    owner,
    name,
    commitSha: match?.[3],
  };
}
