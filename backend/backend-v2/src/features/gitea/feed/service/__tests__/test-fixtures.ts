import { IContext } from "@/server/graphql/context";
import { FavaApiContext } from "@/foundation/types";
import { User } from "@/features/auth/data/user-model";
import type { LedgerPublic } from "@/foundation/fava/Api";
import { FeedItem, FeedSource } from "../../api/feed-resolver.types";
import { Activity } from "@/features/gitea/client/gitea-api";

/**
 * Mock factories for test data
 */

export function createMockUser(overrides?: Partial<User>): User {
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

export function createMockFavaApiClient() {
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

export function createMockFetchResponse(data: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  text?: string;
}): Response {
  return {
    ok: data.ok ?? true,
    status: data.status ?? 200,
    statusText: data.statusText ?? "OK",
    text: jest.fn().mockResolvedValue(data.text ?? ""),
    json: jest.fn(),
    blob: jest.fn(),
    arrayBuffer: jest.fn(),
    headers: new Headers(),
  } as any;
}

/**
 * XML feed samples
 */

export const SAMPLE_BLOG_RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Beancount Blog</title>
    <link>https://beancount.io/blog</link>
    <description>Beancount Blog Posts</description>
    <item>
      <guid>https://beancount.io/blog/2024/feature-1</guid>
      <title>New Feature Announcement</title>
      <link>https://beancount.io/blog/2024/feature-1</link>
      <description><![CDATA[<p>This is an <strong>HTML</strong> description with tags.</p>]]></description>
      <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
      <dc:creator>John Doe</dc:creator>
    </item>
    <item>
      <guid>https://beancount.io/blog/2024/update-1</guid>
      <title>Monthly Update</title>
      <link>https://beancount.io/blog/2024/update-1</link>
      <description>Plain text description</description>
      <pubDate>Tue, 02 Jan 2024 15:30:00 GMT</pubDate>
      <author>Jane Smith</author>
    </item>
  </channel>
</rss>`;

export const SAMPLE_ATOM_FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Ledger Updates</title>
  <link href="http://gitea:3000/testuser/my-ledger.rss"/>
  <updated>2024-01-15T12:00:00Z</updated>
  <entry>
    <id>commit-abc123</id>
    <title>Updated ledger file</title>
    <link href="http://gitea:3000/testuser/my-ledger/commit/abc123"/>
    <updated>2024-01-15T12:00:00Z</updated>
    <author>
      <name>testuser</name>
    </author>
    <content>Added new transaction for January</content>
  </entry>
  <entry>
    <id>commit-def456</id>
    <title>Fixed transaction date</title>
    <link href="http://gitea:3000/testuser/my-ledger/commit/def456"/>
    <updated>2024-01-14T09:00:00Z</updated>
    <author>
      <name>testuser</name>
    </author>
    <content>Corrected date format</content>
  </entry>
</feed>`;

export const SAMPLE_EMPTY_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Empty Feed</title>
    <link>https://example.com</link>
    <description>No items</description>
  </channel>
</rss>`;

export const MALFORMED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Broken Feed
  </channel>
</rss>`;

/**
 * Expected parsed results
 */

export const EXPECTED_BLOG_ITEMS: FeedItem[] = [
  {
    id: "https://beancount.io/blog/2024/feature-1",
    title: "New Feature Announcement",
    summary: "This is an HTML description with tags.",
    link: "https://beancount.io/blog/2024/feature-1",
    publishedAt: new Date("2024-01-01T10:00:00.000Z"),
    author: "John Doe",
    authorAvatar: undefined,
    source: FeedSource.BLOG,
  },
  {
    id: "https://beancount.io/blog/2024/update-1",
    title: "Monthly Update",
    summary: "Plain text description",
    link: "https://beancount.io/blog/2024/update-1",
    publishedAt: new Date("2024-01-02T15:30:00.000Z"),
    author: "Jane Smith",
    authorAvatar: undefined,
    source: FeedSource.BLOG,
  },
];

export const EXPECTED_ATOM_ITEMS: FeedItem[] = [
  {
    id: "commit-abc123",
    title: "Updated ledger file",
    summary: "Added new transaction for January",
    link: "/ledger/testuser/my-ledger",
    publishedAt: new Date("2024-01-15T12:00:00.000Z"),
    author: "testuser",
    authorAvatar: undefined,
    source: FeedSource.LEDGER_RSS,
  },
  {
    id: "commit-def456",
    title: "Fixed transaction date",
    summary: "Corrected date format",
    link: "/ledger/testuser/my-ledger",
    publishedAt: new Date("2024-01-14T09:00:00.000Z"),
    author: "testuser",
    authorAvatar: undefined,
    source: FeedSource.LEDGER_RSS,
  },
];

export const MOCK_REPOSITORIES: LedgerPublic[] = [
  {
    id: 1,
    full_name: "testuser/my-ledger",
    name: "my-ledger",
    owner: { login: "testuser" },
  } as unknown as LedgerPublic,
  {
    id: 2,
    full_name: "testuser/budget-2024",
    name: "budget-2024",
    owner: { login: "testuser" },
  } as unknown as LedgerPublic,
];

/**
 * User variants with different locales
 */

export const MOCK_USER_EN = createMockUser({
  id: "user-en",
  locale: "en",
  email: "user-en@example.com",
});

export const MOCK_USER_ZH = createMockUser({
  id: "user-zh",
  locale: "zh",
  email: "user-zh@example.com",
});

export const MOCK_USER_FR = createMockUser({
  id: "user-fr",
  locale: "fr",
  email: "user-fr@example.com",
});

export const MOCK_USER_UNSUPPORTED_LOCALE = createMockUser({
  id: "user-xyz",
  locale: "xyz", // Not in supported list
  email: "user-xyz@example.com",
});

export const MOCK_USER_NO_LOCALE = createMockUser({
  id: "user-no-locale",
  locale: undefined,
  email: "user-no-locale@example.com",
});

/**
 * Activity fixtures for Gitea API
 */

export const SAMPLE_COMMIT_ACTIVITY: Activity = {
  id: 1,
  op_type: "commit_repo",
  repo: {
    id: 1,
    name: "my-ledger",
    full_name: "testuser/my-ledger",
    owner: { login: "testuser" },
  },
  act_user: {
    id: 1,
    login: "testuser",
    full_name: "Test User",
    avatar_url: "https://example.com/avatar.jpg",
  },
  created: "2024-01-15T10:00:00Z",
  content: "Updated main ledger file",
};

export const SAMPLE_CREATE_REPO_ACTIVITY: Activity = {
  id: 2,
  op_type: "create_repo",
  repo: {
    id: 2,
    name: "new-ledger",
    full_name: "testuser/new-ledger",
    owner: { login: "testuser" },
  },
  act_user: {
    id: 1,
    login: "testuser",
  },
  created: "2024-01-14T10:00:00Z",
  content: "Created new repository",
};

export const SAMPLE_PUSH_TAG_ACTIVITY: Activity = {
  id: 3,
  op_type: "push_tag",
  repo: {
    id: 1,
    name: "my-ledger",
    full_name: "testuser/my-ledger",
    owner: { login: "testuser" },
  },
  act_user: {
    id: 1,
    login: "testuser",
  },
  created: "2024-01-15T11:00:00Z",
  content: "Pushed tag v1.0",
  ref_name: "v1.0.0",
};

export const SAMPLE_ACTIVITIES_SAME_DAY: Activity[] = [
  {
    id: 10,
    op_type: "commit_repo",
    repo: {
      id: 1,
      name: "my-ledger",
      full_name: "testuser/my-ledger",
      owner: { login: "testuser" },
    },
    act_user: { login: "testuser" },
    created: "2024-01-15T09:00:00Z",
    content: "First commit",
  },
  {
    id: 11,
    op_type: "commit_repo",
    repo: {
      id: 1,
      name: "my-ledger",
      full_name: "testuser/my-ledger",
      owner: { login: "testuser" },
    },
    act_user: { login: "testuser" },
    created: "2024-01-15T10:00:00Z",
    content: "Second commit",
  },
  {
    id: 12,
    op_type: "push_tag",
    repo: {
      id: 1,
      name: "my-ledger",
      full_name: "testuser/my-ledger",
      owner: { login: "testuser" },
    },
    act_user: { login: "testuser" },
    created: "2024-01-15T11:00:00Z",
    content: "Tagged release",
  },
];

export function createMockGiteaClient() {
  return {
    users: {
      userListActivityFeeds: jest.fn().mockResolvedValue({ data: [] }),
    },
    repos: {
      repoListActivityFeeds: jest.fn().mockResolvedValue({ data: [] }),
    },
  } as any;
}
