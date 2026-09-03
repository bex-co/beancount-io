import { spawnSync } from "node:child_process";

describe("runtime dependency compatibility", () => {
  it("loads the AI providers and harnesses in an untransformed Node process", () => {
    const imports = [
      "@ai-sdk/anthropic",
      "@ai-sdk/harness/agent",
      "@ai-sdk/harness-acp",
      "@ai-sdk/openai",
    ];
    const child = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `await Promise.all(${JSON.stringify(imports)}.map(specifier => import(specifier)))`,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(child.status).toBe(0);
    expect(child.stderr).toBe("");
  });
});
