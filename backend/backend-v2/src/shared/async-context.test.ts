import {
  asyncContext,
  getRequestContext,
  getRequestId,
  getUserId,
  updateRequestContext,
} from "./async-context";

describe("async-context", () => {
  describe("asyncContext", () => {
    it("should store and retrieve context within async operations", async () => {
      const context = { requestId: "test-req-123" };

      await asyncContext.run(context, async () => {
        const retrieved = asyncContext.getStore();
        expect(retrieved).toEqual(context);
      });
    });

    it("should return undefined outside of async context", () => {
      const retrieved = asyncContext.getStore();
      expect(retrieved).toBeUndefined();
    });

    it("should maintain context across async operations", async () => {
      const context = { requestId: "test-req-456", userId: "user-789" };

      await asyncContext.run(context, async () => {
        // Simulate async operation
        await Promise.resolve();

        const retrieved = asyncContext.getStore();
        expect(retrieved).toEqual(context);

        // Simulate another async operation
        await new Promise((resolve) => setTimeout(resolve, 10));

        const retrieved2 = asyncContext.getStore();
        expect(retrieved2).toEqual(context);
      });
    });
  });

  describe("getRequestContext", () => {
    it("should return the current request context", async () => {
      const context = { requestId: "req-001", userId: "user-001" };

      await asyncContext.run(context, async () => {
        const retrieved = getRequestContext();
        expect(retrieved).toEqual(context);
      });
    });

    it("should return undefined outside of context", () => {
      const retrieved = getRequestContext();
      expect(retrieved).toBeUndefined();
    });
  });

  describe("getRequestId", () => {
    it("should return the current request ID", async () => {
      const context = { requestId: "req-002" };

      await asyncContext.run(context, async () => {
        const requestId = getRequestId();
        expect(requestId).toBe("req-002");
      });
    });

    it("should return undefined outside of context", () => {
      const requestId = getRequestId();
      expect(requestId).toBeUndefined();
    });

    it("should return requestId even without userId", async () => {
      const context = { requestId: "req-003-only" };

      await asyncContext.run(context, async () => {
        const requestId = getRequestId();
        expect(requestId).toBe("req-003-only");
      });
    });
  });

  describe("getUserId", () => {
    it("should return the current user ID", async () => {
      const context = { requestId: "req-003", userId: "user-003" };

      await asyncContext.run(context, async () => {
        const userId = getUserId();
        expect(userId).toBe("user-003");
      });
    });

    it("should return undefined outside of context", () => {
      const userId = getUserId();
      expect(userId).toBeUndefined();
    });

    it("should return undefined if userId not set", async () => {
      const context = { requestId: "req-004" };

      await asyncContext.run(context, async () => {
        const userId = getUserId();
        expect(userId).toBeUndefined();
      });
    });
  });

  describe("updateRequestContext", () => {
    it("should update the current context with new data", async () => {
      const initialContext = { requestId: "req-005" };

      await asyncContext.run(initialContext, async () => {
        updateRequestContext({ userId: "user-005" });

        const updated = getRequestContext();
        expect(updated).toEqual({
          requestId: "req-005",
          userId: "user-005",
        });
      });
    });

    it("should merge new data with existing context", async () => {
      const initialContext = {
        requestId: "req-006",
        userId: "user-006",
      };

      await asyncContext.run(initialContext, async () => {
        updateRequestContext({ operation: "graphql-query" });

        const updated = getRequestContext();
        expect(updated).toEqual({
          requestId: "req-006",
          userId: "user-006",
          operation: "graphql-query",
        });
      });
    });

    it("should do nothing outside of context", () => {
      // Should not throw
      expect(() => {
        updateRequestContext({ userId: "user-007" });
      }).not.toThrow();
    });

    it("should allow overriding existing values", async () => {
      const initialContext = {
        requestId: "req-008",
        userId: "user-008",
      };

      await asyncContext.run(initialContext, async () => {
        updateRequestContext({ userId: "user-008-updated" });

        const updated = getRequestContext();
        expect(updated).toEqual({
          requestId: "req-008",
          userId: "user-008-updated",
        });
      });
    });
  });

  describe("nested async operations", () => {
    it("should maintain context through nested function calls", async () => {
      const context = { requestId: "req-009", userId: "user-009" };

      async function nestedFunc1() {
        const ctx = getRequestContext();
        expect(ctx).toEqual(context);

        await nestedFunc2();
      }

      async function nestedFunc2() {
        await Promise.resolve();
        const ctx = getRequestContext();
        expect(ctx).toEqual(context);
      }

      await asyncContext.run(context, async () => {
        await nestedFunc1();
      });
    });

    it("should allow context updates in nested calls", async () => {
      const initialContext = { requestId: "req-010" };

      async function authenticate() {
        updateRequestContext({ userId: "user-010" });
      }

      async function processRequest() {
        await authenticate();

        const ctx = getRequestContext();
        expect(ctx).toEqual({
          requestId: "req-010",
          userId: "user-010",
        });
      }

      await asyncContext.run(initialContext, async () => {
        await processRequest();
      });
    });
  });
});
