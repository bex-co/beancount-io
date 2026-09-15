/**
 * Tests the real `useSession`. This file used to re-declare the logic inline and
 * assert against its own copy, so it could not fail; the module's native and
 * `@/` dependencies are now replaced with stand-ins the runner can load.
 */
import {
  freshRequire,
  interceptModules,
} from "../../__tests__/fixtures/intercept-modules";

type VarsMock = typeof import("../../__tests__/fixtures/mock-vars");
type Subject = typeof import("../use-session");

const VARS = require.resolve("../../__tests__/fixtures/mock-vars");
const SUBJECT = require.resolve("../use-session");
let restore: () => void;
let vars: VarsMock;
let useSession: Subject["useSession"];

beforeAll(() => {
  restore = interceptModules({
    "@apollo/client":
      require.resolve("../../__tests__/fixtures/mock-apollo-client"),
    "@/common/vars": VARS,
  });
  vars = require(VARS) as VarsMock;
  ({ useSession } = freshRequire<Subject>(SUBJECT));
});

afterAll(() => {
  restore();
  delete require.cache[SUBJECT];
});

describe("useSession", () => {
  it("returns the signed-in session", () => {
    vars.sessionVar({ userId: "user-123" });
    expect(useSession()).toEqual({ userId: "user-123" });
  });

  it("throws when there is no session, instead of handing screens a null", () => {
    vars.sessionVar(null);
    expect(() => useSession()).toThrow("Session not found");
  });
});
