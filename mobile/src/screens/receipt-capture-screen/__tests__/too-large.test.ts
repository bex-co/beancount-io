import fs from "fs";
import path from "path";
import { receiptTooLarge, shotFromLibraryResult } from "../receipt-utils";

// w21/955: an image over what the model reads failed every parse, with a Try
// Again that could only upload the same file.
describe("receiptTooLarge", () => {
  it("refuses over 5 MB, or over 8000 pixels on either side", () => {
    expect(receiptTooLarge({ fileSize: 5 * 1024 * 1024 + 1 })).toBe(true);
    expect(receiptTooLarge({ width: 1080, height: 12000 })).toBe(true);
    expect(receiptTooLarge({ width: 8001, height: 600 })).toBe(true);
  });

  it("takes what is at the limit, and what reports nothing", () => {
    expect(
      receiptTooLarge({ fileSize: 5 * 1024 * 1024, width: 8000, height: 8000 }),
    ).toBe(false);
    expect(receiptTooLarge({})).toBe(false);
    expect(
      receiptTooLarge({ width: 3024, height: 4032, fileSize: 2_000_000 }),
    ).toBe(false);
  });

  it("is read from the library pick's size and dimensions", () => {
    const shot = shotFromLibraryResult({
      canceled: false,
      assets: [
        {
          uri: "file:///tall.png",
          fileName: "tall.png",
          fileSize: 900_000,
          width: 1080,
          height: 12000,
        },
      ],
    })!;
    expect([shot.fileSize, shot.width, shot.height]).toEqual([
      900_000, 1080, 12000,
    ]);
    expect(receiptTooLarge(shot)).toBe(true);
  });

  it("stops a pick or a capture before it is kept, with a distinct message", () => {
    const source = fs
      .readFileSync(
        path.join(__dirname, "..", "receipt-capture-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(source.includes("if(receiptTooLarge(picked)){")).toBe(true);
    expect(source.includes("if(receiptTooLarge(captured)){")).toBe(true);
    expect(source.split('Alert.alert(t("receiptTooLarge"))').length - 1).toBe(
      2,
    );
  });
});
