import fs from "fs";
import path from "path";
import {
  DEFAULT_TOAST_DURATION,
  toastDuration,
  withToast,
  withoutToast,
} from "../toast-queue";

/**
 * The toast queue the provider runs on. This file used to assert only against
 * objects it built itself (and `expect(true).toBe(true)`); the queue now lives
 * in an import-free module the provider uses and this file imports.
 */
describe("toast queue", () => {
  const a = { id: "1", message: "Saved", type: "success" as const };
  const b = { id: "2", message: "Copied", type: "text" as const };

  it("shows a toast for the default duration unless told otherwise", () => {
    // Two seconds, as every caller that passes no duration expects.
    expect(DEFAULT_TOAST_DURATION).toBe(2000);
    expect(toastDuration({ message: "x", type: "text" })).toBe(
      DEFAULT_TOAST_DURATION,
    );
    expect(toastDuration({ message: "x", type: "text", duration: 5000 })).toBe(
      5000,
    );
    expect(toastDuration({ message: "x", type: "text", duration: 0 })).toBe(
      DEFAULT_TOAST_DURATION,
    );
  });

  it("queues toasts in order without mutating the current list", () => {
    const current = [a];
    expect(withToast(current, b)).toEqual([a, b]);
    expect(current).toEqual([a]);
  });

  it("dismisses only the toast with that id", () => {
    expect(withoutToast([a, b], "1")).toEqual([b]);
    expect(withoutToast([a, b], "missing")).toEqual([a, b]);
  });

  it("is what the provider adds, removes and times out with", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "index.tsx"),
      "utf8",
    );
    expect(source.includes("withToast(prev, { id, ...message })")).toBe(true);
    expect(source.includes("withoutToast(prev, id)")).toBe(true);
    expect(source.includes("toastDuration(message)")).toBe(true);
  });
});
