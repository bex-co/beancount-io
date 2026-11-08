import type { ApolloServerPlugin } from "@apollo/server";

import { pageSignal } from "@/server/api/page-signals";
import type { PageInfo } from "@/shared/page-info";

/**
 * The GraphQL channel of the has-more rule (w23/m28): the signal rides in the
 * response `extensions.page`, keyed by each root field's response key (its
 * alias, when it has one), so the list fields keep their types and no
 * generated client changes.
 *
 * One table maps a root `Query` field to the shared read name in
 * `server/api/page-signals.ts` and says where that field keeps its page
 * arguments (the journal reads nest them under `query`).
 */
const own = (args: Record<string, unknown>) => args;
const nested = (args: Record<string, unknown>) =>
  (args.query as Record<string, unknown> | null | undefined) ?? {};

export const PAGED_GRAPHQL_FIELDS: Record<
  string,
  {
    read: string;
    query: (args: Record<string, unknown>) => Record<string, unknown>;
  }
> = {
  listLedgers: { read: "accessibleLedgers", query: own },
  listUserOwnedLedgers: { read: "ownedLedgers", query: own },
  searchLedgers: { read: "searchLedgers", query: own },
  getLedgerJournal: { read: "ledgerJournal", query: nested },
  getLedgerPlaintextJournal: { read: "ledgerPlaintextJournal", query: nested },
  getLedgerAccountJournal: { read: "ledgerAccountJournal", query: nested },
  listLedgerCollaborators: { read: "ledgerCollaborators", query: own },
  listPublicKeys: { read: "ledgerPublicKeys", query: own },
  listCommits: { read: "ledgerCommits", query: own },
  getUserFollowers: { read: "userFollowers", query: own },
  getUserFollowing: { read: "userFollowing", query: own },
  getUserStarredRepos: { read: "userStarredRepos", query: own },
  getFeed: { read: "getFeed", query: own },
};

export const pageExtensionsPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    const pages: Record<string, PageInfo> = {};
    return {
      async executionDidStart() {
        return {
          willResolveField({ info, args }) {
            if (info.parentType.name !== "Query") return;
            const field = PAGED_GRAPHQL_FIELDS[info.fieldName];
            if (!field) return;
            return (error, result) => {
              if (error) return;
              const page = pageSignal(field.read, field.query(args), result);
              if (page) pages[info.path.key as string] = page;
            };
          },
        };
      },
      async willSendResponse({ response }) {
        if (Object.keys(pages).length === 0) return;
        if (response.body.kind !== "single") return;
        response.body.singleResult.extensions = {
          ...response.body.singleResult.extensions,
          page: pages,
        };
      },
    };
  },
};
