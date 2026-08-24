import { describe, it, vi } from "vitest";
import { writeFileSync } from "fs";
import { resolve } from "path";

// Mock Cloudflare modules that aren't available outside Workers runtime
vi.mock("@cloudflare/sandbox", () => ({
  Sandbox: vi.fn(),
  getSandbox: vi.fn(),
  proxyToSandbox: vi.fn(() => Promise.resolve(null)),
}));

describe("Generate OpenAPI spec", () => {
  it("writes openapi.json", async () => {
    const app = await import("../src/index.js");
    const mockEnv = {
      ANTHROPIC_API_KEY: "",
      ADMIN_TOKEN: "",
      Sandbox: {} as any,
      TASK_MANAGER: {} as any,
    };
    const response = await app.default.fetch(
      new Request("http://localhost/openapi.json"),
      mockEnv
    );
    const spec = await response.json();
    writeFileSync(
      resolve(__dirname, "../../idl/claude-code-sandbox.openapi.json"),
      JSON.stringify(spec, null, 2) + "\n"
    );
  });
});
