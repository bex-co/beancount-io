import Router from "@koa/router";
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
export const ALL_METHODS: ReadonlySet<string> = new Set<string>(
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
export function isCatchAllMethods(methods: readonly string[]): boolean {
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

/** The op id a request should be classified under, given its matched layer. */
export function requestOpId(
  layerMethods: readonly string[],
  layerPath: string | RegExp,
  requestMethod: string,
): string {
  const method = isCatchAllMethods(layerMethods)
    ? "ALL"
    : requestMethod.toUpperCase();
  return restOpId(method, normalizeRestPath(layerPath));
}
