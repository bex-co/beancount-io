import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { LedgerDirectoryDocument } from "../../../generated-graphql/graphql";
import { LedgerDirectory, DIRECTORY_PAGE_SIZE } from "../ledger-directory";
import { getDrawerSections } from "../../../components/ledger-drawer/drawer-ledgers";

const ledger = (i: number) => ({
  __typename: "Ledger" as const,
  id: String(i),
  name: `book-${String(i).padStart(3, "0")}`,
  fullName: `owner/book-${String(i).padStart(3, "0")}`,
  private: true,
});

function setup(count = 31) {
  const state = {
    rows: Array.from({ length: count }, (_, i) => ledger(i)),
    pages: [] as number[],
    failPage: 0,
    repeatPage: false,
    holdPage: 0,
    release: () => {},
  };
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          const { page, limit } = operation.variables;
          state.pages.push(page);
          expect(limit).toBe(DIRECTORY_PAGE_SIZE);
          const offset = state.repeatPage ? 0 : (page - 1) * limit;
          const rows = state.rows.slice(offset, offset + limit);
          const respond = () => {
            if (state.failPage === page) observer.error(new Error("offline"));
            else {
              observer.next({ data: { listLedgers: rows } });
              observer.complete();
            }
          };
          if (state.holdPage === page) state.release = respond;
          else respond();
        }),
    ),
  });
  return { client, state, directory: new LedgerDirectory(client) };
}

describe("cached ledger directory", () => {
  it("reads beyond page one, sorts independently of API order, and reuses cached pages", async () => {
    const { client, state, directory } = setup();
    state.rows.reverse();
    await directory.load();
    expect(state.pages).toEqual([1, 2]);
    expect(directory.getSnapshot().ledgers).toEqual([...state.rows].reverse());
    const reopened = new LedgerDirectory(client);
    await reopened.load();
    expect(state.pages).toEqual([1, 2]);
    expect(reopened.getSnapshot().ledgers).toEqual(
      directory.getSnapshot().ledgers,
    );
    client.stop();
  });

  it("keeps a newly created later-page ledger after switching away", async () => {
    const { client, state, directory } = setup(30);
    await directory.load();
    expect(state.pages).toEqual([1, 2]); // Full first page needs the empty terminator.
    const created = ledger(30);
    state.rows.push(created);
    await directory.refresh(created);
    const rows = directory.getSnapshot().ledgers;
    expect(rows.length).toBe(31);
    expect(state.pages).toEqual([1, 2, 1, 2]);
    expect(getDrawerSections(rows, created, "")).toEqual(
      getDrawerSections(rows, rows[0], ""),
    );
    expect(getDrawerSections(rows, rows[0], "book-030")[0].data).toEqual([
      created,
    ]);
    client.stop();
  });

  it("replaces refreshed pages rather than retaining deleted rows or old empty terminators", async () => {
    const { client, state, directory } = setup(61);
    await directory.load();
    state.rows = [ledger(90)];
    await directory.refresh();
    expect(directory.getSnapshot().ledgers).toEqual(state.rows);
    expect(
      client.readQuery({
        query: LedgerDirectoryDocument,
        variables: { page: 3, limit: 30 },
      }),
    ).toBe(null);
    client.stop();
  });

  it("retains confirmed creations and the previous list after a later-page refresh error", async () => {
    const { client, state, directory } = setup();
    await directory.load();
    const created = ledger(31);
    state.rows.push(created);
    state.failPage = 2;
    let failed = false;
    try {
      await directory.refresh(created);
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    expect(directory.getSnapshot()).toEqual({
      ledgers: state.rows,
      loading: false,
      error: true,
    });
    state.failPage = 0;
    await directory.refresh();
    expect(directory.getSnapshot().error).toBe(false);
    client.stop();
  });

  it("does not shrink an existing complete directory while refreshing page one", async () => {
    const { client, state, directory } = setup();
    await directory.load();
    const sizes: number[] = [];
    const unsubscribe = directory.subscribe(() =>
      sizes.push(directory.getSnapshot().ledgers.length),
    );
    state.rows.push(ledger(31));
    await directory.refresh();
    expect(sizes).toEqual([31, 32]);
    unsubscribe();
    client.stop();
  });

  it("ignores old responses after refresh even when the transport ignores cancellation", async () => {
    const { client, state, directory } = setup(1);
    state.holdPage = 1;
    const old = directory.load();
    const releaseOld = state.release;
    state.holdPage = 0;
    state.rows = [ledger(99)];
    await directory.refresh();
    releaseOld();
    await old;
    expect(directory.getSnapshot().ledgers).toEqual(state.rows);
    expect(
      client.readQuery<any>({
        query: LedgerDirectoryDocument,
        variables: { page: 1, limit: 30 },
      })?.listLedgers,
    ).toEqual(state.rows);
    client.stop();
  });

  it("stops a server that repeats a full page instead of looping forever", async () => {
    const { client, state, directory } = setup(30);
    state.repeatPage = true;
    let failed = false;
    try {
      await directory.load();
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    expect(state.pages).toEqual([1, 2]);
    expect(directory.getSnapshot().error).toBe(true);
    client.stop();
  });

  it("puts a public selection in its own section without changing the owner's list", async () => {
    const { client, directory } = setup(2);
    await directory.load();
    const rows = directory.getSnapshot().ledgers;
    const sections = getDrawerSections(rows, ledger(90), "");
    expect(sections[0].current).toBe(true);
    expect(sections[0].data).toEqual([ledger(90)]);
    expect(sections.slice(1)).toEqual(getDrawerSections(rows, rows[0], ""));
    client.stop();
  });
});
