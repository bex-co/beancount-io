import {
  DiscoveryStore,
  filterLedgers,
  type DiscoveryItem,
} from "../discovery-store";
import { canWriteLedger } from "../../../common/ledger-access";

const ledger = (id: string, isStarred = false): DiscoveryItem => ({
  id,
  fullName: id,
  private: false,
  isStarred,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("ledger discovery", () => {
  it("prioritizes the exact open_ledger owner across Explore pages and refreshes", async () => {
    const first = [
      ledger("other/first"),
      ledger("open_ledger/amazon"),
      ledger("open_ledger_copy/example"),
    ];
    const second = [
      ledger("other/next"),
      ledger("open_ledger/apple"),
      ledger("open_ledger/amazon"),
    ];
    const store = new DiscoveryStore({
      page: async (_tab, query, page) => {
        expect(query).toBe("annual");
        return { items: page === 1 ? first : second, hasMore: page === 1 };
      },
      star: async () => true,
    });
    await store.load("explore", "annual");
    expect(store.getSnapshot().items.map((item) => item.id)).toEqual([
      "open_ledger/amazon",
      "other/first",
      "open_ledger_copy/example",
    ]);
    await store.loadMore();
    expect(store.getSnapshot().items.map((item) => item.id)).toEqual([
      "open_ledger/amazon",
      "open_ledger/apple",
      "other/first",
      "open_ledger_copy/example",
      "other/next",
    ]);
    await store.load("explore", "annual", true);
    expect(store.getSnapshot().items.map((item) => item.id)).toEqual([
      "open_ledger/amazon",
      "other/first",
      "open_ledger_copy/example",
    ]);
  });
  it("preserves server order in Your ledgers and Starred", async () => {
    const items = [
      ledger("other/first", true),
      ledger("open_ledger/amazon", true),
    ];
    const store = new DiscoveryStore({
      page: async () => ({ items, hasMore: false }),
      star: async () => true,
    });
    for (const tab of ["yours", "starred"] as const) {
      await store.load(tab, "");
      expect(store.getSnapshot().items.map((item) => item.id)).toEqual(
        items.map((item) => item.id),
      );
    }
  });
  it("searches owner, name and description with whitespace and case normalization", () => {
    const items = [
      { ...ledger("community/Household"), description: "Annual budget" },
      ledger("other/work"),
    ];
    expect(
      filterLedgers(items, "  COMMUNITY budget ").map((item) => item.id),
    ).toEqual(["community/Household"]);
    expect(filterLedgers(items, " ").length).toBe(2);
    expect(filterLedgers(items, "missing")).toEqual([]);
  });
  it("discards late search results and errors after switching tabs", async () => {
    const old = deferred<{ items: DiscoveryItem[]; hasMore: boolean }>();
    const store = new DiscoveryStore({
      page: async (tab) =>
        tab === "explore"
          ? old.promise
          : { items: [ledger("new", true)], hasMore: false },
      star: async () => true,
    });
    const first = store.load("explore", "old");
    await store.load("starred", "");
    old.reject(new Error("late network error"));
    await first;
    expect(store.getSnapshot().items[0].id).toBe("new");
    expect(store.getSnapshot().error).toBe(false);
  });
  it("deduplicates pages, retries the failed page, and ignores repeated load-more taps", async () => {
    const next = deferred<{ items: DiscoveryItem[]; hasMore: boolean }>();
    let calls = 0;
    const pages: number[] = [];
    const store = new DiscoveryStore({
      page: async (_tab, _q, page) => {
        pages.push(page);
        if (page === 1) return { items: [ledger("a")], hasMore: true };
        calls++;
        if (calls === 1) throw new Error("offline");
        return next.promise;
      },
      star: async () => true,
    });
    await store.load("explore", "");
    await store.loadMore();
    expect(store.getSnapshot().items.length).toBe(1);
    const pending = store.loadMore();
    await store.loadMore();
    next.resolve({ items: [ledger("a"), ledger("b")], hasMore: false });
    await pending;
    expect(pages).toEqual([1, 2, 2]);
    expect(store.getSnapshot().items.map((item) => item.id)).toEqual([
      "a",
      "b",
    ]);
    expect(store.getSnapshot().error).toBe(false);
  });
  it("preserves current content during refresh and on refresh failure", async () => {
    let fail = false;
    const pending = deferred<{ items: DiscoveryItem[]; hasMore: boolean }>();
    const store = new DiscoveryStore({
      page: async () =>
        fail ? pending.promise : { items: [ledger("a")], hasMore: false },
      star: async () => true,
    });
    await store.load("yours", "");
    fail = true;
    const refreshing = store.load("yours", "", true);
    expect(store.getSnapshot().refreshing).toBe(true);
    expect(store.getSnapshot().items[0].id).toBe("a");
    pending.reject(new Error("offline"));
    await refreshing;
    expect(store.getSnapshot().refreshing).toBe(false);
    expect(store.getSnapshot().items[0].id).toBe("a");
    expect(store.getSnapshot().error).toBe(true);
  });
  it("does not fake success on failed stars and serializes a ledger's mutations", async () => {
    let calls = 0;
    const write = deferred<boolean>();
    const store = new DiscoveryStore({
      page: async () => ({ items: [ledger("a")], hasMore: false }),
      star: async () => {
        calls++;
        return write.promise;
      },
    });
    await store.load("yours", "");
    const mutation = store.toggle(ledger("a"));
    await store.toggle(ledger("a"));
    expect(calls).toBe(1);
    expect(store.getSnapshot().items[0].isStarred).toBe(false);
    write.reject(new Error("denied"));
    let failed = false;
    try {
      await mutation;
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    expect(store.getSnapshot().pending.size).toBe(0);
    expect(store.getSnapshot().items[0].isStarred).toBe(false);
  });
  it("removes confirmed unstars and shields them from an older in-flight list", async () => {
    const old = deferred<{ items: DiscoveryItem[]; hasMore: boolean }>();
    let refresh = false;
    const store = new DiscoveryStore({
      page: async () =>
        refresh ? old.promise : { items: [ledger("a", true)], hasMore: false },
      star: async () => false,
    });
    await store.load("starred", "");
    refresh = true;
    const loading = store.load("starred", "", true);
    await store.toggle(ledger("a", true));
    expect(store.getSnapshot().items).toEqual([]);
    old.resolve({ items: [ledger("a", true)], hasMore: false });
    await loading;
    expect(store.getSnapshot().items).toEqual([]);
  });
  it("does not notify an unmounted account when its request finishes", async () => {
    const request = deferred<{ items: DiscoveryItem[]; hasMore: boolean }>();
    const store = new DiscoveryStore({
      page: async () => request.promise,
      star: async () => true,
    });
    let updates = 0;
    store.subscribe(() => {
      updates++;
    });
    const load = store.load("explore", "");
    store.dispose();
    request.resolve({ items: [ledger("old-account")], hasMore: false });
    await load;
    expect(updates).toBe(1);
    expect(store.getSnapshot().items).toEqual([]);
  });
  it("defaults to read-only", () => {
    expect(canWriteLedger(undefined)).toBe(false);
    expect(canWriteLedger({ push: false, admin: false })).toBe(false);
    expect(canWriteLedger({ push: true, admin: false })).toBe(true);
    expect(canWriteLedger({ push: false, admin: true })).toBe(true);
  });
});
