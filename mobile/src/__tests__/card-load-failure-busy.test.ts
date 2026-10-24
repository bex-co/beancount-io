import fs from "fs";
import path from "path";

// w21/936: "Try again" showed no progress, and a refetch that failed the same way
// rendered nothing, so offline the tap looked dead.
describe("CardLoadFailure's retry", () => {
  const source = fs
    .readFileSync(
      path.join(__dirname, "../components/card-load-failure/index.tsx"),
      "utf8",
    )
    .replace(/\s+/g, "");

  it("shows a busy state for at least a moment, or until the retry settles", () => {
    expect(source.includes("constMIN_BUSY_MS=600;")).toBe(true);
    expect(source.includes("setBusy(true);")).toBe(true);
    expect(
      source.includes(
        "awaitPromise.all([Promise.resolve().then(onRetry).catch(()=>undefined),newPromise((resolve)=>setTimeout(resolve,MIN_BUSY_MS)),]);",
      ),
    ).toBe(true);
    expect(source.includes("disabled={busy}")).toBe(true);
    expect(source.includes("accessibilityState={{busy,disabled:busy}}")).toBe(
      true,
    );
    expect(source.includes("<ActivityIndicator")).toBe(true);
  });

  it("announces the failure again when it is still there afterwards", () => {
    expect(source.includes("if(mounted.current){setBusy(false);")).toBe(true);
    expect(
      source.includes(
        'AccessibilityInfo.announceForAccessibility(t("ledgerLoadError"));',
      ),
    ).toBe(true);
  });
});
