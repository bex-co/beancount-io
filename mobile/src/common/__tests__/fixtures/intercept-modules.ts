/**
 * Point `require` at stand-ins for modules the unit runner cannot load: native
 * packages, and `@/` value imports (the runner resolves that alias for types
 * only). Lets a test load the real module under test instead of a copy of its
 * logic. Returns the function that restores normal resolution.
 */
const Module = require("module");

export function interceptModules(stubs: Record<string, string>): () => void {
  const original = Module._resolveFilename;
  Module._resolveFilename = function resolve(
    this: unknown,
    request: string,
    ...rest: unknown[]
  ) {
    if (Object.prototype.hasOwnProperty.call(stubs, request)) {
      return stubs[request];
    }
    return original.call(this, request, ...rest);
  };
  return () => {
    Module._resolveFilename = original;
  };
}

/** Require a module afresh, so it binds to the stand-ins in force now. */
export function freshRequire<T>(resolvedPath: string): T {
  delete require.cache[resolvedPath];
  return require(resolvedPath) as T;
}
