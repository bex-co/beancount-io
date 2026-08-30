import {
  knownStaleDestinations,
  tools,
  validateCatalog,
  type CatalogTool,
} from "../catalog";

describe("Awesome PTA catalog", () => {
  it("satisfies the catalog invariants", () => {
    expect(validateCatalog(tools)).toEqual([]);
    expect(tools.length).toBeGreaterThanOrEqual(20);
  });

  it("contains none of the destinations found stale in the review", () => {
    const destinations = new Set(tools.map((tool) => tool.href));
    for (const staleDestination of knownStaleDestinations) {
      expect(destinations.has(staleDestination)).toBe(false);
    }
  });

  it("reports duplicate and unsafe destinations", () => {
    const template = tools[0];
    const invalid = [
      template,
      {
        ...template,
        id: template.id,
        href: "http://example.com/project",
      },
    ] satisfies readonly CatalogTool[];

    expect(validateCatalog(invalid)).toEqual(
      expect.arrayContaining([
        `${template.id}: duplicate id`,
        `${template.id}: destination must use HTTPS`,
      ]),
    );
  });
});
