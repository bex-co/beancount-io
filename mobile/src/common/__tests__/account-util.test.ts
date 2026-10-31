import {
  breakableAccount,
  dropRoot,
  leafName,
  splitAccountLeaf,
} from "../account-util";

describe("splitAccountLeaf", () => {
  test("should split the parent path from the leaf segment", () => {
    expect(splitAccountLeaf("Assets:Bank:Checking")).toEqual({
      parent: "Assets:Bank:",
      leaf: "Checking",
    });
  });

  test("should leave a colon-free account entirely as the leaf", () => {
    expect(splitAccountLeaf("Assets")).toEqual({ parent: "", leaf: "Assets" });
  });

  test("should handle a trailing separator", () => {
    expect(splitAccountLeaf("Assets:")).toEqual({
      parent: "Assets:",
      leaf: "",
    });
  });

  test("should recombine into the original account name", () => {
    const account = "Expenses:Food:Restaurants";
    const { parent, leaf } = splitAccountLeaf(account);
    expect(parent + leaf).toBe(account);
  });
});

describe("leafName", () => {
  test("should return the last segment", () => {
    expect(leafName("Assets:Bank:Checking")).toBe("Checking");
  });

  test("should return the whole account when there is no separator", () => {
    expect(leafName("Assets")).toBe("Assets");
  });

  test("should fall back to the account for a trailing separator", () => {
    expect(leafName("Assets:")).toBe("Assets:");
  });
});

describe("dropRoot", () => {
  test("should drop the root segment", () => {
    expect(dropRoot("Expenses:Food:Groceries")).toBe("Food:Groceries");
  });

  test("should return the whole account when there is no separator", () => {
    expect(dropRoot("Expenses")).toBe("Expenses");
  });
});

// w21/627: at AX2 an account wrapped mid-word ("Assets:Bank:Checkin" / "g").
describe("breakableAccount", () => {
  it("offers a break after each separator and changes nothing else", () => {
    const shown = breakableAccount("Assets:Bank:Checking");
    expect(shown).toBe("Assets:​Bank:​Checking");
    expect(shown.replace(/​/g, "")).toBe("Assets:Bank:Checking");
  });

  it("leaves a single segment alone", () => {
    expect(breakableAccount("Assets")).toBe("Assets");
    expect(breakableAccount("")).toBe("");
  });
});

// w21/1013: at the largest text size the Accounts tab's stacked row and the
// account detail header drew an account as one unbroken token and split it
// mid-word ("Bank:Mercury:Checkin" / "g").
describe("breakableAccount on the stacked Accounts row and the detail header", () => {
  const read = (...parts: string[]) =>
    require("fs")
      .readFileSync(
        require("path").join(__dirname, "..", "..", ...parts),
        "utf8",
      )
      .replace(/\s+/g, "");

  it("breaks a long name only after a separator", () => {
    expect(breakableAccount("Assets:Bank:Mercury:Checking")).toBe(
      "Assets:\u200bBank:\u200bMercury:\u200bChecking",
    );
    expect(breakableAccount("Checking")).toBe("Checking");
  });

  it("is what the stacked Accounts row draws, not the wide row", () => {
    const table = read("components", "account-table", "account-table.tsx");
    expect(table.includes("{breakableAccount(label)}</Text>")).toBe(true);
    // The wide row keeps its middle ellipsis on the unbroken label.
    expect(table.includes('ellipsizeMode="middle"')).toBe(true);
  });

  it("is what the account detail header draws, bidi-isolated after the breaks", () => {
    const detail = read(
      "screens",
      "account-detail-screen",
      "account-detail-screen.tsx",
    );
    expect(
      detail.includes("{isolateAccountPath(breakableAccount(account))}"),
    ).toBe(true);
  });
});
