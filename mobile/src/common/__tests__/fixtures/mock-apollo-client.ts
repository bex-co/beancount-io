/** Stand-in for `@apollo/client`: a reactive var read is just a call. */
export function useReactiveVar<T>(reactiveVar: () => T): T {
  return reactiveVar();
}
