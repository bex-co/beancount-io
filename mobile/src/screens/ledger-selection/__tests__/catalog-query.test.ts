import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import {
  DiscoverLedgersDocument,
  type DiscoverLedgersQuery,
} from "../../../generated-graphql/graphql";
import { queryCatalogPage } from "../catalog-query";
import { DiscoveryStore } from "../discovery-store";

// A real Apollo client over a scripted link, so the production error policy
// and result shape are what the page consumer sees. Page three of Explore came
// back with 30 public records and one FORBIDDEN on a single record's optional
// `isStarred`; the default policy turned that into a rejected page and a
// permanent "Try again".
type Reply = { data?: unknown; errors?: unknown[] } | { network: Error };

function clientFor(reply: Reply) {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      () =>
        new Observable((observer) => {
          if ("network" in reply) {
            observer.error(reply.network);
            return;
          }
          observer.next(reply as never);
          observer.complete();
        }),
    ),
  });
}

const record = (index: number, isStarred: boolean | null = false) => ({
  __typename: "Ledger",
  id: `open_ledger/example-${index}`,
  fullName: `open_ledger/example-${index}`,
  description: `Example ${index}`,
  private: false,
  isStarred,
  permissions: {
    __typename: "Permissions",
    pull: true,
    push: false,
    admin: false,
  },
});
const page = (deniedIndex?: number, offset = 0) =>
  Array.from({ length: 30 }, (_, index) =>
    record(offset + index, index === deniedIndex ? null : index % 2 === 0),
  );
const starDenial = (index: number) => ({
  message: "Authorization denied",
  path: ["searchLedgers", index, "isStarred"],
  extensions: { code: "FORBIDDEN" },
});

const explore = (reply: Reply) =>
  queryCatalogPage<
    DiscoverLedgersQuery,
    { q: string; page: number; limit: number }
  >(
    clientFor(reply),
    {
      query: DiscoverLedgersDocument,
      variables: { q: "", page: 3, limit: 30 },
    },
    "searchLedgers",
  );

const rejects = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return false;
  } catch {
    return true;
  }
};

describe("Explore catalog page error boundary", () => {
  it("keeps a page whose only error withholds one record's star status", async () => {
    const data = await explore({
      data: { searchLedgers: page(21) },
      errors: [starDenial(21)],
    });
    expect(data.searchLedgers.length).toBe(30);
    expect(data.searchLedgers[21].isStarred).toBe(null);
    expect(data.searchLedgers[20].isStarred).toBe(true);
    expect(data.searchLedgers[22].fullName).toBe("open_ledger/example-22");
  });

  it("returns an ordinary complete page unchanged", async () => {
    const data = await explore({ data: { searchLedgers: page() } });
    expect(
      data.searchLedgers.map((item) => item.isStarred).includes(null),
    ).toBe(false);
  });

  it("still fails root denials, authentication and other field errors", async () => {
    for (const errors of [
      [
        {
          message: "Forbidden",
          path: ["searchLedgers"],
          extensions: { code: "FORBIDDEN" },
        },
      ],
      [
        {
          message: "Login",
          path: ["searchLedgers"],
          extensions: { code: "UNAUTHENTICATED" },
        },
      ],
      [
        {
          message: "Denied",
          path: ["searchLedgers", 3, "description"],
          extensions: { code: "FORBIDDEN" },
        },
      ],
      [
        {
          message: "Boom",
          path: ["searchLedgers", 3, "isStarred"],
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        },
      ],
      [starDenial(21), { message: "Boom", path: ["searchLedgers"] }],
    ]) {
      expect(
        await rejects(explore({ data: { searchLedgers: page(21) }, errors })),
      ).toBe(true);
    }
  });

  it("fails a star denial whose record did not arrive or kept a status", async () => {
    const missing = page();
    (missing as unknown[])[21] = null;
    expect(
      await rejects(
        explore({ data: { searchLedgers: missing }, errors: [starDenial(21)] }),
      ),
    ).toBe(true);
    expect(
      await rejects(
        explore({ data: { searchLedgers: page() }, errors: [starDenial(20)] }),
      ),
    ).toBe(true);
  });

  it("fails missing data and transport failures", async () => {
    expect(
      await rejects(explore({ data: null, errors: [starDenial(0)] })),
    ).toBe(true);
    expect(await rejects(explore({ network: new Error("offline") }))).toBe(
      true,
    );
  });

  it("lets the store page past the denial and keeps the unknown star inert", async () => {
    const pages = [page(), page(undefined, 30), page(21, 60), [record(90)]];
    const replies = [
      { data: { searchLedgers: pages[0] } },
      { data: { searchLedgers: pages[1] } },
      { data: { searchLedgers: pages[2] }, errors: [starDenial(21)] },
      { data: { searchLedgers: pages[3] } },
    ];
    const starred: string[] = [];
    const store = new DiscoveryStore({
      page: async (_tab, q, number) => {
        const data = await queryCatalogPage<
          DiscoverLedgersQuery,
          { q: string; page: number; limit: number }
        >(
          clientFor(replies[number - 1]),
          {
            query: DiscoverLedgersDocument,
            variables: { q, page: number, limit: 30 },
          },
          "searchLedgers",
        );
        return {
          items: data.searchLedgers,
          hasMore: data.searchLedgers.length === 30,
        };
      },
      star: async (ledgerId) => {
        starred.push(ledgerId);
        return true;
      },
    });
    await store.load("explore", "");
    for (let more = 0; more < 3; more++) await store.loadMore();
    const state = store.getSnapshot();
    expect(state.error).toBeFalsy();
    expect(
      state.items.some((item) => item.id === "open_ledger/example-90"),
    ).toBe(true);
    const unknown = state.items.find((item) => item.isStarred == null);
    expect(Boolean(unknown)).toBe(true);
    expect(unknown!.id).toBe("open_ledger/example-81");
    expect(state.items.length).toBe(91);
    await store.toggle(unknown!);
    expect(starred.length).toBe(0);
    store.dispose();
  });
});
