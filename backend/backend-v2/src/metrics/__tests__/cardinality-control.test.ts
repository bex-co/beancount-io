import {
  normalizeRoutePath,
  getStatusCodeClass,
  sanitizeOperationName,
  validateHttpMethod,
  shouldSampleRequest,
  cardinalityTracker,
} from "../cardinality-control";

describe("normalizeRoutePath", () => {
  it("should normalize numeric IDs", () => {
    expect(normalizeRoutePath("/users/123")).toBe("/users/:id");
    expect(normalizeRoutePath("/api/ledgers/456/files")).toBe(
      "/api/ledgers/:id/files",
    );
    expect(normalizeRoutePath("/posts/789/comments/101")).toBe(
      "/posts/:id/comments/:id",
    );
  });

  it("should normalize UUIDs", () => {
    expect(
      normalizeRoutePath("/users/550e8400-e29b-41d4-a716-446655440000"),
    ).toBe("/users/:id");
    expect(
      normalizeRoutePath(
        "/api/ledgers/550e8400-e29b-41d4-a716-446655440000/files",
      ),
    ).toBe("/api/ledgers/:id/files");
  });

  it("should normalize MongoDB ObjectIds", () => {
    expect(normalizeRoutePath("/users/507f1f77bcf86cd799439011")).toBe(
      "/users/:id",
    );
    expect(normalizeRoutePath("/api/posts/507f191e810c19729de860ea/edit")).toBe(
      "/api/posts/:id/edit",
    );
  });

  it("should normalize email addresses", () => {
    expect(normalizeRoutePath("/users/john@example.com")).toBe("/users/:email");
    expect(normalizeRoutePath("/api/verify/user@test.com/send")).toBe(
      "/api/verify/:email/send",
    );
  });

  it("should normalize long alphanumeric strings", () => {
    expect(normalizeRoutePath("/sessions/abc123def456")).toBe("/sessions/:id");
    expect(normalizeRoutePath("/tokens/a1b2c3d4e5f6g7h8")).toBe("/tokens/:id");
  });

  it("should preserve static routes", () => {
    expect(normalizeRoutePath("/api/users")).toBe("/api/users");
    expect(normalizeRoutePath("/health")).toBe("/health");
    expect(normalizeRoutePath("/api/v1/status")).toBe("/api/v1/status");
  });

  it("should handle complex paths", () => {
    expect(
      normalizeRoutePath("/api/users/123/ledgers/456/transactions/789"),
    ).toBe("/api/users/:id/ledgers/:id/transactions/:id");
  });

  it("should handle edge cases", () => {
    expect(normalizeRoutePath("/")).toBe("/");
    expect(normalizeRoutePath("")).toBe("");
    expect(normalizeRoutePath("/api")).toBe("/api");
  });
});

describe("getStatusCodeClass", () => {
  it("should group 2xx status codes", () => {
    expect(getStatusCodeClass(200)).toBe("2xx");
    expect(getStatusCodeClass(201)).toBe("2xx");
    expect(getStatusCodeClass(204)).toBe("2xx");
  });

  it("should group 3xx status codes", () => {
    expect(getStatusCodeClass(301)).toBe("3xx");
    expect(getStatusCodeClass(302)).toBe("3xx");
    expect(getStatusCodeClass(304)).toBe("3xx");
  });

  it("should group 4xx status codes", () => {
    expect(getStatusCodeClass(400)).toBe("4xx");
    expect(getStatusCodeClass(401)).toBe("4xx");
    expect(getStatusCodeClass(404)).toBe("4xx");
  });

  it("should group 5xx status codes", () => {
    expect(getStatusCodeClass(500)).toBe("5xx");
    expect(getStatusCodeClass(502)).toBe("5xx");
    expect(getStatusCodeClass(503)).toBe("5xx");
  });
});

describe("sanitizeOperationName", () => {
  it("should return Anonymous for null or undefined", () => {
    expect(sanitizeOperationName(null)).toBe("Anonymous");
    expect(sanitizeOperationName(undefined)).toBe("Anonymous");
    expect(sanitizeOperationName("")).toBe("Anonymous");
  });

  it("should preserve valid operation names", () => {
    expect(sanitizeOperationName("GetUser")).toBe("GetUser");
    expect(sanitizeOperationName("CreateLedger")).toBe("CreateLedger");
    expect(sanitizeOperationName("UpdateUser_Profile")).toBe(
      "UpdateUser_Profile",
    );
  });

  it("should replace special characters with underscores", () => {
    expect(sanitizeOperationName("Get-User")).toBe("Get_User");
    expect(sanitizeOperationName("Create.Ledger")).toBe("Create_Ledger");
    expect(sanitizeOperationName("Update User!")).toBe("Update_User_");
  });

  it("should truncate long operation names", () => {
    const longName = "A".repeat(150);
    const result = sanitizeOperationName(longName);
    expect(result.length).toBe(100);
  });

  it("should handle custom max length", () => {
    const longName = "A".repeat(100);
    const result = sanitizeOperationName(longName, 50);
    expect(result.length).toBe(50);
  });

  it("should detect and replace UUID-like names", () => {
    expect(sanitizeOperationName("550e8400e29b41d4a716446655440000")).toBe(
      "DynamicOperation",
    );
    expect(sanitizeOperationName("abcdef1234567890")).toBe("DynamicOperation");
  });
});

