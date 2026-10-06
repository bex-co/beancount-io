import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import * as userDisplay from "../../user-display";

// Run the real hook with Apollo and the session stubbed: assertions read the
// options it hands each query, so no network or React renderer is needed.
type QueryOptions = {
  skip?: boolean;
  onError?: (error: { graphQLErrors: unknown[] }) => void;
};
type Profile = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
};

let session: { serverUrl?: string } | null;
let profileResult: { data?: { userProfile: Profile | null }; loading: boolean };
let avatarResult: { data?: { userProfile: { avatarUrl: string } } };
let profileOptions: QueryOptions;
let avatarOptions: QueryOptions;

function loadHook(): () => any {
  const exports: Record<string, any> = {};
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../use-current-user.ts"), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  vm.runInNewContext(source, {
    exports,
    require(id: string) {
      if (id === "@apollo/client") return { useReactiveVar: () => session };
      if (id === "@/common/vars") return { sessionVar: {} };
      if (id === "@/common/user-display") return userDisplay;
      if (id === "@/generated-graphql/graphql")
        return {
          useCurrentUserQuery: (options: QueryOptions) => {
            profileOptions = options;
            return { ...profileResult, error: undefined, refetch() {} };
          },
          useCurrentUserAvatarQuery: (options: QueryOptions) => {
            avatarOptions = options;
            return options.skip ? {} : avatarResult;
          },
        };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return exports.useCurrentUser;
}

const ada: Profile = {
  id: "usr_ada",
  email: "ada@example.test",
  firstName: "Ada",
  lastName: "Lovelace",
  username: "ada",
};

describe("useCurrentUser", () => {
  beforeEach(() => {
    session = { serverUrl: "https://beancount.io/" };
    profileResult = { data: { userProfile: ada }, loading: false };
    avatarResult = {
      data: { userProfile: { avatarUrl: "https://example.test/ada.png" } },
    };
  });

  it("joins the profile and the separately fetched avatar", () => {
    const result = loadHook()();
    // Built inside the hook's sandbox, so compare fields, not prototypes.
    expect(JSON.stringify(result.user)).toBe(
      JSON.stringify({ ...ada, avatarUrl: "https://example.test/ada.png" }),
    );
    expect(result.displayName).toBe("Ada Lovelace");
    expect(result.loading).toBe(false);
  });

  it("still returns the profile when the avatar is unavailable", () => {
    avatarResult = {};
    const result = loadHook()();
    expect(result.user.email).toBe("ada@example.test");
    expect(result.user.avatarUrl).toBe(null);
  });

  it("asks for nothing without a session", () => {
    session = null;
    profileResult = { loading: false };
    const result = loadHook()();
    expect(profileOptions.skip).toBe(true);
    expect(avatarOptions.skip).toBe(true);
    expect(result.user).toBe(null);
    expect(result.displayName).toBe("");
  });

  it("reports loading only until a profile is available", () => {
    profileResult = { loading: true };
    expect(loadHook()().loading).toBe(true);
    profileResult = { data: { userProfile: ada }, loading: true };
    expect(loadHook()().loading).toBe(false);
  });

  it("stops asking a server that rejected avatarUrl", () => {
    const useCurrentUser = loadHook();
    useCurrentUser();
    expect(avatarOptions.skip).toBe(false);
    avatarOptions.onError!({
      graphQLErrors: [{ message: 'Cannot query field "avatarUrl"' }],
    });
    useCurrentUser();
    expect(avatarOptions.skip).toBe(true);
    // The profile itself keeps loading on that server.
    expect(profileOptions.skip).toBe(false);
  });

  it("remembers the rejection per server", () => {
    const useCurrentUser = loadHook();
    useCurrentUser();
    avatarOptions.onError!({ graphQLErrors: [{ message: "unknown field" }] });
    session = { serverUrl: "https://ledger.example.test/" };
    useCurrentUser();
    expect(avatarOptions.skip).toBe(false);
  });

  it("keeps asking after a network failure", () => {
    const useCurrentUser = loadHook();
    useCurrentUser();
    avatarOptions.onError!({ graphQLErrors: [] });
    useCurrentUser();
    expect(avatarOptions.skip).toBe(false);
  });

  it("treats a legacy session without serverUrl as one server", () => {
    session = {};
    const useCurrentUser = loadHook();
    useCurrentUser();
    avatarOptions.onError!({ graphQLErrors: [{ message: "unknown field" }] });
    useCurrentUser();
    expect(avatarOptions.skip).toBe(true);
  });
});
