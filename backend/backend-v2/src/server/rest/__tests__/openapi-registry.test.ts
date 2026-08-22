import {
  registry,
  generatePublicOpenAPIDocument,
  generateAdminOpenAPIDocument,
  registerRoute,
} from "../openapi-registry";

// Mock the config module
jest.mock("@/config/config", () => ({
  config: {
    env: "development",
    server: {
      port: 4104,
    },
  },
}));

describe("openapi-registry", () => {
  describe("registry", () => {
    it("should be an instance of OpenAPIRegistry", () => {
      expect(registry).toBeDefined();
      expect(registry.definitions).toBeDefined();
    });

    describe("security schemes", () => {
      const securitySchemeNames = ["bearerAuth", "adminToken", "apiKey"];

      test.each(securitySchemeNames)(
        "should have %s security scheme registered",
        (schemeName) => {
          const securityScheme = registry.definitions.find(
            (def) =>
              def.type === "component" &&
              def.componentType === "securitySchemes" &&
              def.name === schemeName,
          );
          expect(securityScheme).toBeDefined();
        },
      );
    });
  });

  describe("generatePublicOpenAPIDocument", () => {
    it("should generate a valid OpenAPI document", () => {
      const doc = generatePublicOpenAPIDocument();

      expect(doc.openapi).toBe("3.0.0");
      expect(doc.info.title).toBe("Web Beancount Backend API");
      expect(doc.info.version).toBe("2.0.0");
    });

    it("should include server information", () => {
      const doc = generatePublicOpenAPIDocument();

      expect(doc.servers).toBeDefined();
      expect(doc.servers?.length).toBeGreaterThan(0);
    });

    it("should include all registered security schemes", () => {
      const doc = generatePublicOpenAPIDocument();

      expect(Object.keys(doc.components?.securitySchemes ?? {})).toEqual(
        expect.arrayContaining(["bearerAuth", "adminToken", "apiKey"]),
      );
    });

    it("should include tags for API grouping, excluding Admin API", () => {
      const doc = generatePublicOpenAPIDocument();

      expect(doc.tags).toBeDefined();
      expect(doc.tags?.length).toBeGreaterThan(0);

      const tagNames = doc.tags?.map((tag) => tag.name);
      expect(tagNames).toContain("Authentication");
      expect(tagNames).toContain("Ledger");
      expect(tagNames).toContain("Stripe Webhooks");
      expect(tagNames).toContain("Health");
      expect(tagNames).not.toContain("Admin API");
    });

    it("should include API description", () => {
      const doc = generatePublicOpenAPIDocument();

      expect(doc.info.description).toBeDefined();
      expect(doc.info.description).toContain("Web Beancount");
    });

    it("should list both the development and production servers", () => {
      const doc = generatePublicOpenAPIDocument();

      expect(doc.servers?.[0].url).toContain("localhost");
      expect(doc.servers?.[0].description).toBe("Development server");
      expect(doc.servers?.[1].url).toBe("https://api.v3.beancount.io");
      expect(doc.servers?.[1].description).toBe("Production server");
    });
  });

  describe("generateAdminOpenAPIDocument", () => {
    it("should generate a valid OpenAPI document with only the Admin API tag", () => {
      const doc = generateAdminOpenAPIDocument();

      expect(doc.openapi).toBe("3.0.0");
      expect(doc.info.title).toBe("Web Beancount Admin API");
      expect(doc.tags?.map((tag) => tag.name)).toEqual(["Admin API"]);
    });

    it("should include server information", () => {
      const doc = generateAdminOpenAPIDocument();

      expect(doc.servers).toBeDefined();
      expect(doc.servers?.length).toBeGreaterThan(0);
    });

    it("should include all registered security schemes, including adminToken", () => {
      const doc = generateAdminOpenAPIDocument();

      expect(Object.keys(doc.components?.securitySchemes ?? {})).toEqual(
        expect.arrayContaining(["bearerAuth", "adminToken", "apiKey"]),
      );
    });
  });

  describe("splitting routes between the public and admin documents", () => {
    beforeAll(() => {
      registerRoute({
        method: "get",
        path: "/test-admin-only-route",
        tags: ["Admin API"],
        responses: { 200: { description: "Success" } },
      });
      registerRoute({
        method: "get",
        path: "/test-public-only-route",
        tags: ["Health"],
        responses: { 200: { description: "Success" } },
      });
    });

    it("should exclude Admin API-tagged routes from the public document", () => {
      const doc = generatePublicOpenAPIDocument();
      const paths = Object.keys(doc.paths ?? {});

      expect(paths).toContain("/test-public-only-route");
      expect(paths).not.toContain("/test-admin-only-route");
    });

    it("should include only Admin API-tagged routes in the admin document", () => {
      const doc = generateAdminOpenAPIDocument();
      const paths = Object.keys(doc.paths ?? {});

      expect(paths).toContain("/test-admin-only-route");
      expect(paths).not.toContain("/test-public-only-route");
    });
  });

  describe("server list is independent of config.env", () => {
    it("should list both servers on the public document regardless of env", () => {
      const doc = generatePublicOpenAPIDocument();

      expect(doc.servers).toEqual([
        {
          url: "http://localhost:4104",
          description: "Development server",
        },
        {
          url: "https://api.v3.beancount.io",
          description: "Production server",
        },
      ]);
    });

    it("should list both servers on the admin document regardless of env", () => {
      const doc = generateAdminOpenAPIDocument();

      expect(doc.servers).toEqual([
        {
          url: "http://localhost:4104",
          description: "Development server",
        },
        {
          url: "https://api.v3.beancount.io",
          description: "Production server",
        },
      ]);
    });
  });

  describe("registerRoute", () => {
    it("should register a route with the registry", () => {
      const initialLength = registry.definitions.length;

      registerRoute({
        method: "get",
        path: "/test-route",
        description: "A test route",
        responses: {
          200: {
            description: "Success",
          },
        },
      });

      expect(registry.definitions.length).toBe(initialLength + 1);
    });
  });
});
