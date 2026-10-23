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
