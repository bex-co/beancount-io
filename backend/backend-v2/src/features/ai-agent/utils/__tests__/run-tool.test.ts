import { runToolSafely } from "../run-tool";
import type { ILogger } from "@/shared/logger";

function makeLogger() {
  const warn = jest.fn();
  const error = jest.fn();
  const logger = { warn, error, info: jest.fn(), debug: jest.fn() };
  return { logger: logger as unknown as ILogger, warn, error };
}

describe("runToolSafely", () => {
  it("wraps a success payload as { ok: true, result }", async () => {
    const { logger, warn, error } = makeLogger();

    const out = await runToolSafely({
      logger,
      message: "should not log",
      execute: async () => ["a", "b"],
    });

    expect(out).toEqual({ ok: true, result: ["a", "b"] });
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("catches a thrown error, logs at the default warn level, returns { ok: false }", async () => {
    const { logger, warn } = makeLogger();

    const out = await runToolSafely({
      logger,
      message: "BQL query failed",
      context: { query: "SELECT 1" },
      execute: async () => {
        throw new Error("boom");
      },
    });

    expect(out).toEqual({ ok: false, error: "boom" });
    expect(warn).toHaveBeenCalledWith("BQL query failed", {
      query: "SELECT 1",
      error: "boom",
    });
  });

  it("honors level=error and formatError on a thrown error", async () => {
    const { logger, error } = makeLogger();

    const out = await runToolSafely({
      logger,
      message: "Failed to commit file operations",
      level: "error",
      formatError: (msg) => `commit failed: ${msg}`,
      execute: async () => {
        throw new Error("upstream 500");
      },
    });

    expect(out).toEqual({ ok: false, error: "commit failed: upstream 500" });
    expect(error).toHaveBeenCalledWith("Failed to commit file operations", {
      error: "upstream 500",
    });
  });
});
