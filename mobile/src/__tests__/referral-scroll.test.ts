import fs from "fs";
import path from "path";

describe("Referral screen scroll layout", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "screens",
      "referral-screen",
      "referral-screen.tsx",
    ),
    "utf8",
  );

  it("uses a ScrollView so Copy/Share remain reachable at large text", () => {
    expect(source.includes("ScrollView")).toBe(true);
    expect(source.includes("contentContainerStyle={styles.body}")).toBe(true);
  });
});
