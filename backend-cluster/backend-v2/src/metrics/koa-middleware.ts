import { Context, Next } from "koa";
import {
  httpRequestDuration,
  httpRequestTotal,
  httpRequestInProgress,
} from "./metrics-definitions";
import {
  boundedLabel,
  normalizeRoutePath,
  getStatusCodeClass,
  validateHttpMethod,
  defaultCardinalityConfig,
  type CardinalityConfig,
} from "./cardinality-control";

// Path prefixes to ignore for metrics collection
const ignorePrefixes: string[] = ["/metrics", "/api-gateway/", "/favicon.ico"];

// Cardinality configuration - use defaults
const cardinalityConfig: CardinalityConfig = defaultCardinalityConfig;

/**
 * Record HTTP request metrics with cardinality control
 */
function recordRequestMetrics(
  routeLabel: (route: string) => string,
  method: string,
  route: string,
  statusCode: number,
  duration: number,
): void {
  // Apply cardinality controls
  const normalizedRoute = routeLabel(
    cardinalityConfig.normalizeRoutes ? normalizeRoutePath(route) : route,
  );

  const validatedMethod = validateHttpMethod(method);

  const statusCodeLabel = cardinalityConfig.useStatusCodeClasses
    ? getStatusCodeClass(statusCode)
    : statusCode.toString();

  // Record request duration and count
  httpRequestDuration.observe(
    {
      method: validatedMethod,
      route: normalizedRoute,
      status_code: statusCodeLabel,
    },
    duration,
  );

  httpRequestTotal.inc({
    method: validatedMethod,
    route: normalizedRoute,
    status_code: statusCodeLabel,
  });
}

// REST API metrics middleware
export function restMetricsMiddleware() {
  const routeLabel = boundedLabel(cardinalityConfig.maxUniqueRoutes);

  return async (ctx: Context, next: Next) => {
    // Skip metrics collection for configured paths
    if (ignorePrefixes.some((prefix) => ctx.path.startsWith(prefix))) {
      return await next();
    }

    const start = Date.now();

    // Increment in-progress requests
    httpRequestInProgress.inc();

    try {
      await next();
    } catch (error) {
      // Set default status code for unhandled errors
      if (!ctx.status || ctx.status < 400) {
        ctx.status = 500;
      }
      throw error;
    } finally {
      const method = ctx.method;
      const route = ctx.route?.path || ctx.path;
      // Always record metrics in finally block
      const duration = (Date.now() - start) / 1000;
      const statusCode = ctx.status || 500;

      recordRequestMetrics(routeLabel, method, route, statusCode, duration);

      // Decrement in-progress requests
      httpRequestInProgress.dec();
    }
  };
}
