import fs from "fs";
import path from "path";

// w21/873: a tap before the camera was ready threw CameraNotReadyException out
// of an async handler, an unhandled rejection with no feedback.
describe("the receipt shutter", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "camera-view.tsx"), "utf8")
    .replace(/\s+/g, "");
  const handler = source.slice(source.indexOf("consthandleShutter=async()=>{"));

  it("catches a failed capture, with a haptic, before it re-arms", () => {
    const caught = handler.indexOf("}catch{");
    expect(
      caught > handler.indexOf("awaitcameraRef.current?.takePictureAsync"),
    ).toBe(true);
    expect(handler.slice(caught).startsWith("}catch{")).toBe(true);
    expect(
      handler.slice(caught, caught + 400).includes("haptics.error();"),
    ).toBe(true);
    expect(caught < handler.indexOf("}finally{setCapturing(false);")).toBe(
      true,
    );
  });
});

// w21/957: a haptic is nothing on an iPad or with System Haptics off, and a camera
// that never started showed a black preview with no word.
describe("the receipt camera's failure notice", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "camera-view.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("is said in visible, announced text on a failed capture and on a mount error", () => {
    expect(
      source.includes(
        'constmessage=t("receiptCameraNotReady");setNotice(message);AccessibilityInfo.announceForAccessibility(message);',
      ),
    ).toBe(true);
    expect(source.includes("onMountError={showNotReady}")).toBe(true);
    const handler = source.slice(
      source.indexOf("consthandleShutter=async()=>{"),
    );
    const caught = handler.indexOf("}catch{");
    expect(
      handler
        .slice(caught, caught + 600)
        .includes("haptics.error();showNotReady();"),
    ).toBe(true);
    expect(source.includes('accessibilityLiveRegion="polite"')).toBe(true);
    expect(source.includes("{notice?(")).toBe(true);
  });

  it("is cleared by a capture that works", () => {
    expect(source.includes("if(photo?.uri){setNotice(null);onCapture({")).toBe(
      true,
    );
  });

  it("is worded in every language", () => {
    const { en } = require("../../../translations/en");
    expect(en.receiptCameraNotReady).toBe(
      "Camera isn't ready. Try again or choose from photos.",
    );
  });
});
