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

  describe("context allowlist", () => {
    const LEVELS = ["debug", "info", "warn", "error"] as const;

    /** Spy on the winston instance the logger actually writes through. */
    function spyOnWinston() {
      const winstonInstance = (
        logger as unknown as { winstonInstance: Record<string, jest.Mock> }
      ).winstonInstance;
      return LEVELS.map((level) =>
        jest.spyOn(winstonInstance, level).mockImplementation(() => undefined),
      );
    }

    /** Spy on the winston child the logger's `child()` writes through. */
    function spyOnWinstonChild() {
      const winstonInstance = (
        logger as unknown as {
          winstonInstance: { child: (c: unknown) => unknown; level: string };
        }
      ).winstonInstance;
      const childCalls: Record<string, jest.Mock> = Object.fromEntries(
        LEVELS.map((level) => [level, jest.fn()]),
      );
      const childSpy = jest
        .spyOn(winstonInstance, "child")
        .mockReturnValue(childCalls as never);
      return { childCalls, restore: () => childSpy.mockRestore() };
    }

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("writes only allowlisted context fields, never the caller's credential", async () => {
      // `mergeContext` copies context fields by name, so a field holding a
      // secret cannot reach a log line by default. This asserts on what
      // winston actually receives rather than that nothing threw.
      const spies = spyOnWinston();

      await asyncContext.run(
        {
          requestId: "req-1",
          userId: "user-1",
          sessionToken: "super-secret-token",
          customField: "custom-value",
        },
        async () => {
          for (const level of LEVELS) logger[level](`${level} test`);
        },
      );

      for (const spy of spies) {
        const meta = spy.mock.calls[0][1];
        expect(JSON.stringify(meta)).not.toContain("super-secret-token");
        expect(meta).not.toHaveProperty("sessionToken");
        // Correlation fields survive; anything not allowlisted does not —
        // per-call detail belongs in the `meta` argument instead.
        expect(meta).toEqual({ requestId: "req-1", userId: "user-1" });
      }
    });

    it("keeps the credential out of a child logger's lines too", async () => {
      const { childCalls } = spyOnWinstonChild();
      const childLogger = logger.child({ module: "managed-prices" });

      await asyncContext.run(
        {
          requestId: "req-2",
          userId: "user-2",
          sessionToken: "super-secret-token",
        },
        async () => {
          for (const level of LEVELS) childLogger[level](`${level} test`);
        },
      );

      for (const level of LEVELS) {
        const meta = childCalls[level].mock.calls[0][1];
        expect(JSON.stringify(meta)).not.toContain("super-secret-token");
        expect(meta).not.toHaveProperty("sessionToken");
        expect(meta).toEqual({ requestId: "req-2", userId: "user-2" });
      }
    });

    it("does not let per-call metadata drag the credential in either", async () => {
      const spies = spyOnWinston();

      await asyncContext.run(
        { requestId: "req-3", sessionToken: "super-secret-token" },
        async () => {
          logger.info("with metadata", { ledger: "alice/personal" });
        },
      );

      expect(spies[1].mock.calls[0][1]).toEqual({
        requestId: "req-3",
        ledger: "alice/personal",
      });
    });

    it("passes metadata through untouched when the credential is all there is", async () => {
      const spies = spyOnWinston();

      // Nothing allowlisted is set, so no correlation object is invented: the
      // credential must not become the log line's only context.
      await asyncContext.run(
        { requestId: "", sessionToken: "super-secret-token" },
        async () => {
          logger.info("no correlation fields");
        },
      );

      expect(spies[1].mock.calls[0][1]).toBeUndefined();
    });

    it("lets metadata win over a context field of the same name", async () => {
      const spies = spyOnWinston();

      await asyncContext.run(
        { requestId: "req-4", userId: "user-4" },
        async () => {
          logger.info("override", { userId: "override-user" });
        },
      );

      expect(spies[1].mock.calls[0][1]).toEqual({
        requestId: "req-4",
        userId: "override-user",
      });
    });

    it("leaves metadata alone outside a request", () => {
      const spies = spyOnWinston();

      logger.info("no context", { ledger: "alice/personal" });

      expect(spies[1].mock.calls[0][1]).toEqual({ ledger: "alice/personal" });
    });
  });
});
