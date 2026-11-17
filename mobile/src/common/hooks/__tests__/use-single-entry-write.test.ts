import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import { createSingleFlight } from "../../single-flight";

/**
 * w21/193: Done re-enabled while the refresh after the write ran, because the
 * mutation's `loading` ended before it, so a second tap wrote the budget
 * twice. Runs the real hook with React and Apollo stubbed. Covers both callers
 * the hook unified: the budget save (no haptics) and the account open (with).
 */
let writes = 0;
let refreshes = 0;
let releaseRefresh: (() => void) | null = null;
const busyStates: boolean[] = [];
const hapticCalls: string[] = [];
type Behavior =
  | { kind: "success" }
  | { kind: "failure"; message: string }
  | { kind: "throw"; error: unknown };
let behavior: Behavior = { kind: "success" };

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
          if (behavior.kind === "failure") {
            return {
              data: {
                bulkEntries: { success: false, message: behavior.message },
              },
            };
          }
          if (behavior.kind === "throw") throw behavior.error;
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
    "@/common/ledger-refusal": { ledgerWriteFailureMessage: () => "refused" },
    "@/common/haptics": {
      haptics: {
        success: () => hapticCalls.push("success"),
        error: () => hapticCalls.push("error"),
      },
    },
    "@/translations": { i18n: {} },
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

const { useSingleEntryWrite } = load(
  path.join(__dirname, "..", "use-single-entry-write.ts"),
);

beforeEach(() => {
  writes = 0;
  refreshes = 0;
  releaseRefresh = null;
  busyStates.length = 0;
  hapticCalls.length = 0;
  behavior = { kind: "success" };
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
  it("writes once however often Done is pressed", async () => {
    const { writeEntry } = useSingleEntryWrite("alice/books", () => ({}));
    const first = writeEntry({});
    await settle();
    // The write is done and the refresh is running: the old window.
    expect(writes).toBe(1);
    expect(await pressed(writeEntry({}))).toBe(null);
    expect(await pressed(writeEntry({}))).toBe(null);
    releaseRefresh?.();
    expect(JSON.stringify(await first)).toBe(JSON.stringify({ ok: true }));
    expect(writes).toBe(1);
    expect(refreshes).toBe(1);
    expect(busyStates).toEqual([true, false]);
  });

  it("writes with haptics once too", async () => {
    const { writeEntry } = useSingleEntryWrite("alice/books", () => ({}), {
      haptics: true,
    });
    const first = writeEntry({});
    await settle();
    expect(await pressed(writeEntry({}))).toBe(null);
    releaseRefresh?.();
    await first;
    expect(writes).toBe(1);
    expect(hapticCalls).toEqual(["success"]);
  });

  it("leaves haptics alone without the option", async () => {
    const { writeEntry } = useSingleEntryWrite("alice/books", () => ({}));
    const first = writeEntry({});
    await settle();
    releaseRefresh?.();
    await first;
    expect(hapticCalls).toEqual([]);
  });

  it("lets a save run again once the last one finished", async () => {
    const { writeEntry } = useSingleEntryWrite("alice/books", () => ({}));
    const first = writeEntry({});
    await settle();
    releaseRefresh?.();
    await first;
    const second = writeEntry({});
    await settle();
    releaseRefresh?.();
    await second;
    expect(writes).toBe(2);
  });

  it("reports a refused write with the server's trimmed message", async () => {
    behavior = { kind: "failure", message: "  duplicate  " };
    const { writeEntry } = useSingleEntryWrite("alice/books", () => ({}), {
      haptics: true,
    });
    const result = await writeEntry({});
    // Compared as text: the hook runs in a VM realm, so its objects fail
    // the runner's deep-equal on their prototype.
    expect(JSON.stringify(result)).toBe(
      JSON.stringify({ ok: false, message: "duplicate" }),
    );
    expect(hapticCalls).toEqual(["error"]);
    expect(refreshes).toBe(0);
  });

  it("reports a thrown write as refused", async () => {
    behavior = { kind: "throw", error: new Error("boom") };
    const { writeEntry } = useSingleEntryWrite("alice/books", () => ({}));
    expect(JSON.stringify(await writeEntry({}))).toBe(
      JSON.stringify({ ok: false, message: "refused" }),
    );
    expect(hapticCalls).toEqual([]);
  });
});
