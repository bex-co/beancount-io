import { readFeatureFlags } from "../public-configuration";

describe("readFeatureFlags emailDelivery", () => {
  it("is false on a production server with no mail key", async () => {
    const flags = await readFeatureFlags({
      env: "production",
      sendGrid: { apiKey: "" },
      selfHost: false,
    });
    expect(flags.emailDelivery).toBe(false);
  });

  it("is true on a production server with a mail key", async () => {
    const flags = await readFeatureFlags({
      env: "production",
      sendGrid: { apiKey: "SG.test-key" },
      selfHost: false,
    });
    expect(flags.emailDelivery).toBe(true);
  });

  it("is false on a development server, which only logs mail", async () => {
    const flags = await readFeatureFlags({
      env: "development",
      sendGrid: { apiKey: "SG.test-key" },
      selfHost: false,
    });
    expect(flags.emailDelivery).toBe(false);
  });
});

describe("readFeatureFlags selfHost", () => {
  it.each([true, false])("repeats the deployment's setting: %s", async (on) => {
    const flags = await readFeatureFlags({
      env: "production",
      sendGrid: { apiKey: "" },
      selfHost: on,
    });
    expect(flags.selfHost).toBe(on);
  });
});
