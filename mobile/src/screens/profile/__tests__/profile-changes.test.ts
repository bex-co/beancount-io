import { isUsernameTaken, profileChanges } from "../profile-changes";

const saved = { firstName: "Ada", lastName: "", username: "ada" };

describe("profileChanges", () => {
  it("writes nothing for an untouched or whitespace-only edit", () => {
    expect(profileChanges(saved, { ...saved })).toEqual({});
    expect(
      profileChanges(saved, { ...saved, firstName: " Ada ", username: "ada " }),
    ).toEqual({});
  });

  it("sends both names when either changes, since the API clears a missing one", () => {
    expect(profileChanges(saved, { ...saved, lastName: " Lovelace" })).toEqual({
      name: { firstName: "Ada", lastName: "Lovelace" },
    });
  });

  it("renames only when the username changed", () => {
    expect(profileChanges(saved, { ...saved, username: "lovelace" })).toEqual({
      username: "lovelace",
    });
  });
});

describe("isUsernameTaken", () => {
  it("recognizes the API's CONFLICT code", () => {
    expect(
      isUsernameTaken({
        graphQLErrors: [
          {
            message: "Username conflict: lovelace",
            extensions: { code: "CONFLICT" },
          },
        ],
      }),
    ).toBe(true);
  });

  it("does not guess from message text", () => {
    // A merge conflict or any other failure mentioning "conflict" is not a
    // taken username; only the typed code says so.
    expect(isUsernameTaken(new Error("Username conflict: lovelace"))).toBe(
      false,
    );
    expect(
      isUsernameTaken({
        graphQLErrors: [
          {
            message: "conflict",
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          },
        ],
      }),
    ).toBe(false);
    expect(isUsernameTaken(undefined)).toBe(false);
  });
});
