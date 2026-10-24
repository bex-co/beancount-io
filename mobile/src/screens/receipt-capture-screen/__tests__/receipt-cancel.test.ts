import fs from "fs";
import path from "path";
import {
  abandonAttempt,
  createIdleGuard,
  uploadOutcome,
  uploadPercent,
} from "../upload-guard";

const read = (file: string) =>
  fs.readFileSync(path.join(__dirname, "..", file), "utf8").replace(/\s+/g, "");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// w21/205: the upload had no Cancel and a 60 s whole-transfer limit that cut
// off slow but working uploads.
describe("receipt upload limit", () => {
  it("fires only after silence, and a touch postpones it", async () => {
    let idle = 0;
    const guard = createIdleGuard(60, () => (idle += 1));
    guard.touch();
    await sleep(40);
    guard.touch(); // bytes moved: the clock restarts
    await sleep(40);
    expect(idle).toBe(0);
    await sleep(60);
    expect(idle).toBe(1);
  });

  it("does not fire once stopped", async () => {
    let idle = 0;
    const guard = createIdleGuard(20, () => (idle += 1));
    guard.touch();
    guard.stop();
    await sleep(50);
    expect(idle).toBe(0);
  });

  it("reports whole percent, or null while the size is unknown", () => {
    expect(
      uploadPercent({ totalBytesSent: 1, totalBytesExpectedToSend: 3 }),
    ).toBe(33);
    expect(
      uploadPercent({ totalBytesSent: 9, totalBytesExpectedToSend: 3 }),
    ).toBe(100);
    expect(
      uploadPercent({ totalBytesSent: 5, totalBytesExpectedToSend: -1 }),
    ).toBe(null);
    expect(
      uploadPercent({ totalBytesSent: 0, totalBytesExpectedToSend: 0 }),
    ).toBe(null);
  });
});

describe("cancelling a receipt upload", () => {
  it("offers Cancel on the busy overlay and wires it to the workflow", () => {
    expect(
      read("preview-view.tsx").includes('testID="receipt-busy-cancel"'),
    ).toBe(true);
    expect(
      read("receipt-capture-screen.tsx").includes(
        "onCancelBusy={workflow.cancel}",
      ),
    ).toBe(true);
  });

  it("aborts the request and the transfer, and ignores late results", () => {
    const source = read("use-receipt-workflow.ts");
    for (const piece of [
      'abandonAttempt(attempt.current);uploaded.current=null;setPhase({kind:"idle"});',
      "if(!live())return;",
      "FileSystem.createUploadTask(",
    ]) {
      expect(source.includes(piece)).toBe(true);
    }
    // The whole-transfer race is gone.
    expect(source.includes("60_000")).toBe(false);
  });

  it("marks the attempt cancelled and aborts the request and the transfer", async () => {
    let transferCancelled = 0;
    const run = {
      cancelled: false,
      abort: new AbortController(),
      upload: {
        cancelAsync: async () => {
          transferCancelled += 1;
        },
      },
    };
    abandonAttempt(run);
    await sleep(0);
    expect(run.cancelled).toBe(true);
    expect(run.abort.signal.aborted).toBe(true);
    expect(transferCancelled).toBe(1);
    // Nothing in flight is nothing to abandon.
    expect(() => abandonAttempt(null)).not.toThrow();
  });

  // w21/638: on Android, hardware Back popped the modal while the upload and
  // the AI parse ran on, spending receipt quota on an abandoned scan.
  it("abandons the attempt in flight when the screen goes away", () => {
    expect(
      read("use-receipt-workflow.ts").includes(
        "useEffect(()=>()=>{abandonAttempt(attempt.current);},[],);",
      ),
    ).toBe(true);
  });
});

// w21/636: leaving the app past the idle limit during an upload made it fail on
// return even when the photo had reached S3.
describe("how a receipt upload ended", () => {
  it("is ok for a finished 2xx, even when the idle timer fired on return", () => {
    expect(uploadOutcome({ status: 200 }, true)).toBe("ok");
    expect(uploadOutcome({ status: 204 }, false)).toBe("ok");
  });

  it("is a timeout only when the idle guard fired and nothing finished", () => {
    expect(uploadOutcome(undefined, true)).toBe("timeout");
    expect(uploadOutcome({ status: 0 }, true)).toBe("timeout");
  });

  it("is failed for a rejection or a missing result without a timeout", () => {
    expect(uploadOutcome({ status: 403 }, false)).toBe("failed");
    expect(uploadOutcome(null, false)).toBe("failed");
  });

  it("stops the clock with the app and restarts it on return", () => {
    const hook = read("use-receipt-workflow.ts");
    expect(
      hook.includes(
        'AppState.addEventListener("change",(state)=>{if(state==="active")idle.touch();elseidle.stop();})',
      ),
    ).toBe(true);
    expect(
      hook.includes("constoutcome=uploadOutcome(uploadResult,timedOut);"),
    ).toBe(true);
  });
});
