import { IContext } from "@/server/graphql/context";
import { FavaApiContext } from "@/foundation/types";
import { User } from "@/features/auth/data/user-model";

function createMockUser(overrides?: Partial<User>): User {
  return {
    id: "user-123",
    email: "test@example.com",
    ledger_username: "testuser",
    ledger_password: "testpass",
    locale: "en",
    isBlocked: false,
    avatarUrl: "",
    createAt: new Date("2024-01-01"),
    updateAt: new Date("2024-01-01"),
    ...overrides,
  } as User;
}

function createMockFavaApiClient() {
  return {
    ledgers: {
      listLedgers: jest.fn().mockResolvedValue({ data: { data: [] } }),
    },
  } as any;
}

export function createMockContext(
  overrides?: Partial<IContext>,
): jest.Mocked<IContext> {
  const mockUser = createMockUser();
  const mockFavaApiClient = createMockFavaApiClient();

  const mockService = {
    getFavaApiContext: jest.fn().mockResolvedValue({
      favaApiClient: mockFavaApiClient,
      favaUser: {
        username: mockUser.ledger_username,
        password: mockUser.ledger_password,
      },
    } as FavaApiContext),
    getFavaPublicApiClient: jest.fn(),
    getGiteaClient: jest.fn(),
    cacheHelper: {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      getOrSet: jest.fn(),
    },
  } as any;

  return {
    userId: mockUser.id,
    token: "jwt-token",
    service: mockService,
    reqHeaders: {},
    config: {} as any,
    koaCtx: {} as any,
    getCurrentUserId: jest.fn().mockReturnValue(mockUser.id),
    getCurrentUser: jest.fn().mockResolvedValue(mockUser),
    getCurrentIdentity: jest.fn().mockReturnValue({
      userId: mockUser.id,
      method: "session",
      scopes: new Set(),
      capabilityExempt: true,
    }),
    ...overrides,
  } as jest.Mocked<IContext>;
}
