import fs from "fs";
import path from "path";
import {
  buildSchema,
  getNamedType,
  isObjectType,
  parse,
  print,
  type FieldNode,
  type SelectionSetNode,
} from "graphql";
import { ApolloClient, ApolloLink, Observable, gql } from "@apollo/client";
import { cache } from "../cache";
import { APOLLO_DEFAULT_OPTIONS } from "../default-options";

/**
 * Root fields whose return type has no `id` are stored once per field name and
 * arguments, so a second document selecting a different set of fields REPLACES
 * the first one's object instead of adding to it: the first document is left
 * incomplete, Apollo logs "Cache data may be lost" and the watcher is sent back
 * to the network for data it already had (w22/031: transaction detail's context
 * document adds `generated_from`, Edit Transaction's omits it).
 */
const QUERIES = path.join(__dirname, "..", "..", "graphql", "queries");
const SCHEMA = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "generated-graphql",
  "schema.graphql",
);
const document = (file: string) =>
  gql(fs.readFileSync(path.join(QUERIES, file), "utf8"));

describe("transaction detail and Edit Transaction share one cached entry context", () => {
  const FULL = document("getLedgerTransactionContext.graphql");
  const BASIC = document("getLedgerEntryContext.graphql");
  const variables = { entryHash: "h1", ledgerId: "example/ledger" };
  const context = (more: Record<string, unknown>) => ({
    getLedgerEntryContext: {
      __typename: "EntryContext",
      slice: '2026-10-02 * "China Garden"',
      sha256sum: "a",
      entry: {},
      balances_before: [],
      balances_after: [],
      ...more,
    },
  });
  const complete = (query: typeof FULL) =>
    cache.diff({ query, variables, returnPartialData: true, optimistic: false })
      .complete;

  afterEach(async () => {
    await cache.reset();
  });

  it("keeps the detail's document complete after Edit's smaller one is written", () => {
    cache.writeQuery({
      query: FULL,
      variables,
      data: context({ generated_from: null }),
    });
    expect(complete(FULL)).toBe(true);

    cache.writeQuery({ query: BASIC, variables, data: context({}) });
    expect(complete(FULL)).toBe(true);
  });

  it("still lets the newer write overwrite the fields it carries", () => {
    cache.writeQuery({
      query: FULL,
      variables,
      data: context({ generated_from: "abc" }),
    });
    cache.writeQuery({
      query: BASIC,
      variables,
      data: context({ slice: "edited", sha256sum: "b" }),
    });

    const read = cache.readQuery<any>({ query: FULL, variables });
    expect(read.getLedgerEntryContext.slice).toBe("edited");
    expect(read.getLedgerEntryContext.sha256sum).toBe("b");
    expect(read.getLedgerEntryContext.generated_from).toBe("abc");

    // A field the server now sends as null is overwritten, not kept.
    cache.writeQuery({
      query: FULL,
      variables,
      data: context({ generated_from: null }),
    });
    expect(
      cache.readQuery<any>({ query: FULL, variables }).getLedgerEntryContext
        .generated_from,
    ).toBe(null);
  });
});

describe("the same two reads through a real client", () => {
  const FULL = document("getLedgerTransactionContext.graphql");
  const BASIC = document("getLedgerEntryContext.graphql");
  const variables = { entryHash: "h1", ledgerId: "example/ledger" };
  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

  afterEach(async () => {
    await cache.reset();
  });

  it("sends no request to restore what Edit's read replaced", async () => {
    const operations: string[] = [];
    const link = new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          operations.push(operation.operationName);
          observer.next({
            data: {
              getLedgerEntryContext: {
                __typename: "EntryContext",
                slice: "s",
                sha256sum: "a",
                entry: {},
                balances_before: [],
                balances_after: [],
                ...(operation.operationName === "GetLedgerTransactionContext"
                  ? { generated_from: null }
                  : {}),
              },
            },
          });
          observer.complete();
        }),
    );
    const client = new ApolloClient({
      cache,
      link,
      defaultOptions: APOLLO_DEFAULT_OPTIONS,
    });

    // Transaction detail watches its document; Edit then reads the smaller one
    // from the network (edit-transaction-screen.tsx).
    const detail = client.watchQuery({ query: FULL, variables }).subscribe({});
    await settle();
    await client.query({
      query: BASIC,
      variables,
      fetchPolicy: "network-only",
    });
    await settle();
    detail.unsubscribe();
    client.stop();

    expect(operations).toEqual([
      "GetLedgerTransactionContext",
      "GetLedgerEntryContext",
    ]);
  });
});

