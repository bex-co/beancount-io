import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LedgerSetupModule } from "@/graphql/definitions";
import {
  DEFAULT_PROPERTY_NAME,
  PROPERTY_NAME_PATTERN,
  PROPERTY_PLACEHOLDER,
  SETUP_MODULES,
  moduleAccounts,
} from "../setup-modules";

const canonical = resolve(
  __dirname,
  "../../../../../../backend-cluster/backend-v2/src/features/ledger/setup/catalog.json",
);

describe("setup modules (w3/m60/t003)", () => {
  it("lists every GraphQL module once", () => {
    expect(SETUP_MODULES.map((module) => module.id).sort()).toEqual(
      Object.values(LedgerSetupModule).sort(),
    );
  });

  it.skipIf(!existsSync(canonical))(
    "matches the canonical catalog's ids, accounts, and property parameter",
    () => {
      const catalog = JSON.parse(readFileSync(canonical, "utf8")) as {
        modules: {
          id: string;
          accounts: { name: string }[];
          parameters: {
            placeholder: string;
            default: string;
            pattern: string;
          }[];
        }[];
      };
      expect(
        SETUP_MODULES.map((module) => ({
          id: module.catalogId,
          accounts: module.accounts,
          named: Boolean(module.takesPropertyName),
        })),
      ).toEqual(
        catalog.modules.map((module) => ({
          id: module.id,
          accounts: module.accounts.map((account) => account.name),
          named: module.parameters.length > 0,
        })),
      );
      const [parameter] = catalog.modules.find(
        (module) => module.parameters.length > 0,
      )!.parameters;
      expect(parameter).toMatchObject({
        placeholder: PROPERTY_PLACEHOLDER,
        default: DEFAULT_PROPERTY_NAME,
        pattern: PROPERTY_NAME_PATTERN.source,
      });
    },
  );

  it("fills the property name into the rental accounts, Property1 by default", () => {
    const rental = SETUP_MODULES.find((module) => module.takesPropertyName)!;
    expect(moduleAccounts(rental, "OakSt")[0]).toBe("Income:Rent:OakSt");
    expect(moduleAccounts(rental, " ")[0]).toBe("Income:Rent:Property1");
  });
});
