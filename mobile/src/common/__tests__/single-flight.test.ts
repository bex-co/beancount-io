import fs from "fs";
import path from "path";
import { createSingleFlight } from "../single-flight";

// w21/044: Done stayed live through the addEntries round trip, so a second tap
// while "Saving…" posted the entry twice.
describe("createSingleFlight", () => {
  it("runs one write for presses in the same tick and during a held write", async () => {
    let release: (value: string) => void = () => undefined;
    let calls = 0;
    const write = () => {
      calls += 1;
      return new Promise<string>((resolve) => (release = resolve));
    };
    const busy: boolean[] = [];
    const flight = createSingleFlight((value) => busy.push(value));

    const first = flight.run(write);
    const second = flight.run(write); // same tick
    expect(flight.busy()).toBe(true);
    await Promise.resolve();
    const third = flight.run(write); // while held
    release("ok");

    expect(await first).toBe("ok");
    expect(await second).toBe(undefined);
    expect(await third).toBe(undefined);
    expect(calls).toBe(1);
    expect(busy).toEqual([true, false]);
    expect(flight.busy()).toBe(false);
  });

  it("reopens after a failed write so the draft can be saved again", async () => {
    const flight = createSingleFlight();
    let rejected = false;
    await flight
      .run(() => Promise.reject(new Error("offline")))
      .catch(() => (rejected = true));
    expect(rejected).toBe(true);
    expect(flight.busy()).toBe(false);
    expect(await flight.run(() => Promise.resolve(1))).toBe(1);
  });
});

describe("New Transaction's Done", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "..",
      "screens",
      "multi-postings-transaction",
      "multi-postings-transaction-screen.tsx",
    ),
    "utf8",
  );

  it("writes through the gate and is disabled while it is closed", () => {
    expect(source.includes("await flight.run(() =>")).toBe(true);
    expect(source.includes("if (savedOutRef.current || flight.busy())")).toBe(
      true,
    );
    expect(
      source.includes("disabled={saving || saved ? true : undefined}"),
    ).toBe(true);
    expect(source.includes("busy: saving")).toBe(true);
  });
});
