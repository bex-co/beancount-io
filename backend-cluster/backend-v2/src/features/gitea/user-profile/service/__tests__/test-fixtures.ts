import { IContext } from "@/server/graphql/context";
import { User as AppUser } from "@/features/auth/data/user-model";
import { User, Repository, Activity } from "@/features/gitea/client/gitea-api";

/**
 * Mock factories for user profile test data
 */

export function createMockUser(overrides?: Partial<AppUser>): AppUser {
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
  } as AppUser;
}

export function createMockContext(
  overrides?: Partial<IContext>,
): jest.Mocked<IContext> {
  const mockUser = createMockUser();

  return {
    userId: mockUser.id,
    token: "jwt-token",
    service: {
      getFavaApiContext: jest.fn(),
      getFavaPublicApiClient: jest.fn(),
      getGiteaClient: jest.fn(),
    } as any,
    reqHeaders: {},
    config: {
      gitea: {
        internalHostname: "gitea",
        httpPort: 3000,
      },
      favaApi: {
        adminUser: "admin",
        adminPassword: "adminpass",
      },
    } as any,
    getCurrentUserId: jest.fn().mockReturnValue(mockUser.id),
    getCurrentUser: jest.fn().mockResolvedValue(mockUser),
    getCurrentIdentity: jest.fn().mockReturnValue({
      userId: mockUser.id,
      method: "session",
      scopes: new Set(),
    }),
    ...overrides,
  } as jest.Mocked<IContext>;
}

export function createMockGiteaUser(overrides?: Partial<User>): User {
  return {
    id: 1,
    login: "testuser",
    full_name: "Test User",
    email: "testuser@example.com",
    avatar_url: "https://example.com/avatar.jpg",
    description: "A test user bio",
    location: "San Francisco, CA",
    website: "https://example.com",
    followers_count: 10,
    following_count: 5,
    starred_repos_count: 15,
    created: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockGiteaRepository(
  overrides?: Partial<Repository>,
): Repository {
  return {
    id: 1,
    name: "test-repo",
    full_name: "testuser/test-repo",
    description: "A test repository",
    private: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
    owner: {
      login: "testuser",
    },
    ...overrides,
  } as Repository;
}

export function createMockGiteaActivity(
  overrides?: Partial<Activity>,
): Activity {
  return {
    id: 1,
    op_type: "commit_repo",
    repo: {
      id: 1,
      name: "test-repo",
      full_name: "testuser/test-repo",
      owner: { login: "testuser" },
    },
    act_user: {
      id: 1,
      login: "testuser",
      avatar_url: "https://example.com/avatar.jpg",
    },
    created: "2024-01-15T10:00:00Z",
    content: "Updated main file",
    ...overrides,
  };
}

export function createMockGiteaClient() {
  return {
    users: {
      userGet: jest.fn(),
      userListActivityFeeds: jest.fn(),
      userListRepos: jest.fn(),
      userListFollowers: jest.fn(),
      userListFollowing: jest.fn(),
      userListStarred: jest.fn(),
    },
    user: {
      userCurrentCheckFollowing: jest.fn(),
      userCurrentPutFollow: jest.fn(),
      userCurrentDeleteFollow: jest.fn(),
    },
  } as any;
}
