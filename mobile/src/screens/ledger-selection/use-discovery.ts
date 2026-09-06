import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useApolloClient } from "@apollo/client";
import { useSession } from "@/common/hooks/use-session";
import {
  DiscoverLedgersDocument,
  type DiscoverLedgersQuery,
  MyDiscoveryLedgersDocument,
  type MyDiscoveryLedgersQuery,
  StarredDiscoveryLedgersDocument,
  type StarredDiscoveryLedgersQuery,
  DiscoveryIdentityDocument,
  type DiscoveryIdentityQuery,
  StarDiscoveryLedgerDocument,
  type StarDiscoveryLedgerMutation,
  UnstarDiscoveryLedgerDocument,
  type UnstarDiscoveryLedgerMutation,
} from "@/generated-graphql/graphql";
import { DiscoveryStore, type DiscoveryItem } from "./discovery-store";

const PAGE_SIZE = 30;
export function useDiscovery() {
  const client = useApolloClient();
  const { userId, serverUrl } = useSession();
  const store = useMemo(
    () =>
      new DiscoveryStore({
        page: async (tab, q, page, signal) => {
          const context = {
            fetchOptions: { signal },
            queryDeduplication: false,
          };
          if (tab === "explore") {
            const { data } = await client.query<DiscoverLedgersQuery>({
              query: DiscoverLedgersDocument,
              variables: { q, page, limit: PAGE_SIZE },
              fetchPolicy: "no-cache",
              context,
            });
            return {
              items: data.searchLedgers,
              hasMore: data.searchLedgers.length === PAGE_SIZE,
            };
          }
          // Load all account lists so local search never silently searches only page one.
          let username: string | undefined;
          if (tab === "starred") {
            const { data } = await client.query<DiscoveryIdentityQuery>({
              query: DiscoveryIdentityDocument,
              variables: { userId },
              fetchPolicy: "no-cache",
              context,
            });
            username = data.userProfile?.username ?? undefined;
            if (!username) throw new Error("Missing account username");
          }
          const items: DiscoveryItem[] = [];
          for (let current = 1; ; current++) {
            if (signal.aborted) throw new Error("Discovery request cancelled");
            if (tab === "starred") {
              const { data } = await client.query<StarredDiscoveryLedgersQuery>(
                {
                  query: StarredDiscoveryLedgersDocument,
                  variables: { username, page: current, limit: PAGE_SIZE },
                  fetchPolicy: "no-cache",
                  context,
                },
              );
              const result = data.getUserStarredRepos;
              items.push(
                ...result.repositories.map((repo) => ({
                  ...repo,
                  id: repo.fullName,
                  private: repo.isPrivate,
                  isStarred: true,
                })),
              );
              if (
                result.repositories.length < PAGE_SIZE ||
                items.length >= result.total
              )
                break;
            } else {
              const { data } = await client.query<MyDiscoveryLedgersQuery>({
                query: MyDiscoveryLedgersDocument,
                variables: { page: current, limit: PAGE_SIZE },
                fetchPolicy: "no-cache",
                context,
              });
              items.push(...data.listLedgers);
              if (data.listLedgers.length < PAGE_SIZE) break;
            }
          }
          return { items, hasMore: false };
        },
        star: async (ledgerId, starred) => {
          const result = starred
            ? (
                await client.mutate<StarDiscoveryLedgerMutation>({
                  mutation: StarDiscoveryLedgerDocument,
                  variables: { ledgerId },
                })
              ).data?.starLedger
            : (
                await client.mutate<UnstarDiscoveryLedgerMutation>({
                  mutation: UnstarDiscoveryLedgerDocument,
                  variables: { ledgerId },
                })
              ).data?.unstarLedger;
          if (!result?.success) throw new Error("Star change failed");
          return result.isStarred;
        },
      }),
    [client, userId, serverUrl],
  );
  useEffect(() => () => store.dispose(), [store]);
  return {
    store,
    state: useSyncExternalStore(store.subscribe, store.getSnapshot),
  };
}
