import { capitalizeAccountPrefill } from "../create-account-prefill";
import { validateAccountName } from "../../open-account-screen/account-name";

const opensValid = (query: string) =>
  validateAccountName(`Assets:${capitalizeAccountPrefill(query)}`).ok;

describe("capitalizeAccountPrefill", () => {
  it("capitalizes a lowercase Latin query so Open Account starts valid", () => {
    expect(capitalizeAccountPrefill("groceryboxw")).toBe("Groceryboxw");
    expect(validateAccountName("Assets:groceryboxw").ok).toBe(false);
    expect(opensValid("groceryboxw")).toBe(true);
  });

  it("leaves an already-capitalized query unchanged", () => {
    expect(capitalizeAccountPrefill("Groceryboxw")).toBe("Groceryboxw");
  });

  it("capitalizes only the first letter of each component", () => {
    expect(capitalizeAccountPrefill("food:dining-out")).toBe("Food:Dining-out");
    expect(opensValid("food:dining-out")).toBe(true);
  });

  it("capitalizes an accented Latin initial", () => {
    expect(capitalizeAccountPrefill("épargne")).toBe("Épargne");
  });

  it("passes caseless scripts, digits, and letters without a single uppercase form through", () => {
    expect(capitalizeAccountPrefill("日本")).toBe("日本");
    expect(capitalizeAccountPrefill("401k")).toBe("401k");
    expect(capitalizeAccountPrefill("ßteuer")).toBe("ßteuer");
  });

  it("does not repair a name that is invalid for another reason", () => {
    expect(capitalizeAccountPrefill("cash box")).toBe("Cash box");
    expect(opensValid("cash box")).toBe(false);
  });

  it("keeps an empty or whitespace-only query as it is", () => {
    expect(capitalizeAccountPrefill("")).toBe("");
    expect(capitalizeAccountPrefill("   ")).toBe("   ");
  });
});
