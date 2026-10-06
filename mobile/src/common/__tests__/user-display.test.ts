import {
  avatarImageUri,
  isGravatarUrl,
  userDisplayName,
  userInitials,
} from "../user-display";

describe("userDisplayName", () => {
  const email = "ada@example.test";

  it("prefers the full name", () => {
    expect(
      userDisplayName({ email, firstName: " Ada ", lastName: "Lovelace" }),
    ).toBe("Ada Lovelace");
  });

  it("uses whichever name part is set", () => {
    expect(
      userDisplayName({ email, firstName: "", lastName: "Lovelace" }),
    ).toBe("Lovelace");
  });

  it("falls back to the username, then the email's local part", () => {
    expect(
      userDisplayName({
        email,
        firstName: " ",
        lastName: null,
        username: "ada",
      }),
    ).toBe("ada");
    expect(userDisplayName({ email, username: "" })).toBe("ada");
    expect(userDisplayName({ email: "grace@example.test" })).toBe("grace");
  });
});

describe("userInitials", () => {
  it("takes the first and last words", () => {
    expect(userInitials("ada king lovelace")).toBe("AL");
  });

  it("takes one character for a single word or a CJK name", () => {
    expect(userInitials("tian")).toBe("T");
    expect(userInitials("潘天")).toBe("潘");
  });

  it("never splits a surrogate pair", () => {
    expect(userInitials("𠮷野 家")).toBe("𠮷家");
  });

  it("has a placeholder for an empty name", () => {
    expect(userInitials("  ")).toBe("?");
  });
});

describe("avatarImageUri", () => {
  it("asks Gravatar for the drawn size and a 404 instead of its logo", () => {
    expect(
      avatarImageUri("https://www.gravatar.com/avatar/abc?size=48", 96),
    ).toBe("https://www.gravatar.com/avatar/abc?s=96&d=404");
  });

  it("makes a protocol-relative URL absolute", () => {
    expect(avatarImageUri("//www.gravatar.com/avatar/abc", 288)).toBe(
      "https://www.gravatar.com/avatar/abc?s=288&d=404",
    );
  });

  it("leaves other hosts untouched", () => {
    const github = "https://avatars.githubusercontent.com/u/1?v=4&s=120";
    expect(avatarImageUri(github, 96)).toBe(github);
  });

  it("returns nothing without a URL", () => {
    expect(avatarImageUri(null, 96)).toBe(undefined);
    expect(avatarImageUri("", 96)).toBe(undefined);
  });
});

describe("isGravatarUrl", () => {
  it("recognizes Gravatar hosts only", () => {
    expect(isGravatarUrl("https://www.gravatar.com/avatar/abc")).toBe(true);
    expect(isGravatarUrl("https://gravatar.com.evil.test/avatar")).toBe(false);
    expect(isGravatarUrl(undefined)).toBe(false);
  });
});