// The guard: every root field that two operations select under the same cache
// key, whose type has no id, must select the same fields or carry a merge
// policy. A third selection set added to a field like this turns the redundant
// request into data loss.
const schema = buildSchema(fs.readFileSync(SCHEMA, "utf8"));
const queryFields = schema.getQueryType()!.getFields();

/** The fields a selection set picks, by path, fragments left as their spread. */
function selected(set: SelectionSetNode | undefined, prefix = ""): string[] {
  if (!set) return [];
  return set.selections.flatMap((node): string[] => {
    if (node.kind === "Field") {
      const here = `${prefix}${node.name.value}`;
      return [here, ...selected(node.selectionSet, `${here}.`)];
    }
    if (node.kind === "InlineFragment") {
      return selected(node.selectionSet, prefix);
    }
    return [`${prefix}...${node.name.value}`];
  });
}

/** What the cache keys a root field by: its name and its arguments. A literal
 *  argument counts by value (`conversion: "at_cost"` is another entry from
 *  `"at_value"`), a variable by name. */
function cacheKey(field: FieldNode): string {
  const args = (field.arguments ?? [])
    .map((arg) => `${arg.name.value}:${print(arg.value)}`)
    .sort()
    .join(",");
  return `${field.name.value}(${args})`;
}

type Use = { file: string; operation: string; selection: string };
const uses = new Map<string, Use[]>();
for (const file of fs
  .readdirSync(QUERIES)
  .filter((f) => f.endsWith(".graphql"))) {
  const parsed = parse(fs.readFileSync(path.join(QUERIES, file), "utf8"));
  for (const definition of parsed.definitions) {
    if (definition.kind !== "OperationDefinition") continue;
    if (definition.operation !== "query") continue;
    for (const node of definition.selectionSet.selections) {
      if (node.kind !== "Field") continue;
      const key = cacheKey(node);
      uses.set(key, [
        ...(uses.get(key) ?? []),
        {
          file,
          operation: definition.name?.value ?? file,
          selection: selected(node.selectionSet).sort().join(" "),
        },
      ]);
    }
  }
}

/** Fields two operations select differently on purpose, with why that is safe. */
const NEVER_BOTH_WRITTEN: Record<string, string> = {
  // The basic document runs only after an older server rejects the full one,
  // and a rejected document writes nothing (use-ledger-errors.ts).
  getLedgerErrors: "the basic document only runs once the full one is rejected",
};

describe("root fields selected by more than one operation", () => {
  const shared = [...uses.entries()].filter(
    ([, list]) => new Set(list.map((use) => use.selection)).size > 1,
  );

  it("finds the fields it is meant to guard", () => {
    // If the scan stops seeing the known case, it is no longer looking.
    expect(
      shared
        .map(([key]) => key.split("(")[0])
        .includes("getLedgerEntryContext"),
    ).toBe(true);
  });

  for (const [key, list] of shared) {
    const name = key.split("(")[0]!;
    const returnType = getNamedType(queryFields[name]!.type);
    const hasId = isObjectType(returnType) && "id" in returnType.getFields();

    it(`${name}: keeps its selections from replacing one another`, () => {
      const merges = Boolean(
        cache.policies.getMergeFunction("Query", name, undefined),
      );
      expect(hasId || merges || name in NEVER_BOTH_WRITTEN).toBe(true);
      // An allowlisted field must still be one the scan found as shared.
      expect(list.length > 1).toBe(true);
    });
  }
});
