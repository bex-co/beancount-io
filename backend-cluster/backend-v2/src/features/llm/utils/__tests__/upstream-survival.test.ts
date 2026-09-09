import { spawnSync } from "child_process";
import path from "path";

/**
 * Process-survival gate for the LLM extraction path (w2/m30/t001, ADR 0011
 * D6): a hostile upstream — auth rejection, socket destroyed mid-body,
 * garbage body, connection reset — must surface as an ordinary thrown error,
 * never as a process crash. Runs the real AI SDK against a rogue local
 * upstream in a child Node process with strict unhandled-rejection semantics,
 * exactly the class of failure that took production down on 2026-09-08.
 */
test("extraction survives hostile LLM upstreams in a strict child process", () => {
  const harness = path.join(
    __dirname,
    "helpers",
    "upstream-survival-harness.ts",
  );
  const result = spawnSync(
    "npx",
    ["ts-node", "-r", "tsconfig-paths/register", "--transpile-only", harness],
    {
      cwd: path.join(__dirname, "../../../../.."),
      env: {
        ...process.env,
        NODE_OPTIONS: "--unhandled-rejections=strict",
      },
      encoding: "utf8",
      timeout: 120_000,
    },
  );

  const stdout = result.stdout ?? "";
  expect(stdout).toContain("HANDLED:reject401");
  expect(stdout).toContain("HANDLED:destroy-mid-body");
  expect(stdout).toContain("HANDLED:garbage-then-destroy");
  expect(stdout).toContain("HANDLED:reset");
  expect(stdout).toContain("RESCUED");
  expect(stdout).toContain("SURVIVED_ALL");
  expect(stdout).not.toContain("UNEXPECTED_SUCCESS");
  expect(stdout).not.toContain("RESCUE_FAILED");
  expect(result.status).toBe(0);
}, 150_000);