describe("validateHttpMethod", () => {
  it("should validate known HTTP methods", () => {
    expect(validateHttpMethod("GET")).toBe("GET");
    expect(validateHttpMethod("POST")).toBe("POST");
    expect(validateHttpMethod("PUT")).toBe("PUT");
    expect(validateHttpMethod("PATCH")).toBe("PATCH");
    expect(validateHttpMethod("DELETE")).toBe("DELETE");
    expect(validateHttpMethod("HEAD")).toBe("HEAD");
    expect(validateHttpMethod("OPTIONS")).toBe("OPTIONS");
  });

  it("should convert lowercase methods to uppercase", () => {
    expect(validateHttpMethod("get")).toBe("GET");
    expect(validateHttpMethod("post")).toBe("POST");
  });

  it("should return OTHER for unknown methods", () => {
    expect(validateHttpMethod("INVALID")).toBe("OTHER");
    expect(validateHttpMethod("CUSTOM")).toBe("OTHER");
    expect(validateHttpMethod("")).toBe("OTHER");
  });
});

describe("shouldSampleRequest", () => {
  it("should always sample error requests", () => {
    // Run multiple times to ensure consistency
    for (let i = 0; i < 100; i += 1) {
      expect(shouldSampleRequest(400, 0.1)).toBe(true);
      expect(shouldSampleRequest(404, 0.0)).toBe(true);
      expect(shouldSampleRequest(500, 0.5)).toBe(true);
    }
  });

  it("should always sample when rate is 1.0", () => {
    for (let i = 0; i < 100; i += 1) {
      expect(shouldSampleRequest(200, 1.0)).toBe(true);
    }
  });

  it("should never sample when rate is 0.0 for successful requests", () => {
    for (let i = 0; i < 100; i += 1) {
      expect(shouldSampleRequest(200, 0.0)).toBe(false);
    }
  });

  it("should sample approximately at the given rate", () => {
    const samplingRate = 0.5;
    const iterations = 10000;
    let sampledCount = 0;

    for (let i = 0; i < iterations; i += 1) {
      if (shouldSampleRequest(200, samplingRate)) {
        sampledCount += 1;
      }
    }

    const actualRate = sampledCount / iterations;
    // Allow 5% variance
    expect(actualRate).toBeGreaterThan(0.45);
    expect(actualRate).toBeLessThan(0.55);
  });
});

describe("CardinalityTracker", () => {
  beforeEach(() => {
    cardinalityTracker.reset();
  });

  it("should track unique label combinations", () => {
    cardinalityTracker.track("http_requests_total", {
      method: "GET",
      route: "/users",
      status_code: "200",
    });
    cardinalityTracker.track("http_requests_total", {
      method: "POST",
      route: "/users",
      status_code: "201",
    });

    expect(cardinalityTracker.getCount()).toBe(2);
  });

  it("should not count duplicate combinations", () => {
    const labels = { method: "GET", route: "/users", status_code: "200" };

    cardinalityTracker.track("http_requests_total", labels);
    cardinalityTracker.track("http_requests_total", labels);
    cardinalityTracker.track("http_requests_total", labels);

    expect(cardinalityTracker.getCount()).toBe(1);
  });

  it("should reset count", () => {
    cardinalityTracker.track("http_requests_total", {
      method: "GET",
      route: "/users",
      status_code: "200",
    });
    expect(cardinalityTracker.getCount()).toBe(1);

    cardinalityTracker.reset();
    expect(cardinalityTracker.getCount()).toBe(0);
  });

  it("should track different metrics separately", () => {
    cardinalityTracker.track("http_requests_total", {
      method: "GET",
      route: "/users",
    });
    cardinalityTracker.track("graphql_queries_total", {
      operation_name: "GetUser",
    });

    expect(cardinalityTracker.getCount()).toBe(2);
  });
});
