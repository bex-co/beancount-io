import fs from "fs";
import path from "path";

describe("merchant recurring switch labelling", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "screens",
      "merchant-detail-screen",
      "merchant-detail-screen.tsx",
    ),
    "utf8",
  );

  it("labels the switch by the setting name, not the flip action", () => {
    expect(source.includes('t("merchantsRecurringToggle")')).toBe(true);
    expect(source.includes("merchantsMarkNotRecurring")).toBe(false);
    expect(source.includes("merchantsMarkRecurring")).toBe(false);
  });
});
