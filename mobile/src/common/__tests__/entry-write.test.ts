import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import { ApolloError } from "@apollo/client";
import { GraphQLError } from "graphql";
import {
  EntryWriteMaybeSavedError,
  fingerprint,
  isEntryWriteInProgress,
  sendEntryWrite,
} from "../entry-write";
import { graphQLErrorExtensions } from "../graphql-error-codes";
import { ledgerWriteFailureMessage } from "../ledger-refusal";

/** Retry-safe entry writes (w3/m61). */
const inProgress = () =>
  new ApolloError({
    graphQLErrors: [
      new GraphQLError(
        "Entry write conflict: A write with this requestId is still in progress",
        { extensions: { code: "CONFLICT", resource: "Entry write" } },
      ),
    ],
  });
const otherConflict = () =>
  new ApolloError({
    graphQLErrors: [
      new GraphQLError("File conflict", {
        extensions: { code: "CONFLICT", resource: "File" },
      }),
    ],
  });

function recorder() {
  const waits: number[] = [];
  return { waits, wait: async (ms: number) => void waits.push(ms) };
}

describe("sendEntryWrite", () => {
  it("retries an in-progress write with backoff and returns its result", async () => {
    let calls = 0;
    const { waits, wait } = recorder();
    const result = await sendEntryWrite(async () => {
      calls += 1;
      if (calls < 3) throw inProgress();
      return "saved";
    }, wait);

    expect(result).toBe("saved");
    expect(calls).toBe(3);
    expect(waits).toEqual([1000, 2000]);
  });

  it("gives up after bounded retries, so the screen never spins on", async () => {
    let calls = 0;
    const { wait } = recorder();
    let caught: unknown;
    try {
      await sendEntryWrite(async () => {
        calls += 1;
        throw inProgress();
      }, wait);
    } catch (error) {
      caught = error;
    }

    expect(caught instanceof EntryWriteMaybeSavedError).toBe(true);
    expect(calls).toBe(4);
  });

  it("passes any other failure through on the first attempt", async () => {
    const refused = otherConflict();
    let calls = 0;
    let caught: unknown;
    try {
      await sendEntryWrite(async () => {
        calls += 1;
        throw refused;
      }, recorder().wait);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBe(refused);
    expect(calls).toBe(1);
    expect(isEntryWriteInProgress(refused)).toBe(false);
    expect(graphQLErrorExtensions(inProgress())[0]?.resource).toBe(
      "Entry write",
    );
  });

  it("reports a write that may have landed as unconfirmed, never as failed", () => {
    const i18n = { t: (key: string) => key };
    expect(
      ledgerWriteFailureMessage(new EntryWriteMaybeSavedError(), i18n),
    ).toBe("ledgerWriteUnconfirmed");
  });
});

describe("fingerprint", () => {
  it("is stable for the same content and differs for changed content", () => {
    const rent = { entries: [{ amount: "2000.00" }] };
    expect(fingerprint(rent)).toBe(
      fingerprint({ entries: [{ amount: "2000.00" }] }),
    );
    expect(
      fingerprint(rent) === fingerprint({ entries: [{ amount: "2100.00" }] }),
    ).toBe(false);
  });
});

/** The real hook, with React and Apollo stubbed, as use-save-budget.test does. */
function loadHook() {
  const invalidations: string[] = [];
  const exports: Record<string, any> = {};
  const modules: Record<string, unknown> = {
    react: {
      useCallback: (fn: unknown) => fn,
      useRef: (initial: unknown) => ({ current: initial }),
    },
    "@apollo/client": { useApolloClient: () => ({}) },
    "./apollo/invalidate-ledger": {
      invalidateLedgerData: async (_client: unknown, scope: string) => {
        invalidations.push(scope);
      },
    },
    "./graphql-error-codes": { graphQLErrorExtensions },
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(path.join(__dirname, "..", "entry-write.ts"), "utf8"),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText,
    {
      exports,
      setTimeout,
      require: (id: string) => {
        if (!(id in modules)) throw new Error(`Unexpected dependency ${id}`);
        return modules[id];
      },
    },
  );
  return { hook: exports.useEntryWrite(), invalidations };
}

describe("useEntryWrite", () => {
  const rent = { ledgerId: "alice/books", entries: [{ amount: "2000.00" }] };

  it("names a resend of the same entry with the same id and an edit with a new one", () => {
    const { hook } = loadHook();
    const first = hook.withRequestId(rent).requestId;

    expect(hook.withRequestId(rent).requestId).toBe(first);
    expect(
      hook.withRequestId({ ...rent, entries: [{ amount: "2100.00" }] })
        .requestId === first,
    ).toBe(false);
    expect(first.length <= 200).toBe(true);
  });

  it("starts a new id after a save, so a second identical entry is its own write", async () => {
    const { hook } = loadHook();
    const first = hook.withRequestId(rent).requestId;

    await hook.send(async () => "saved");

    expect(hook.withRequestId(rent).requestId === first).toBe(false);
  });

  it("keeps the id after a refusal, so resending the unchanged entry is a retry", async () => {
    const { hook, invalidations } = loadHook();
    const first = hook.withRequestId(rent).requestId;

    try {
      await hook.send(async () => {
        throw otherConflict();
      });
    } catch {
      // Refused; the screen shows it.
    }

    expect(hook.withRequestId(rent).requestId).toBe(first);
    expect(invalidations).toEqual([]);
  });
});
