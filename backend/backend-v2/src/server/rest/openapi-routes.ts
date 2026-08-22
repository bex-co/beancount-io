import Router from "@koa/router";
import type { AppConfig } from "@/config/config";
import {
  generatePublicOpenAPIDocument,
  generateAdminOpenAPIDocument,
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
 * Serves the public and admin OpenAPI specs plus their Swagger UI pages.
 * Dev/test only — production registers none of these routes, so all 404
 * there.
 */
export function setOpenApiRoutes(
  router: Router,
  config: Pick<AppConfig, "env">,
): void {
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
