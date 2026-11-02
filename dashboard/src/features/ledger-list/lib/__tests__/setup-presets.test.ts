import { describe, it, expect } from "vitest";
import { SETUP_PRESETS } from "../setup-presets";
import { LedgerSetupPreset } from "@/graphql/definitions";

describe("setup presets", () => {
  it("lists every catalog preset exactly once", () => {
    expect(SETUP_PRESETS.map((preset) => preset.id).sort()).toEqual(
      Object.values(LedgerSetupPreset).sort(),
    );
  });
});
