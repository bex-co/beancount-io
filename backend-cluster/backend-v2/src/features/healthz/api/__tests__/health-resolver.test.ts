import "reflect-metadata";
import { HealthResolver } from "../health-resolver";

describe("HealthResolver", () => {
  let resolver: HealthResolver;

  beforeEach(() => {
    jest.clearAllMocks();
    resolver = new HealthResolver();
  });

  describe("health", () => {
    it("should return OK status", async () => {
      const result = await resolver.health();

      expect(result).toBe("OK");
    });
  });
});
