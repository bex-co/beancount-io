import fs from "fs";
import path from "path";

// w21/879: a long folded account name was cut at its end, hiding the account the
// row opens.
describe("the Accounts tab's row label", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "account-table.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("is cut in the middle, so the leaf stays visible", () => {
    expect(
      source.includes(
        '<Textstyle={nameStyle}numberOfLines={1}ellipsizeMode="middle">{label}</Text>',
      ),
    ).toBe(true);
  });
});
