export type DiscoveryTab = "yours" | "starred" | "explore";
export type DiscoveryItem = {
  id: string;
  fullName: string;
  description?: string | null;
  private: boolean;
  isStarred?: boolean | null;
};
type Page = { items: DiscoveryItem[]; hasMore: boolean };
type State = {
  items: DiscoveryItem[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: boolean;
  pending: ReadonlySet<string>;
};

export function filterLedgers(items: DiscoveryItem[], query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const text =
      `${item.fullName} ${item.description ?? ""}`.toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
}

/** Owns request ordering for one mounted account's discovery screen. */
export class DiscoveryStore {
  private state: State = {
    items: [],
    loading: true,
    refreshing: false,
    loadingMore: false,
    hasMore: false,
    error: false,
    pending: new Set(),
  };
  private listeners = new Set<() => void>();
  private generation = 0;
  private request = new AbortController();
  private page = 1;
  private tab: DiscoveryTab = "yours";
  private query = "";
  private stars = new Map<string, boolean>();
  constructor(
    private readonly api: {
      page: (
        tab: DiscoveryTab,
        query: string,
        page: number,
        signal: AbortSignal,
      ) => Promise<Page>;
      star: (id: string, starred: boolean) => Promise<boolean>;
    },
  ) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.state;
  private update(patch: Partial<State>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private merge(items: DiscoveryItem[]) {
    const merged = [
      ...new Map(
        items.map((item) => [
          item.id,
          {
            ...item,
            isStarred: this.stars.get(item.id) ?? item.isStarred,
          },
        ]),
      ).values(),
    ].filter((item) => this.tab !== "starred" || item.isStarred === true);
    if (this.tab !== "explore") return merged;
    // Rank the whole loaded list, so later pages keep featured examples above
    // other results while preserving server order within each group.
    const isOpenLedger = (item: DiscoveryItem) =>
      item.fullName.split("/")[0].toLowerCase() === "open_ledger";
    return merged.sort(
      (a, b) => Number(isOpenLedger(b)) - Number(isOpenLedger(a)),
    );
  }
  async load(tab: DiscoveryTab, query: string, refresh = false) {
    const generation = ++this.generation;
    this.request.abort();
    this.request = new AbortController();
    this.tab = tab;
    this.query = query;
    this.page = 1;
    if (refresh && this.state.pending.size === 0) this.stars.clear();
    this.update({
      loading: !refresh,
      refreshing: refresh,
      loadingMore: false,
      error: false,
      hasMore: false,
      ...(!refresh ? { items: [] } : {}),
    });
    try {
      const result = await this.api.page(tab, query, 1, this.request.signal);
      if (generation !== this.generation) return;
      this.update({ items: this.merge(result.items), hasMore: result.hasMore });
    } catch {
      if (generation === this.generation) this.update({ error: true });
    } finally {
      if (generation === this.generation)
        this.update({ loading: false, refreshing: false });
    }
  }
  async loadMore() {
    if (
      !this.state.hasMore ||
      this.state.loadingMore ||
      this.state.loading ||
      this.state.refreshing
    )
      return;
    const generation = this.generation;
    this.update({ loadingMore: true, error: false });
    try {
      const result = await this.api.page(
        this.tab,
        this.query,
        this.page + 1,
        this.request.signal,
      );
      if (generation !== this.generation) return;
      this.page++;
      this.update({
        items: this.merge([...this.state.items, ...result.items]),
        hasMore: result.hasMore,
      });
    } catch {
      if (generation === this.generation) this.update({ error: true });
    } finally {
      if (generation === this.generation) this.update({ loadingMore: false });
    }
  }
  async toggle(item: DiscoveryItem) {
    if (this.state.pending.has(item.id) || item.isStarred == null) return;
    const desired = !item.isStarred;
    this.update({ pending: new Set([...this.state.pending, item.id]) });
    try {
      const actual = await this.api.star(item.id, desired);
      if (actual !== desired) throw new Error("Star change was not confirmed");
      this.stars.set(item.id, actual);
      this.update({ items: this.merge(this.state.items) });
    } finally {
      const pending = new Set(this.state.pending);
      pending.delete(item.id);
      this.update({ pending });
    }
  }
  dispose() {
    this.request.abort();
    this.generation++;
    this.listeners.clear();
  }
}
