import fs from "fs";
import path from "path";

// w21/934: a cache-only read that misses does not reject, so the panel read it
// as "no spending" and claimed "$0.00 · Below target" while offline.
describe("a cache-only read that misses", () => {
  it("resolves without rows instead of rejecting, which the panel must not read as zero", async () => {
    const {
      ApolloClient,
      ApolloLink,
      InMemoryCache,
      Observable,
      gql,
    } = require("@apollo/client");
    const client = new ApolloClient({
      link: new ApolloLink(() => new Observable(() => undefined)),
      cache: new InMemoryCache(),
    });
    const result = await client.query({
      query: gql`
        query Totals($ledgerId: String!) {
          getLedgerIntervalTotals(ledgerId: $ledgerId) {
            date
          }
        }
      `,
      variables: { ledgerId: "L" },
      fetchPolicy: "cache-only",
    });
    expect(result.data?.getLedgerIntervalTotals).toBe(undefined);
  });

  it("fails the read, and falls back to the window to today, in the hook", () => {
    const source = fs
      .readFileSync(path.join(__dirname, "..", "use-budget-panel.ts"), "utf8")
      .replace(/\s+/g, "");
    expect(
      source.includes(
        "constrows=data?.getLedgerIntervalTotals;if(!rows)thrownewError(",
      ),
    ).toBe(true);
    expect(
      source.includes('.catch(()=>totals("cache-only")).') ||
        source.includes('.catch(()=>totals("cache-only"))//'),
    ).toBe(true);
    expect(source.includes('.catch(()=>totals("cache-only",toToday))')).toBe(
      true,
    );
  });
});
