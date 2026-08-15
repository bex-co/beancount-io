import { dropRoot, leafName, splitAccountLeaf } from "../account-util";

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
