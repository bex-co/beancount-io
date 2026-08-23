import Router from "@koa/router";
import type { AppConfig } from "@/config/config";
import { setOpenApiRoutes } from "../openapi-routes";

describe("setOpenApiRoutes", () => {
  let router: Router;

  beforeEach(() => {
    jest.clearAllMocks();
    router = new Router();
    router.get = jest.fn();
  });

  it("serves the public v1 contract in production, and nothing else", () => {
    setOpenApiRoutes(router, { env: "production" } as Pick<AppConfig, "env">);

    // The v1 spec is the published contract (ADR 0006 D8), so it is the one
    // document that must exist in production. The internal `/api-docs` pair
    // stays out: it describes surface we have promised nobody, and it renders
    // its UI from a CDN.
    expect(router.get).toHaveBeenCalledWith(
      "/v1/openapi.json",
      expect.any(Function),
    );
    expect(router.get).toHaveBeenCalledTimes(1);
  });

  it("should register the public and admin doc routes in development", () => {
    setOpenApiRoutes(router, { env: "development" } as Pick<AppConfig, "env">);

    expect(router.get).toHaveBeenCalledWith(
      "/api-docs/swagger.json",
      expect.any(Function),
    );
    expect(router.get).toHaveBeenCalledWith("/api-docs", expect.any(Function));
    expect(router.get).toHaveBeenCalledWith(
      "/api-admin-docs/swagger.json",
      expect.any(Function),
    );
    expect(router.get).toHaveBeenCalledWith(
      "/api-admin-docs",
      expect.any(Function),
    );
    // The four internal doc routes, plus the v1 spec that is served everywhere.
    expect(router.get).toHaveBeenCalledTimes(5);
  });

  it("should serve the public OpenAPI document as JSON", () => {
    setOpenApiRoutes(router, { env: "development" } as Pick<AppConfig, "env">);

    const specHandler = (router.get as jest.Mock).mock.calls.find(
      (call) => call[0] === "/api-docs/swagger.json",
    )[1];

    const mockCtx = { body: undefined } as unknown as Router.RouterContext;
    specHandler(mockCtx);

    expect(mockCtx.body).toEqual(expect.objectContaining({ openapi: "3.0.0" }));
  });

  it("should serve an HTML page embedding Swagger UI for the public docs", () => {
    setOpenApiRoutes(router, { env: "development" } as Pick<AppConfig, "env">);

    const uiHandler = (router.get as jest.Mock).mock.calls.find(
      (call) => call[0] === "/api-docs",
    )[1];

    const mockCtx = {
      type: undefined,
      body: undefined,
    } as unknown as Router.RouterContext;
    uiHandler(mockCtx);

    expect(mockCtx.type).toBe("html");
    expect(mockCtx.body).toContain("swagger-ui");
    expect(mockCtx.body).toContain("/api-docs/swagger.json");
  });

  it("should serve the admin OpenAPI document as JSON", () => {
    setOpenApiRoutes(router, { env: "development" } as Pick<AppConfig, "env">);

    const specHandler = (router.get as jest.Mock).mock.calls.find(
      (call) => call[0] === "/api-admin-docs/swagger.json",
    )[1];

    const mockCtx = { body: undefined } as unknown as Router.RouterContext;
    specHandler(mockCtx);

    expect(mockCtx.body).toEqual(
      expect.objectContaining({
        openapi: "3.0.0",
        info: expect.objectContaining({ title: "Beancount.io Admin API" }),
      }),
    );
  });

  it("should serve an HTML page embedding Swagger UI for the admin docs", () => {
    setOpenApiRoutes(router, { env: "development" } as Pick<AppConfig, "env">);

    const uiHandler = (router.get as jest.Mock).mock.calls.find(
      (call) => call[0] === "/api-admin-docs",
    )[1];

    const mockCtx = {
      type: undefined,
      body: undefined,
    } as unknown as Router.RouterContext;
    uiHandler(mockCtx);

    expect(mockCtx.type).toBe("html");
    expect(mockCtx.body).toContain("swagger-ui");
    expect(mockCtx.body).toContain("/api-admin-docs/swagger.json");
  });
});
