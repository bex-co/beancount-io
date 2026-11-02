import {
  DEFAULT_PROPERTY_NAME,
  PROPERTY_NAME_PATTERN,
  PROPERTY_PLACEHOLDER,
  SETUP_MODULES,
  moduleAccounts,
  setupModules,
} from "../setup-modules";

describe("setup modules (w3/m60/t005)", () => {
  it("keeps the copy equal to the canonical catalog", () => {
    const fs = require("fs");
    const path = require("path");
    const canonical = path.join(
      __dirname,
      ...Array(5).fill(".."),
      "backend-cluster/backend-v2/src/features/ledger/setup/catalog.json",
    );
    if (!fs.existsSync(canonical)) return;
    const catalog = JSON.parse(fs.readFileSync(canonical, "utf8"));
    expect(
      SETUP_MODULES.map((module) => ({
        id: module.catalogId,
        accounts: module.accounts,
        named: Boolean(module.takesPropertyName),
        allowedPresets: module.allowedPresets.map(String),
      })),
    ).toEqual(
      catalog.modules.map(
        (module: {
          id: string;
          allowedPresets: string[];
          accounts: { name: string }[];
          parameters: unknown[];
        }) => ({
          id: module.id,
          accounts: module.accounts.map((account) => account.name),
          named: module.parameters.length > 0,
          // `personal@1` is the GraphQL enum value `PERSONAL`.
          allowedPresets: module.allowedPresets.map((id) =>
            id.split("@")[0].toUpperCase().split("-").join("_"),
          ),
        }),
      ),
    );
    const parameter = catalog.modules.find(
      (module: { parameters: unknown[] }) => module.parameters.length > 0,
    ).parameters[0];
    expect(parameter.placeholder).toBe(PROPERTY_PLACEHOLDER);
    expect(parameter.default).toBe(DEFAULT_PROPERTY_NAME);
    expect(parameter.pattern).toBe(PROPERTY_NAME_PATTERN.source);
  });

  it("fills the property name into the rental accounts, Property1 by default", () => {
    const rental = SETUP_MODULES.find((module) => module.takesPropertyName)!;
    expect(moduleAccounts(rental, "OakSt")[0]).toBe("Income:Rent:OakSt");
    expect(moduleAccounts(rental, "  ")[0]).toBe("Income:Rent:Property1");
  });

  it("sends modules for a personal ledger only, in catalog order", () => {
    expect(
      setupModules("PERSONAL", ["SIDE_BUSINESS", "RENTAL_PROPERTY"], " OakSt "),
    ).toEqual([
      { id: "RENTAL_PROPERTY", propertyName: "OakSt" },
      { id: "SIDE_BUSINESS" },
    ]);
    expect(setupModules("PERSONAL", ["RENTAL_PROPERTY"], "")).toEqual([
      { id: "RENTAL_PROPERTY" },
    ]);
    expect(setupModules("FREELANCE", ["INVESTMENTS"], "")).toBe(undefined);
    expect(setupModules("PERSONAL", [], "")).toBe(undefined);
  });
});
