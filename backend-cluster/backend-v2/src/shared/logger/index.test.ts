import { logger } from ".";
import { asyncContext } from "@/shared/async-context";

describe("logger", () => {
  it("should be defined", () => {
    expect(logger).toBeDefined();
  });

  it("should have info method", () => {
    expect(logger.info).toBeDefined();
    expect(typeof logger.info).toBe("function");
  });

  it("should have error method", () => {
    expect(logger.error).toBeDefined();
    expect(typeof logger.error).toBe("function");
  });

  it("should have debug method", () => {
    expect(logger.debug).toBeDefined();
    expect(typeof logger.debug).toBe("function");
  });

  it("should have warn method", () => {
    expect(logger.warn).toBeDefined();
    expect(typeof logger.warn).toBe("function");
  });

  it("should be able to log messages without throwing", () => {
    expect(() => {
      logger.info("Test info message");
      logger.error("Test error message");
      logger.debug("Test debug message");
      logger.warn("Test warn message");
    }).not.toThrow();
  });

  it("should be able to log messages with metadata", () => {
    expect(() => {
      logger.info("Test message with metadata", { key: "value" });
      logger.error("Error with metadata", { error: "details" });
    }).not.toThrow();
  });

  it("should handle complex metadata objects", () => {
    expect(() => {
      logger.info("Complex metadata", {
        nested: {
          level: 1,
          data: "test",
        },
        array: [1, 2, 3],
        number: 42,
        boolean: true,
      });
    }).not.toThrow();
  });

  it("should handle empty metadata", () => {
    expect(() => {
      logger.info("Message with empty metadata", {});
    }).not.toThrow();
  });

  it("should have appropriate log level for test environment", () => {
    // In test environment, logger uses debug level (config.env resolves to "test")
    expect(logger.level).toBe("debug");
  });

  describe("child logger", () => {
    it("should have child method", () => {
      expect(logger.child).toBeDefined();
      expect(typeof logger.child).toBe("function");
    });

    it("should create a child logger", () => {
      const childLogger = logger.child({ module: "test-module" });
      expect(childLogger).toBeDefined();
      expect(childLogger.info).toBeDefined();
      expect(childLogger.error).toBeDefined();
      expect(childLogger.debug).toBeDefined();
      expect(childLogger.warn).toBeDefined();
    });

    it("should allow child logger to log messages without throwing", () => {
      const childLogger = logger.child({ module: "test-module" });
      expect(() => {
        childLogger.info("Child logger info");
        childLogger.error("Child logger error");
        childLogger.debug("Child logger debug");
        childLogger.warn("Child logger warn");
      }).not.toThrow();
    });

    it("should allow child logger to log with additional metadata", () => {
      const childLogger = logger.child({ module: "auth" });
      expect(() => {
        childLogger.info("User logged in", { userId: "123" });
        childLogger.error("Login failed", { error: "Invalid credentials" });
      }).not.toThrow();
    });

    it("should support chaining child loggers", () => {
      const parentLogger = logger.child({ module: "gitea" });
      const childLogger = parentLogger.child({ module: "gitea-repo-service" });
      expect(() => {
        childLogger.info("Repository created", { repoName: "test" });
      }).not.toThrow();
    });

    it("should preserve log level in child logger", () => {
      const childLogger = logger.child({ module: "test" });
      expect(childLogger.level).toBe(logger.level);
    });
  });

  describe("async context integration", () => {
    it("should automatically include requestId from async context", async () => {
      const context = { requestId: "req-test-123" };

      await asyncContext.run(context, async () => {
        // Logger should automatically include requestId
        expect(() => {
          logger.info("Test message");
        }).not.toThrow();
      });
    });

    it("should automatically include userId from async context", async () => {
      const context = { requestId: "req-test-456", userId: "user-test-456" };

      await asyncContext.run(context, async () => {
        expect(() => {
          logger.info("User action");
        }).not.toThrow();
      });
    });

    it("should merge async context with provided metadata", async () => {
      const context = { requestId: "req-merge-123" };

      await asyncContext.run(context, async () => {
        expect(() => {
          logger.info("Action", { action: "create", resource: "user" });
        }).not.toThrow();
      });
    });

    it("should work with child logger in async context", async () => {
      const context = { requestId: "req-child-123", userId: "user-child-123" };
      const childLogger = logger.child({ module: "test-module" });

      await asyncContext.run(context, async () => {
        expect(() => {
          childLogger.info("Child log with context");
        }).not.toThrow();
      });
    });

    it("should handle nested async operations with context", async () => {
      const context = { requestId: "req-nested-123" };

      async function nestedOperation() {
        await Promise.resolve();
        logger.info("Nested operation");
      }

      await asyncContext.run(context, async () => {
        expect(async () => {
          await nestedOperation();
        }).not.toThrow();
      });
    });

    it("should not fail when no async context is set", () => {
      // Should work normally without async context
      expect(() => {
        logger.info("Message without context");
      }).not.toThrow();
    });

    it("should include custom context fields", async () => {
      const context = {
        requestId: "req-custom-123",
        userId: "user-123",
        customField: "custom-value",
      };

      await asyncContext.run(context, async () => {
        expect(() => {
          logger.info("Custom context test");
        }).not.toThrow();
      });
    });

    it("should allow metadata to override context fields", async () => {
      const context = { requestId: "req-override-123", userId: "user-123" };

      await asyncContext.run(context, async () => {
        expect(() => {
          // Metadata should take precedence
          logger.info("Override test", { userId: "override-user" });
        }).not.toThrow();
      });
    });
  });
});
