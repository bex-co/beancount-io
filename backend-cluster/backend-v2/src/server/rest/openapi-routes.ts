import Router from "@koa/router";
import type { AppConfig } from "@/config/config";
import {
  generatePublicOpenAPIDocument,
  generateAdminOpenAPIDocument,
  generateV1OpenAPIDocument,
} from "./openapi-registry";

const SWAGGER_UI_DIST_VERSION = "5";

function renderSwaggerUiHtml(title: string, specUrl: string): string {
  return `<!doctype html>
<html>
  <head>
    <title>${title}</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_DIST_VERSION}/swagger-ui.css"
    />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_DIST_VERSION}/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: "${specUrl}",
          dom_id: "#swagger-ui",
        });
      };
    </script>
  </body>
</html>`;
}

/**
 * OpenAPI documents and the Swagger UI pages that read them.
 *
 * Two audiences, two lifetimes:
 *
 * - `/v1/openapi.json` is the **public contract** (ADR 0006 D8) and is served
 *   everywhere, production included. A published API whose spec 404s in
 *   production is an API nobody outside can use without reading our source.
 * - `/api-docs` and `/api-admin-docs` describe internal surface and stay
 *   dev/test-only, exactly as before. They render Swagger UI from a CDN; that
 *   dependency is why they are not the thing we made production-visible.
 *
 * There is deliberately no production HTML docs page yet: rendering Swagger UI
 * without a CDN needs its assets vendored, and that dependency was declined
 * for this milestone. The spec is the contract; a UI over it is presentation,
 * and can land the day the dependency question is settled.
 */
export function setOpenApiRoutes(
  router: Router,
  config: Pick<AppConfig, "env">,
): void {
  router.get("/v1/openapi.json", (ctx) => {
    ctx.body = generateV1OpenAPIDocument();
  });

  if (config.env === "production") {
    return;
  }

  router.get("/api-docs/swagger.json", (ctx) => {
    ctx.body = generatePublicOpenAPIDocument();
  });

  router.get("/api-docs", (ctx) => {
    ctx.type = "html";
    ctx.body = renderSwaggerUiHtml(
      "Beancount.io API Docs",
      "/api-docs/swagger.json",
    );
  });

  router.get("/api-admin-docs/swagger.json", (ctx) => {
    ctx.body = generateAdminOpenAPIDocument();
  });

  router.get("/api-admin-docs", (ctx) => {
    ctx.type = "html";
    ctx.body = renderSwaggerUiHtml(
      "Beancount.io Admin API Docs",
      "/api-admin-docs/swagger.json",
    );
  });
}
