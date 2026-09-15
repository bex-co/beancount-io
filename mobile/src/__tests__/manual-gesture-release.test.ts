import fs from "fs";
import path from "path";
import {
  endManualGesture,
  failManualGesture,
  type ManualGestureManager,
} from "../common/manual-gesture-release";

function createManager() {
  const calls: string[] = [];
  const manager: ManualGestureManager = {
    end: () => calls.push("end"),
    fail: () => calls.push("fail"),
  };
  return { manager, calls };
}

// Scope: this covers the wiring only — that each pointer path terminates the
// manual recognizer, and with which transition. Whether the recognizer actually
// stays in BEGAN without these calls, and whether that is what leaves the
// ledger drawer unresponsive after a chart touch, can only be observed on a
// device/simulator with gesture-handler state tracing.
describe("manual gesture release", () => {
  it("ends the marker when the touch is released", () => {
    const { manager, calls } = createManager();
    endManualGesture(manager);
    expect(calls).toEqual(["end"]);
  });

  it("fails the marker when the touch is cancelled", () => {
    // A marker that never activated cannot "end" meaningfully; failing is the
    // transition that drops it out of BEGAN.
    const { manager, calls } = createManager();
    failManualGesture(manager);
    expect(calls).toEqual(["fail"]);
  });

  it("terminates on each path independently", () => {
    const { manager, calls } = createManager();
    endManualGesture(manager);
    failManualGesture(manager);
    expect(calls).toEqual(["end", "fail"]);
  });

  it("marks both terminators as worklets for UI-runtime gesture callbacks", () => {
    // Gesture-handler touch callbacks run on the UI runtime. Without the
    // worklet directive these imports are remote functions and throw
    // "Tried to synchronously call a Remote Function" (w3/191).
    const source = fs.readFileSync(
      path.join(__dirname, "..", "common", "manual-gesture-release.ts"),
      "utf8",
    );
    expect(source.includes('"worklet"')).toBe(true);
    expect(
      /export function endManualGesture[\s\S]*?"worklet"/.test(source),
    ).toBe(true);
    expect(
      /export function failManualGesture[\s\S]*?"worklet"/.test(source),
    ).toBe(true);
  });
});
