import { readFeatureFlags } from "../public-configuration";

describe("readFeatureFlags emailDelivery", () => {
  it("is false on a production server with no mail key", async () => {
    const flags = await readFeatureFlags({
      env: "production",
      sendGrid: { apiKey: "" },
    });
    expect(flags.emailDelivery).toBe(false);
  });

  it("is true on a production server with a mail key", async () => {
    const flags = await readFeatureFlags({
      env: "production",
      sendGrid: { apiKey: "SG.test-key" },
    });
    expect(flags.emailDelivery).toBe(true);
  });

  it("is false on a development server, which only logs mail", async () => {
    const flags = await readFeatureFlags({
      env: "development",
      sendGrid: { apiKey: "SG.test-key" },
    });
    expect(flags.emailDelivery).toBe(false);
  });
});
