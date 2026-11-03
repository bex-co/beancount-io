import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import { createSingleFlight } from "../../../../common/single-flight";

/**
 * w21/193: Done re-enabled while the refresh after the write ran, because the
 * mutation's `loading` ended before it, so a second tap wrote the budget
 * twice. Runs the real hook with React and Apollo stubbed.
 */
let writes = 0;
let refreshes = 0;
let releaseRefresh: (() => void) | null = null;
const busyStates: boolean[] = [];

function load(file: string): Record<string, any> {
  const exports: Record<string, any> = {};
  const modules: Record<string, unknown> = {
    react: {
      useCallback: (fn: unknown) => fn,
      useRef: (initial: unknown) => ({ current: initial }),
      useState: (initial: unknown) => [
        initial,
        (next: boolean) => busyStates.push(next),
      ],
    },
    "@apollo/client": { useApolloClient: () => ({}) },
    "@/generated-graphql/graphql": {
      useBulkEntriesMutation: () => [
        async () => {
          writes += 1;
          return { data: { bulkEntries: { success: true } } };
        },
        // The mutation's own state: it ends before the refresh does.
        { loading: false },
      ],
    },
    "@/common/apollo/invalidate-ledger": {
      invalidateLedgerData: () => {
        refreshes += 1;
        return new Promise<void>((resolve) => (releaseRefresh = resolve));
      },
    },
    "@/common/single-flight": { createSingleFlight },
    // Retry-safety has its own suite (entry-write.test.ts); here it passes through.
    "@/common/entry-write": {
      useEntryWrite: () => ({
        withRequestId: (variables: object) => variables,
        send: (write: () => Promise<unknown>) => write(),
        reset() {},
      }),
    },
    "@/common/ledger-refusal": { ledgerWriteFailureMessage: () => null },
    "@/common/haptics": { haptics: { success() {}, error() {} } },
    "@/translations": { i18n: {} },
    "@/screens/budget-screen/build-budget-entry": {
      buildBudgetEntry: () => ({}),
    },
    "./open-account-entry": { buildOpenAccountEntry: () => ({}) },
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: (id: string) => {
        if (!(id in modules)) throw new Error(`Unexpected dependency ${id}`);
        return modules[id];
      },
    },
  );
  return exports;
}

const { useSaveBudget } = load(
  path.join(__dirname, "..", "use-save-budget.ts"),
);
const { useOpenAccount } = load(
  path.join(
    __dirname,
    "..",
    "..",
    "..",
    "open-account-screen",
    "use-open-account.ts",
  ),
);

beforeEach(() => {
  writes = 0;
  refreshes = 0;
  releaseRefresh = null;
  busyStates.length = 0;
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
// A press that ran the write again would wait on a refresh nobody releases,
// and the runner would end quietly with no result; name that as a result.
const pressed = <T>(press: Promise<T>) =>
  Promise.race([
    press,
    new Promise<string>((resolve) =>
      setTimeout(() => resolve("ran again"), 20),
    ),
  ]);

describe("a save stays single through its refresh", () => {
  it("writes a budget once however often Done is pressed", async () => {
    const { saveBudget } = useSaveBudget("alice/books");
    const first = saveBudget({});
    await settle();
    // The write is done and the refresh is running: the old window.
    expect(writes).toBe(1);
    expect(await pressed(saveBudget({}))).toBe(null);
    expect(await pressed(saveBudget({}))).toBe(null);
    releaseRefresh?.();
    expect(JSON.stringify(await first)).toBe(JSON.stringify({ ok: true }));
    expect(writes).toBe(1);
    expect(refreshes).toBe(1);
    expect(busyStates).toEqual([true, false]);
  });

  it("opens an account once too", async () => {
    const { openAccount } = useOpenAccount("alice/books");
    const first = openAccount({});
    await settle();
    expect(await pressed(openAccount({}))).toBe(null);
    releaseRefresh?.();
    await first;
    expect(writes).toBe(1);
  });

  it("lets a save run again once the last one finished", async () => {
    const { saveBudget } = useSaveBudget("alice/books");
    const first = saveBudget({});
    await settle();
    releaseRefresh?.();
    await first;
    const second = saveBudget({});
    await settle();
    releaseRefresh?.();
    await second;
    expect(writes).toBe(2);
  });
});
