import type { ReactiveVar } from "@apollo/client";
import {
  recordUsage,
  topAccounts,
  usageFor,
  type LedgerAccountUsage,
} from "../../account-frecency";

/**
 * `accountUsageVar` itself imports through the `@/` alias, which the unit-test
 * runner does not resolve, so this exercises the layer under it: the usage map
 * the var holds, round-tripped through the real `createPersistentVar` over a
 * fake AsyncStorage. What it guards is that a picked account is still there —
 * and still ranks the same — after the app is killed and reopened.
 *
 * The `require.cache` poking mirrors `apollo/__tests__/persistent-var.test.ts`.
 */
describe("account usage persistence", () => {
  let createPersistentVar: typeof import("../../apollo/persistent-var").createPersistentVar;
  const apolloPath = require.resolve("@apollo/client");
  const asyncStoragePath =
    require.resolve("@react-native-async-storage/async-storage");
  let originalApolloModule: NodeModule | undefined;
  let originalAsyncStorageModule: NodeModule | undefined;

  const NOW = 1_700_000_000_000;
  const DAY = 24 * 60 * 60 * 1000;
  const STORAGE_KEY = "accountUsage";

  type Listener<T> = (value: T) => void;

  const makeVarFactory = () => {
    return function makeVar<T>(initialValue: T) {
      let currentValue = initialValue;
      const listeners: Listener<T>[] = [];
      const reactiveVar = ((...args: [T?]) => {
        if (args.length === 0) {
          return currentValue;
        }
        currentValue = args[0] as T;
        listeners.slice().forEach((listener) => listener(currentValue));
        return currentValue;
      }) as ReactiveVar<T>;
      reactiveVar.onNextChange = (listener: Listener<T>): (() => void) => {
        listeners.push(listener);
        return () => {
          const index = listeners.indexOf(listener);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        };
      };
      return reactiveVar;
    };
  };

  /** Survives across "restarts" — that is the point of the test. */
  let disk: Record<string, string> = {};
  const asyncStorageMock = {
    getItem: async (key: string) => disk[key] ?? null,
    setItem: async (key: string, value: string) => {
      disk[key] = value;
    },
  };

  /** A fresh var over the same disk, as a relaunched app would build it. */
  const mountUsageVar = () =>
    createPersistentVar<LedgerAccountUsage>(STORAGE_KEY, {});

  beforeEach(() => {
    disk = {};
    originalApolloModule = require.cache[apolloPath];
    originalAsyncStorageModule = require.cache[asyncStoragePath];

    require.cache[apolloPath] = {
      exports: { makeVar: makeVarFactory() },
    } as NodeModule;
    require.cache[asyncStoragePath] = {
      exports: asyncStorageMock,
    } as NodeModule;

    const modulePath = require.resolve("../../apollo/persistent-var");
    delete require.cache[modulePath];
    ({ createPersistentVar } = require("../../apollo/persistent-var"));
  });

  afterEach(() => {
    const modulePath = require.resolve("../../apollo/persistent-var");
    delete require.cache[modulePath];

    if (originalApolloModule) {
      require.cache[apolloPath] = originalApolloModule;
    } else {
      delete require.cache[apolloPath];
    }

    if (originalAsyncStorageModule) {
      require.cache[asyncStoragePath] = originalAsyncStorageModule;
    } else {
      delete require.cache[asyncStoragePath];
    }
  });

  test("a picked account is still recent after a restart", async () => {
    const [usageVar] = mountUsageVar();
    usageVar(recordUsage(usageVar(), "ledger-1", "Expenses:Food", NOW));
    await Promise.resolve();

    const [reloadedVar, load] = mountUsageVar();
    expect(reloadedVar()).toEqual({});
    await load();

    expect(reloadedVar()).toEqual({
      "ledger-1": { "Expenses:Food": { count: 1, lastUsedAt: NOW } },
    });
    expect(
      topAccounts({ usage: usageFor(reloadedVar(), "ledger-1"), now: NOW }, 5),
    ).toEqual(["Expenses:Food"]);
  });

  test("counts and recency accumulate across restarts", async () => {
    const [firstRun] = mountUsageVar();
    firstRun(recordUsage(firstRun(), "ledger-1", "Expenses:Food", NOW - DAY));
    await Promise.resolve();

    const [secondRun, load] = mountUsageVar();
    await load();
    secondRun(recordUsage(secondRun(), "ledger-1", "Expenses:Food", NOW));
    await Promise.resolve();

    const [thirdRun, reload] = mountUsageVar();
    await reload();
    expect(thirdRun()["ledger-1"]["Expenses:Food"]).toEqual({
      count: 2,
      lastUsedAt: NOW,
    });
  });

  test("each ledger keeps its own recents across a restart", async () => {
    const [usageVar] = mountUsageVar();
    let usage = recordUsage(usageVar(), "ledger-1", "Expenses:Food", NOW);
    usage = recordUsage(usage, "ledger-2", "Expenses:Rent", NOW);
    usageVar(usage);
    await Promise.resolve();

    const [reloadedVar, load] = mountUsageVar();
    await load();

    expect(
      topAccounts({ usage: usageFor(reloadedVar(), "ledger-1"), now: NOW }, 5),
    ).toEqual(["Expenses:Food"]);
    expect(
      topAccounts({ usage: usageFor(reloadedVar(), "ledger-2"), now: NOW }, 5),
    ).toEqual(["Expenses:Rent"]);
    expect(
      topAccounts({ usage: usageFor(reloadedVar(), "ledger-3"), now: NOW }, 5),
    ).toEqual([]);
  });

  test("serializes as plain JSON, so a stored map stays readable", async () => {
    const [usageVar] = mountUsageVar();
    usageVar(recordUsage(usageVar(), "ledger-1", "Expenses:Food", NOW));
    await Promise.resolve();

    expect(disk[STORAGE_KEY]).toBe(
      JSON.stringify({
        "ledger-1": { "Expenses:Food": { count: 1, lastUsedAt: NOW } },
      }),
    );
  });

  test("a corrupt stored value leaves the app with empty usage", async () => {
    const errors: unknown[] = [];
    const originalError = console.error;
    console.error = ((message?: unknown) => {
      errors.push(message);
    }) as typeof console.error;

    try {
      disk[STORAGE_KEY] = "{not json";
      const [usageVar, load] = mountUsageVar();

      expect(await load()).toBe(null);
      expect(usageVar()).toEqual({});
      expect(errors.length > 0).toBe(true);
    } finally {
      console.error = originalError;
    }
  });
});
