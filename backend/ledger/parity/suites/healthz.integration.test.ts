import { expectParity } from "../expect-parity";

describe("parity: healthz", () => {
  it("healthCheck — GET /healthz (no auth required)", async () => {
    const res = await expectParity({
      operation: "healthCheck",
      path: "/healthz",
      auth: "none",
    });
    expect(res.status).toBe(200);
  });
});
