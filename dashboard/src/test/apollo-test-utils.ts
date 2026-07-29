/**
 * Apollo Client test utilities for type-safe mocking
 *
 * This file provides type-safe mock return values for Apollo hooks
 * to avoid using `as any` type assertions in tests.
 */

import type { MockedFunction } from "vitest";
import { vi } from "vitest";
import type {
  ListLedgersQuery,
  CreateLedgerMutation,
  UpdateLedgerMutation,
  DeleteLedgerMutation,
  GetCurrentUserQuery,
} from "@/graphql/definitions";

/**
 * Type-safe mock return for useQuery hook
 */
export interface MockQueryResult<TData> {
  data: TData | undefined;
  loading: boolean;
  error: Error | undefined;
  refetch: MockedFunction<() => Promise<unknown>>;
  networkStatus?: number;
  called?: boolean;
}

/**
 * Type-safe mock return for useMutation hook
 * Returns tuple: [mutationFunction, result]
 */
export interface MockMutationResult<TData> {
  data?: TData;
  loading: boolean;
  error?: Error;
  called?: boolean;
  reset?: () => void;
}

export type MockMutationTuple<TData> = [
  MockedFunction<(options?: unknown) => Promise<{ data?: TData }>>,
  MockMutationResult<TData>,
];

/**
 * Type-safe mock return for useLazyQuery hook
 * Returns tuple: [queryFunction, result, extra]
 */
export interface MockLazyQueryResult<TData> {
  data: TData | undefined;
  loading: boolean;
  error: Error | undefined;
  called?: boolean;
  refetch?: MockedFunction<() => Promise<unknown>>;
}

export type MockLazyQueryTuple<TData> = [
  MockedFunction<(options?: unknown) => Promise<void>>,
  MockLazyQueryResult<TData>,
];

/**
 * Creates a type-safe mock query result
 */
export function createMockQueryResult<TData>(
  overrides: Partial<MockQueryResult<TData>> = {},
): MockQueryResult<TData> {
  return {
    data: undefined,
    loading: false,
    error: undefined,
    refetch: vi.fn(),
    ...overrides,
  } as MockQueryResult<TData>;
}

/**
 * Creates a type-safe mock mutation result tuple
 */
export function createMockMutationTuple<TData>(
  mutateFn: MockedFunction<(options?: unknown) => Promise<{ data?: TData }>>,
  overrides: Partial<MockMutationResult<TData>> = {},
): MockMutationTuple<TData> {
  return [
    mutateFn,
    {
      loading: false,
      called: false,
      ...overrides,
    },
  ];
}

/**
 * Creates a type-safe mock lazy query result tuple
 */
export function createMockLazyQueryTuple<TData>(
  queryFn: MockedFunction<(options?: unknown) => Promise<void>>,
  overrides: Partial<MockLazyQueryResult<TData>> = {},
): MockLazyQueryTuple<TData> {
  return [
    queryFn,
    {
      data: undefined,
      loading: false,
      error: undefined,
      called: false,
      refetch: vi.fn(),
      ...overrides,
    },
  ];
}

// Type aliases for common query/mutation types used in ledger-list
export type ListLedgersQueryResult = MockQueryResult<ListLedgersQuery>;
export type CreateLedgerMutationTuple = MockMutationTuple<CreateLedgerMutation>;
export type UpdateLedgerMutationTuple = MockMutationTuple<UpdateLedgerMutation>;
export type DeleteLedgerMutationTuple = MockMutationTuple<DeleteLedgerMutation>;
export type GetCurrentUserQueryResult = MockQueryResult<GetCurrentUserQuery>;

export { vi };
