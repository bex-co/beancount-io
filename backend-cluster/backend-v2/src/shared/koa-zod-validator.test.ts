import { zodValidator } from "./koa-zod-validator";
import { z } from "zod";
import type Router from "@koa/router";

describe("koa-zod-validator", () => {
  let mockCtx: {
    request: { body: unknown };
    status?: number;
    body?: unknown;
  };
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockCtx = {
      request: { body: {} },
    };
    mockNext = jest.fn();
  });

  describe("zodValidator", () => {
    it("should validate and pass through valid data", async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const validData = {
        name: "John",
        age: 30,
      };

      mockCtx.request.body = validData;

      const middleware = zodValidator(schema) as Router.Middleware;
      await middleware(mockCtx as Router.RouterContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockCtx.request.body).toEqual(validData);
    });

    it("should reject extra fields if schema is strict", async () => {
      const schema = z
        .object({
          name: z.string(),
        })
        .strict();

      mockCtx.request.body = {
        name: "John",
        extra: "field",
      };

      const middleware = zodValidator(schema) as Router.Middleware;
      await middleware(mockCtx as Router.RouterContext, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCtx.status).toBe(400);
      expect(mockCtx.body).toHaveProperty("ok", false);
    });

    it("should pass through extra fields if schema is not strict", async () => {
      const schema = z.object({
        name: z.string(),
      });

      const inputData = {
        name: "John",
        extra: "field",
      };

      mockCtx.request.body = inputData;

      const middleware = zodValidator(schema) as Router.Middleware;
      await middleware(mockCtx as Router.RouterContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // Zod by default strips extra fields in .parse()
      expect(mockCtx.request.body).toEqual({ name: "John" });
    });

    it("should return 400 error for invalid data", async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockCtx.request.body = {
        name: "John",
        age: "not a number",
      };

      const middleware = zodValidator(schema) as Router.Middleware;
      await middleware(mockCtx as Router.RouterContext, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCtx.status).toBe(400);
      expect(mockCtx.body).toHaveProperty("ok", false);
      expect(mockCtx.body).toHaveProperty("error");
    });

    it("should include validation error details", async () => {
      const schema = z.object({
        email: z.string().email(),
      });

      mockCtx.request.body = {
        email: "not-an-email",
      };

      const middleware = zodValidator(schema) as Router.Middleware;
      await middleware(mockCtx as Router.RouterContext, mockNext);

      expect(mockCtx.status).toBe(400);
      const body = mockCtx.body as {
        ok: boolean;
        error: { code: string; message: string; details: unknown };
      };
      expect(body.error.code).toBe("BAD_USER_INPUT");
      expect(body.error.message).toContain("Invalid input data");
    });

    it("should handle missing required fields", async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockCtx.request.body = {
        name: "John",
      };

      const middleware = zodValidator(schema) as Router.Middleware;
      await middleware(mockCtx as Router.RouterContext, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCtx.status).toBe(400);
    });

    it("should handle nested object validation", async () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      });

      mockCtx.request.body = {
        user: {
          name: "John",
          email: "john@example.com",
        },
      };

      const middleware = zodValidator(schema) as Router.Middleware;
      await middleware(mockCtx as Router.RouterContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockCtx.request.body).toEqual({
        user: {
          name: "John",
          email: "john@example.com",
        },
      });
    });

    it("should handle array validation", async () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      mockCtx.request.body = {
        tags: ["tag1", "tag2", "tag3"],
      };

      const middleware = zodValidator(schema) as Router.Middleware;
      await middleware(mockCtx as Router.RouterContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockCtx.request.body).toEqual({
        tags: ["tag1", "tag2", "tag3"],
      });
    });

    it("should reject invalid array items", async () => {
      const schema = z.object({
        numbers: z.array(z.number()),
      });

      mockCtx.request.body = {
        numbers: [1, 2, "not a number", 4],
      };

      const middleware = zodValidator(schema) as Router.Middleware;
      await middleware(mockCtx as Router.RouterContext, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCtx.status).toBe(400);
    });

    it("should handle optional fields", async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().optional(),
      });

      mockCtx.request.body = {
        name: "John",
      };

      const middleware = zodValidator(schema) as Router.Middleware;
      await middleware(mockCtx as Router.RouterContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockCtx.request.body).toEqual({
        name: "John",
      });
    });

    it("should apply default values", async () => {
      const schema = z.object({
        name: z.string(),
        role: z.string().default("user"),
      });

      mockCtx.request.body = {
        name: "John",
      };

      const middleware = zodValidator(schema) as Router.Middleware;
      await middleware(mockCtx as Router.RouterContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockCtx.request.body).toEqual({
        name: "John",
        role: "user",
      });
    });

    it("should rethrow non-Zod errors", async () => {
      const schema = z.object({
        name: z.string(),
      });

      mockCtx.request.body = {
        name: "John",
      };

      // Mock next to throw a non-Zod error
      mockNext.mockRejectedValue(new Error("Some other error"));

      const middleware = zodValidator(schema) as Router.Middleware;

      await expect(
        middleware(mockCtx as Router.RouterContext, mockNext),
      ).rejects.toThrow("Some other error");
    });
  });
});
