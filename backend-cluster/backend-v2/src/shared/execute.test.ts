import { tryCatch, delayRun } from "./execute";
import { logger } from "./logger";

jest.mock("./logger", () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("execute utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("tryCatch", () => {
    it("should successfully execute synchronous function", async () => {
      const fn = () => "success";
      const result = await tryCatch(fn);

      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      expect(result.error).toBeUndefined();
    });

    it("should successfully execute async function", async () => {
      const fn = async () => "async success";
      const result = await tryCatch(fn);

      expect(result.success).toBe(true);
      expect(result.data).toBe("async success");
      expect(result.error).toBeUndefined();
    });

    it("should catch and return error from synchronous function", async () => {
      const error = new Error("sync error");
      const fn = () => {
        throw error;
      };
      const result = await tryCatch(fn);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBe(error);
      expect(logger.error).toHaveBeenCalledWith(
        "tryCatch execution failed",
        expect.objectContaining({
          error: "sync error",
          context: "tryCatch",
        }),
      );
    });

    it("should catch and return error from async function", async () => {
      const error = new Error("async error");
      const fn = async () => {
        throw error;
      };
      const result = await tryCatch(fn);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBe(error);
      expect(logger.error).toHaveBeenCalled();
    });

    it("should use default value on error", async () => {
      const defaultValue = "default";
      const fn = () => {
        throw new Error("error");
      };
      const result = await tryCatch(fn, { defaultValue });

      expect(result.success).toBe(false);
      expect(result.data).toBe(defaultValue);
      expect(result.error).toBeInstanceOf(Error);
    });

    it("should call onError callback when error occurs", async () => {
      const onError = jest.fn();
      const error = new Error("test error");
      const fn = () => {
        throw error;
      };

      await tryCatch(fn, { onError });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it("should not log error when logError is false", async () => {
      const fn = () => {
        throw new Error("error");
      };

      await tryCatch(fn, { logError: false });

      expect(logger.error).not.toHaveBeenCalled();
    });

    it("should use custom context in logs", async () => {
      const fn = () => {
        throw new Error("error");
      };
      const context = "custom context";

      await tryCatch(fn, { context });

      expect(logger.error).toHaveBeenCalledWith(
        `${context} execution failed`,
        expect.objectContaining({
          context,
        }),
      );
    });
  });

  describe("delayRun", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should execute function after default delay", async () => {
      const fn = jest.fn(() => "success");
      const promise = delayRun(fn);

      expect(fn).not.toHaveBeenCalled();
      jest.advanceTimersByTime(10);
      await promise;

      expect(fn).toHaveBeenCalled();
    });

    it("should execute function after custom delay", async () => {
      const fn = jest.fn(() => "success");
      const promise = delayRun(fn, { delay: 1000 });

      expect(fn).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1000);
      await promise;

      expect(fn).toHaveBeenCalled();
    });

    it("should execute function immediately when delay is 0", async () => {
      const fn = jest.fn(() => "success");
      const promise = delayRun(fn, { delay: 0 });

      await promise;

      expect(fn).toHaveBeenCalled();
    });

    it("should successfully execute async function after delay", async () => {
      const fn = jest.fn(async () => "async success");
      const promise = delayRun(fn, { delay: 100 });

      jest.advanceTimersByTime(100);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data).toBe("async success");
    });

    it("should not retry when maxRetries is 0", async () => {
      const fn = jest.fn(() => {
        throw new Error("failure");
      });

      const promise = delayRun(fn, {
        delay: 0,
        maxRetries: 0,
        retryDelay: 100,
      });

      await promise;

      expect(fn).toHaveBeenCalledTimes(1); // Only initial attempt
    });
  });

  describe("delayRun with retries (real timers)", () => {
    beforeEach(() => {
      jest.useRealTimers();
    });

    it("should retry on failure up to maxRetries times", async () => {
      const fn = jest.fn(() => {
        throw new Error("failure");
      });
      const result = await delayRun(fn, {
        delay: 0,
        maxRetries: 3,
        retryDelay: 10,
      });

      expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });

    it("should succeed on retry attempt", async () => {
      let attempts = 0;
      const fn = jest.fn(() => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("failure");
        }
        return "success";
      });

      const result = await delayRun(fn, {
        delay: 0,
        maxRetries: 5,
        retryDelay: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should call onRetry callback on each retry", async () => {
      const onRetry = jest.fn();
      const fn = jest.fn(() => {
        throw new Error("failure");
      });

      await delayRun(fn, {
        delay: 0,
        maxRetries: 2,
        retryDelay: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
      expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error));
    });

    it("should use default value on failure after all retries", async () => {
      const defaultValue = "default";
      const fn = jest.fn(() => {
        throw new Error("failure");
      });

      const result = await delayRun(fn, {
        delay: 0,
        maxRetries: 1,
        retryDelay: 10,
        defaultValue,
      });

      expect(result.success).toBe(false);
      expect(result.data).toBe(defaultValue);
    });

    it("should use custom context in retry logs", async () => {
      const fn = jest.fn(() => {
        throw new Error("failure");
      });
      const context = "custom retry context";

      await delayRun(fn, {
        delay: 0,
        maxRetries: 1,
        retryDelay: 10,
        context,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        `${context} retry 1/1`,
        expect.objectContaining({
          retryDelay: 10,
        }),
      );
    });
  });
});
