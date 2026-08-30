import { tools } from "../catalog";
import { EMPTY_FILTERS, filterTools } from "../filter-tools";

describe("filterTools", () => {
  it("returns the complete ordered catalog with no filters", () => {
    expect(filterTools(tools, EMPTY_FILTERS).map((tool) => tool.id)).toEqual(
      tools.map((tool) => tool.id),
    );
  });

  it("combines category, format, workflow, and text filters", () => {
    const result = filterTools(tools, {
      query: "offline",
      category: "mobile",
      format: "hledger",
      workflow: "mobile",
    });

    expect(result.map((tool) => tool.id)).toEqual(["nanoledger", "cashier"]);
  });

  it("searches tradeoffs as well as names and summaries", () => {
    expect(
      filterTools(tools, {
        ...EMPTY_FILTERS,
        query: "popularity contest",
      }),
    ).toEqual([]);
    expect(
      filterTools(tools, {
        ...EMPTY_FILTERS,
        query: "additional maintainers",
      }).map((tool) => tool.id),
    ).toEqual(["vscode-beancount"]);
  });
});
