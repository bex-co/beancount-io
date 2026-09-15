import fs from "fs";
import path from "path";

describe("transaction detail title wrapping", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "screens",
      "transaction-detail-screen",
      "transaction-detail-screen.tsx",
    ),
    "utf8",
  );

  it("does not clamp the hero title to two lines", () => {
    expect(source.includes("styles.heroTitle")).toBe(true);
    expect(source.includes("numberOfLines={2}")).toBe(false);
  });
});
