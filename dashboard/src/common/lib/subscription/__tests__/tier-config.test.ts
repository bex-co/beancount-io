import { describe, it, expect } from "vitest";
import { TIER_RANK, TIERS, getTierInfo, getUpgradeTiers } from "../tier-config";

describe("tier-config", () => {
  describe("TIER_RANK", () => {
    it("should have correct ordering", () => {
      expect(TIER_RANK.FREE).toBe(0);
      expect(TIER_RANK.PREMIUM).toBe(1);
      expect(TIER_RANK.GROWTH).toBe(2);
      expect(TIER_RANK.ORGANIZATION).toBe(3);
      expect(TIER_RANK.ENTERPRISE).toBe(4);
    });

    it("should have increasing ranks", () => {
      expect(TIER_RANK.FREE).toBeLessThan(TIER_RANK.PREMIUM);
      expect(TIER_RANK.PREMIUM).toBeLessThan(TIER_RANK.GROWTH);
      expect(TIER_RANK.GROWTH).toBeLessThan(TIER_RANK.ORGANIZATION);
      expect(TIER_RANK.ORGANIZATION).toBeLessThan(TIER_RANK.ENTERPRISE);
    });
  });

  describe("TIERS", () => {
    it("should have 3 purchasable tiers", () => {
      expect(TIERS).toHaveLength(3);
    });

    it("should have premium, growth, and organization tiers in order", () => {
      expect(TIERS[0].key).toBe("premium");
      expect(TIERS[1].key).toBe("growth");
      expect(TIERS[2].key).toBe("organization");
    });

    it("should mark growth as popular", () => {
      const growth = TIERS.find((t) => t.key === "growth");
      expect(growth?.popular).toBe(true);
    });

    it("should not mark premium or organization as popular", () => {
      const premium = TIERS.find((t) => t.key === "premium");
      const org = TIERS.find((t) => t.key === "organization");
      expect(premium?.popular).toBeUndefined();
      expect(org?.popular).toBeUndefined();
    });

    it("should have correct userTier mapping for each tier", () => {
      expect(TIERS[0].userTier).toBe("PREMIUM");
      expect(TIERS[1].userTier).toBe("GROWTH");
      expect(TIERS[2].userTier).toBe("ORGANIZATION");
    });

    it("should have ranks matching TIER_RANK values", () => {
      for (const tier of TIERS) {
        expect(tier.rank).toBe(TIER_RANK[tier.userTier]);
      }
    });
  });

  describe("getTierInfo", () => {
    it("should return tier info for PREMIUM", () => {
      const info = getTierInfo("PREMIUM");
      expect(info).not.toBeNull();
      expect(info?.key).toBe("premium");
      expect(info?.price).toBe("$14.99");
    });

    it("should return tier info for GROWTH", () => {
      const info = getTierInfo("GROWTH");
      expect(info).not.toBeNull();
      expect(info?.key).toBe("growth");
      expect(info?.price).toBe("$99.99");
    });

    it("should return tier info for ORGANIZATION", () => {
      const info = getTierInfo("ORGANIZATION");
      expect(info).not.toBeNull();
      expect(info?.key).toBe("organization");
      expect(info?.price).toBe("$499.99");
    });

    it("should return null for FREE", () => {
      expect(getTierInfo("FREE")).toBeNull();
    });

    it("should return null for ENTERPRISE", () => {
      expect(getTierInfo("ENTERPRISE")).toBeNull();
    });

    it("should return complete tier info with all fields for GROWTH", () => {
      const info = getTierInfo("GROWTH");
      expect(info).toEqual({
        key: "growth",
        userTier: "GROWTH",
        rank: 2,
        price: "$99.99",
        labelKey: "aiAgent.growthTier",
        popular: true,
      });
    });

    it("should return complete tier info with all fields for ORGANIZATION", () => {
      const info = getTierInfo("ORGANIZATION");
      expect(info).toEqual({
        key: "organization",
        userTier: "ORGANIZATION",
        rank: 3,
        price: "$499.99",
        labelKey: "aiAgent.organizationTier",
      });
    });
  });

  describe("getUpgradeTiers", () => {
    it("should return all 3 tiers for FREE user", () => {
      const tiers = getUpgradeTiers("FREE");
      expect(tiers).toHaveLength(3);
      expect(tiers.map((t) => t.key)).toEqual([
        "premium",
        "growth",
        "organization",
      ]);
    });

    it("should return growth + organization for PREMIUM user", () => {
      const tiers = getUpgradeTiers("PREMIUM");
      expect(tiers).toHaveLength(2);
      expect(tiers.map((t) => t.key)).toEqual(["growth", "organization"]);
    });

    it("should return only organization for GROWTH user", () => {
      const tiers = getUpgradeTiers("GROWTH");
      expect(tiers).toHaveLength(1);
      expect(tiers[0].key).toBe("organization");
    });

    it("should return empty array for ORGANIZATION user", () => {
      expect(getUpgradeTiers("ORGANIZATION")).toHaveLength(0);
    });

    it("should return empty array for ENTERPRISE user", () => {
      expect(getUpgradeTiers("ENTERPRISE")).toHaveLength(0);
    });
  });
});
