import { healthCheck } from "@/api/healthz";

describe("healthCheck", () => {
  it("returns the Python-compatible success envelope", () => {
    const res = healthCheck();
    expect(res.success).toBe(true);
    expect(res.data.status).toBe("healthy");
    expect(new Date(res.data.timestamp).getTime()).not.toBeNaN();
  });
});
