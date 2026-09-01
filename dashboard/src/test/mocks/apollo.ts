/**
 * Mock types and utilities for Apollo Client hooks in tests.
 * These helpers provide type-safe mock values without using `any`.
 */

/**
 * Mock return type for useQuery hook.
 * This provides a properly typed alternative to using `as any` in tests.
 * Based on Apollo Client v4's useQuery.Base.Result interface.
 */
export interface MockQueryResult<TData> {
  data: TData | undefined;
  loading: boolean;
  error: Error | undefined;
  called?: boolean;
  previousData?: TData;
  networkStatus?: number;
}
