import Router, { type RouterContext } from "@koa/router";
import { restOpId } from "./op-class";

/**
 * Turning a Koa router layer into a stable op id — used at assembly time by the
 * composition root and at request time by the REST scope middleware.
 *
 * Both sides must derive the id the same way or the gate index would be looked
 * up with keys it does not contain, and a `router.all()` mount would silently
 * fall through to the fail-closed branch. Sharing the derivation is what makes
 * that impossible; it lives here rather than in the composition root so the
 * middleware can import it without the cycle that would create.
 */

/**
 * The method set `router.all()` stamps on a layer, discovered by asking the
 * router rather than hardcoding the list: after registration, `.all()` and an
 * explicit multi-method call are indistinguishable, so the comparison has to be
 * against whatever this version of @koa/router considers "every method".
 */
const ALL_METHODS: ReadonlySet<string> = new Set<string>(
  new Router().all("/__probe__", () => undefined).stack[0].methods,
);

/**
 * `:name` → `{name}`; path-to-regexp wildcards (`{*path}`) pass through.
 *
 * @koa/router also accepts a `RegExp` path. No route uses one, and there is no
 * sensible op id for a pattern, so one gets its source text — an id no table
 * entry matches, which the coverage test then reports rather than waving
 * through.
 */
export function normalizeRestPath(path: string | RegExp): string {
  return String(path).replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

/** True when a layer was registered with `router.all()`. */
function isCatchAllMethods(methods: readonly string[]): boolean {
  const set = new Set(methods);
  return (
    set.size >= ALL_METHODS.size && [...ALL_METHODS].every((m) => set.has(m))
  );
}

/**
 * The methods a layer contributes as ops. `HEAD` is dropped: @koa/router pairs
 * it with every `GET` automatically, so it is a transport detail rather than an
 * op anyone writes.
 */
export function opMethodsForLayer(methods: readonly string[]): string[] {
  if (isCatchAllMethods(methods)) return ["ALL"];
  return methods.filter((method) => method !== "HEAD");
}

/**
 * The op id a request should be classified under, given its matched layer.
 *
 * A `HEAD` that @koa/router paired with a `GET` runs that `GET`'s handler, so
 * it is that op, exactly as {@link opMethodsForLayer} says at assembly time.
 * Classified as `REST HEAD …` it matched no op: the scope gate treated it as an
 * unclassified write, refusing a read-only credential, and the limiter charged
 * it to a bucket of its own, so a `HEAD` of an archive URL fetched the archive
 * outside the archive budget (w31/112).
 */
export function requestOpId(
  layerMethods: readonly string[],
  layerPath: string | RegExp,
  requestMethod: string,
): string {
  const upper = requestMethod.toUpperCase();
  const method = isCatchAllMethods(layerMethods)
    ? "ALL"
    : upper === "HEAD" && layerMethods.includes("GET")
      ? "GET"
      : upper;
  return restOpId(method, normalizeRestPath(layerPath));
}

/**
 * The op id of the route this request will be dispatched to, for the REST
 * middleware that runs ahead of it (identity, rate limit, scope gate).
 *
 * `ctx._matchedRoute` cannot be used here: @koa/router rewrites it to each
 * layer's own path as the chain runs, so by the time a middleware executes it
 * names that middleware's own wildcard. `ctx.matched` is the whole set of
 * path-matching layers, set before the chain, so the last one that also
 * accepts the request's method is the route that will actually handle it —
 * which is exactly how the router itself picks.
 */
export function matchedOpId(ctx: RouterContext): string | undefined {
  const layers = ctx.matched;
  if (!layers) return undefined;
  const method = ctx.method.toUpperCase();
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    const layer = layers[i];
    if (layer.methods.length > 0 && layer.methods.includes(method)) {
      return requestOpId(layer.methods, layer.path, method);
    }
  }
  return undefined;
}
