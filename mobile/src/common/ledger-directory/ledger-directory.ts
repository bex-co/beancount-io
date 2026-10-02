import type { ApolloClient } from "@apollo/client";
import {
  LedgerDirectoryDocument,
  type LedgerDirectoryQuery,
} from "../../generated-graphql/graphql";

export const DIRECTORY_PAGE_SIZE = 30;
type Ledger = LedgerDirectoryQuery["listLedgers"][number];
type Snapshot = {
  ledgers: Ledger[];
  loading: boolean;
  error: boolean;
};

function ordered(ledgers: Ledger[]): Ledger[] {
  return [
    ...new Map(ledgers.map((ledger) => [ledger.id, ledger])).values(),
  ].sort((a, b) =>
    a.fullName < b.fullName ? -1 : a.fullName > b.fullName ? 1 : 0,
  );
}

/** One account directory shared by creation and the drawer, backed by Apollo pages. */
export class LedgerDirectory {
  private snapshot: Snapshot = { ledgers: [], loading: true, error: false };
  private listeners = new Set<() => void>();
  private request?: AbortController;

  constructor(private client: ApolloClient<unknown>) {}

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish(snapshot: Snapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }

  dispose = () => this.request?.abort();

  // Keep a confirmed creation visible even if the subsequent refresh fails.
  refresh = (created?: Ledger) => this.load(true, created);

  async load(refresh = false, created?: Ledger): Promise<void> {
    this.request?.abort();
    const request = new AbortController();
    this.request = request;
    const previous = created
      ? ordered([...this.snapshot.ledgers, created])
      : this.snapshot.ledgers;
    this.publish({ ledgers: previous, loading: true, error: false });
    try {
      if (refresh) {
        // Drop every argument variant, including unobserved pages used at sign-in.
        await this.client.refetchQueries({
          updateCache(cache) {
            cache.evict({ id: "ROOT_QUERY", fieldName: "listLedgers" });
          },
        });
      }
      const ledgers: Ledger[] = [];
      const ids = new Set<string>();
      for (let page = 1; ; page++) {
        if (request.signal.aborted) return;
        const variables = { page, limit: DIRECTORY_PAGE_SIZE };
        let data = refresh
          ? null
          : this.client.readQuery<LedgerDirectoryQuery>({
              query: LedgerDirectoryDocument,
              variables,
            });
        if (!data) {
          const result = await this.client.query<LedgerDirectoryQuery>({
            query: LedgerDirectoryDocument,
            variables,
            // Commit only current responses: even a link that ignores abort must
            // not repopulate the cache with pages from before a creation/refresh.
            fetchPolicy: "no-cache",
            context: {
              fetchOptions: { signal: request.signal },
              queryDeduplication: false,
            },
          });
          if (request.signal.aborted) return;
          data = result.data;
          this.client.writeQuery({
            query: LedgerDirectoryDocument,
            variables,
            data,
          });
        }
        const before = ids.size;
        for (const ledger of data.listLedgers) {
          ids.add(ledger.id);
          ledgers.push(ledger);
        }
        const complete = data.listLedgers.length < DIRECTORY_PAGE_SIZE;
        if (!complete && ids.size === before) {
          throw new Error("Ledger directory pagination made no progress");
        }
        // First load is progressive. A refresh replaces the previous complete
        // list atomically so later-page rows never vanish while it is in flight.
        if (complete || previous.length === 0) {
          this.publish({
            ledgers: ordered(created ? [...ledgers, created] : ledgers),
            loading: !complete,
            error: false,
          });
        }
        if (complete) return;
      }
    } catch (error) {
      if (request.signal.aborted) return;
      this.publish({ ...this.snapshot, loading: false, error: true });
      throw error;
    }
  }
}
