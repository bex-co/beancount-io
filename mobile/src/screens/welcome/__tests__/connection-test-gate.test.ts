import fs from "fs";
import path from "path";
import { createConnectionTestGate } from "../connection-test-gate";

/** A test whose response the test decides when to deliver. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/**
 * The screen's publish step, reduced to its decision: a finished test shows
 * its result only while it is still the current one (w2/030).
 */
async function runTest(
  gate: ReturnType<typeof createConnectionTestGate>,
  response: Promise<string>,
  shown: string[],
) {
  const token = gate.start();
  const result = await response;
  if (gate.isCurrent(token)) shown.push(result);
}

describe("connection test gate", () => {
  it("drops A's late result once the draft is edited to B", async () => {
    const gate = createConnectionTestGate();
    const shown: string[] = [];
    const a = deferred<string>();
    const pending = runTest(gate, a.promise, shown);
    gate.invalidate(); // the user types B while A is in flight
    a.resolve("A connected");
    await pending;
    expect(shown).toEqual([]);
  });

  it("drops A's late failure too", async () => {
    const gate = createConnectionTestGate();
    const shown: string[] = [];
    const a = deferred<string>();
    const pending = runTest(gate, a.promise, shown);
    gate.invalidate();
    a.resolve("A unreachable");
    await pending;
    expect(shown).toEqual([]);
  });

  it("lets B settle even when A finishes after B started", async () => {
    const gate = createConnectionTestGate();
    const shown: string[] = [];
    const a = deferred<string>();
    const b = deferred<string>();
    const pendingA = runTest(gate, a.promise, shown);
    gate.invalidate();
    const pendingB = runTest(gate, b.promise, shown);
    b.resolve("B connected");
    await pendingB;
    a.resolve("A connected");
    await pendingA;
    expect(shown).toEqual(["B connected"]);
  });

  it("still publishes an unchanged draft's result", async () => {
    const gate = createConnectionTestGate();
    const shown: string[] = [];
    await runTest(gate, Promise.resolve("connected"), shown);
    expect(shown).toEqual(["connected"]);
  });
});

describe("ServerSettingsScreen wiring", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "server-settings-screen.tsx"),
    "utf8",
  );
  const between = (from: string, to: string) =>
    source.slice(
      source.indexOf(from),
      source.indexOf(to, source.indexOf(from)),
    );

  it("publishes a result only after checking its test is still current", () => {
    const test = between("const onTestConnection", "const onSave");
    const start = test.indexOf("testGate.start()");
    const guard = test.indexOf("if (!testGate.isCurrent(token)) return;");
    const publish = test.indexOf("setConnection(result)");
    expect(start > -1 && guard > start && publish > guard).toBe(true);
  });

  it("invalidates in-flight tests when the draft is edited or reset", () => {
    expect(
      between("onChangeText", "placeholder=").includes(
        "testGate.invalidate();",
      ),
    ).toBe(true);
    expect(
      between("const onRestoreDefault", "const connectionIsSuccess").includes(
        "testGate.invalidate();",
      ),
    ).toBe(true);
  });
});
