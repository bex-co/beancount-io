import Router from "@koa/router";
import { type AppLayers } from "@/foundation/composition";
import { getTokenFromCtx } from "@/features/auth/utils/auth";
import { AppConfig } from "@/config/config";
import { registerRoute } from "@/server/rest/openapi-registry";
import { parseLedgerId, base64UrlDecode } from "@/shared/str";

function parseLedgerIdCompat(id: string): {
  ledgerOwner: string;
  ledgerName: string;
} {
  if (id.includes("/")) {
    return parseLedgerId(id);
  }
  const decoded = base64UrlDecode(id);
  return parseLedgerId(decoded);
}
import {
  ledgerEditorRedirectSchema,
  ledgerEditorErrorSchema,
  ledgerEditorOptionalIdQuerySchema,
} from "./redirect-schemas";

/**
 * Preserves lang and theme query parameters from request URL to redirect URL
 * @param currentUrl - The URL to redirect to
 * @param requestUrl - The incoming request URL
 * @returns New URL with lang and theme parameters appended if present in request
 */
function preserveQueryParams(currentUrl: string, requestUrl: string): string {
  try {
    const reqUrl = new URL(requestUrl);
    const lang = reqUrl.searchParams.get("lang");
    const theme = reqUrl.searchParams.get("theme");

    if (!lang && !theme) {
      return currentUrl;
    }

    const redirectUrl = new URL(currentUrl);
    if (lang) {
      redirectUrl.searchParams.set("lang", lang);
    }
    if (theme) {
      redirectUrl.searchParams.set("theme", theme);
    }
    return redirectUrl.toString();
  } catch {
    // If URL parsing fails, return original URL
    return currentUrl;
  }
}

export function setV1CompatRedirectRoutes(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): void {
  const getOneTimeAuthUrl = async (token: string) => {
    const userId = await layers.database.models.jwt.verify(
      layers.database.db,
      token,
    );
    if (!userId) {
      throw new Error("Invalid or expired token");
    }
    const oneTimeToken =
      await layers.database.models.magicLinkToken.regenerateToken(userId);
    const dashboardUrl = `${config.dashboard.url}/auth/callback?oneTimeToken=${oneTimeToken.id}`;
    return dashboardUrl;
  };
  router.get("/ledger/editor/", async (ctx) => {
    const ledgerId = ctx.query.ledgerId as string | undefined;
    const token = getTokenFromCtx(ctx);
    if (!token) {
      ctx.throw(400, "token not found");
      return;
    }

    // If ledgerId is provided, validate and redirect to specific ledger editor
    if (ledgerId) {
      try {
        // Verify token and get user
        const userId = await layers.database.models.jwt.verify(
          layers.database.db,
          token,
        );
        if (!userId) {
          ctx.throw(401, "Invalid or expired token");
          return;
        }
        const user = await layers.database.models.user.getById(
          layers.database.db,
          userId,
        );
        if (!user) {
          ctx.throw(401, "User not found");
          return;
        }

        // Parse and validate ledgerId (supports both plain owner/name and legacy base64url)
        const { ledgerOwner, ledgerName } = parseLedgerIdCompat(ledgerId);

        // Create one-time token and redirect to dashboard with ledger editor
        const dashboardUrl = await getOneTimeAuthUrl(token);
        const nextUrl = `/ledger/${ledgerOwner}/${ledgerName}/files/content`;
        const urlWithNext = new URL(dashboardUrl);
        urlWithNext.searchParams.set("next", nextUrl);
        ctx.redirect(
          preserveQueryParams(urlWithNext.toString(), ctx.request.href),
        );
        return;
      } catch (error) {
        const err = error as Error & { status?: number };
        if (err.status) {
          ctx.throw(err.status, err.message);
          return;
        }
        // Handle parseLedgerId errors (invalid format)
        if (err.message.includes("Invalid") || err.message.includes("decode")) {
          ctx.throw(400, "Invalid ledgerId format");
          return;
        }
        ctx.throw(500, `Failed to process request: ${err.message}`);
        return;
      }
    }

    // If no ledgerId, use the original behavior
    const dashboardUrl = await getOneTimeAuthUrl(token);
    ctx.redirect(preserveQueryParams(dashboardUrl, ctx.request.href));
    return;
  });

  // Register OpenAPI documentation
  registerLedgerEditorOpenAPIRoutes();
}

/**
 * Register ledger editor endpoint with OpenAPI documentation
 */
function registerLedgerEditorOpenAPIRoutes() {
  registerRoute({
    method: "get",
    path: "/ledger/editor/",
    summary: "Redirect to dashboard with one-time authentication token",
    description: `Generates a one-time authentication token for the logged-in user and redirects to the dashboard.

This endpoint facilitates seamless authentication between the backend and dashboard by:
1. Verifying the user's JWT token from cookies or Authorization header
2. Creating a one-time authentication token
3. Redirecting to the dashboard with the one-time token in the URL

If an optional ledgerId query parameter is provided:
1. Validates the ledgerId query parameter
2. Validates that the user owns the specified ledger
3. Redirects to the dashboard ledger editor for the specific ledger

The one-time token can be exchanged for a full JWT token on the dashboard.`,
    tags: ["Ledger"],
    security: [{ bearerAuth: [] }],
    request: {
      query: ledgerEditorOptionalIdQuerySchema,
    },
    responses: {
      302: {
        description: "Redirect to dashboard with one-time token",
        content: {
          "application/json": {
            schema: ledgerEditorRedirectSchema,
          },
        },
      },
      400: {
        description:
          "Token not found, invalid token, or invalid ledgerId format",
        content: {
          "application/json": {
            schema: ledgerEditorErrorSchema,
          },
        },
      },
      401: {
        description: "User not found or token invalid",
        content: {
          "application/json": {
            schema: ledgerEditorErrorSchema,
          },
        },
      },
      403: {
        description: "User does not have access to this ledger",
        content: {
          "application/json": {
            schema: ledgerEditorErrorSchema,
          },
        },
      },
    },
  });
}
