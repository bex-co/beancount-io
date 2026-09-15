import fs from "fs";
import path from "path";

describe("missing-file Back to Files", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "screens",
      "ledger-file-editor-screen",
      "index.tsx",
    ),
    "utf8",
  );

  it("navigates explicitly to the Files tab instead of router.back()", () => {
    expect(source.includes('router.replace("/(app)/(tabs)/ledger")')).toBe(
      true,
    );
    // The recovery action must not depend on canGoBack / router.back.
    const unavailableBlock = source.slice(
      source.indexOf('editorState === "unavailable"'),
      source.indexOf('editorState === "content"'),
    );
    expect(unavailableBlock.includes("router.canGoBack")).toBe(false);
    expect(unavailableBlock.includes("router.back()")).toBe(false);
  });
});
