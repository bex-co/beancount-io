import fs from "fs";
import path from "path";

const SOURCE = fs.readFileSync(
  path.join(__dirname, "..", "account-picker-screen.tsx"),
  "utf8",
);

describe("account picker scroll settle race", () => {
  it("defers the settle timer until after a synchronous scroll failure", () => {
    expect(SOURCE.includes("scrollFailedSync")).toBe(true);
    expect(SOURCE.includes("scrollFailedSync.current = true")).toBe(true);
    expect(SOURCE.includes("if (scrollFailedSync.current")).toBe(true);
  });

  it("does not treat a missing list ref as a successful scroll", () => {
    expect(SOURCE.includes("if (!location || !listRef.current)")).toBe(true);
  });
});
