import { stripBqlBlockComments } from "../bql-comments";

const PLAIN = "SELECT account FROM accounts ORDER BY account LIMIT 2";

describe("stripBqlBlockComments", () => {
  describe("comments that Python beanquery accepts", () => {
    it("removes a leading comment", () => {
      expect(stripBqlBlockComments(`/* qa comment */ ${PLAIN}`)).toBe(
        `                 ${PLAIN}`,
      );
    });

    it("removes an inline comment", () => {
      expect(
        stripBqlBlockComments("SELECT /* pick */ account FROM accounts"),
      ).toBe("SELECT            account FROM accounts");
    });

    it("removes a trailing comment", () => {
      expect(stripBqlBlockComments(`${PLAIN} /* done */`)).toBe(
        `${PLAIN}${" ".repeat(11)}`,
      );
    });

    it("keeps line boundaries in a multiline comment", () => {
      const query = "/* line one\nline two */\nSELECT account FROM accounts";
      const stripped = stripBqlBlockComments(query);
      expect(stripped).toBe("           \n           \nSELECT account FROM accounts");
      expect(stripped).toHaveLength(query.length);
    });

    it("removes adjacent and repeated comments", () => {
      expect(stripBqlBlockComments("/*a*//*b*/SELECT 1")).toBe(
        `${" ".repeat(10)}SELECT 1`,
      );
      expect(stripBqlBlockComments("SELECT /*a*/ 1 /*b*/ FROM accounts")).toBe(
        "SELECT       1       FROM accounts",
      );
    });

    it("handles Unicode inside a comment without changing the query length", () => {
      const query = "/* über — 💸 */ SELECT 1";
      const stripped = stripBqlBlockComments(query);
      expect(stripped.trim()).toBe("SELECT 1");
      expect(stripped).toHaveLength(query.length);
    });

    it("handles CRLF line endings", () => {
      expect(stripBqlBlockComments("/* c */\r\nSELECT 1")).toBe(
        "       \r\nSELECT 1",
      );
    });
  });

  describe("quoted text is preserved byte-for-byte", () => {
    it("leaves comment syntax inside a single-quoted literal alone", () => {
      const query = "SELECT '/* literal */' FROM accounts";
      expect(stripBqlBlockComments(query)).toBe(query);
    });

    it("leaves comment syntax inside a double-quoted literal alone", () => {
      const query = 'SELECT "/* literal */" FROM accounts';
      expect(stripBqlBlockComments(query)).toBe(query);
    });

    it("does not treat a backslash before a closing quote as an escape", () => {
      // BQL has no escape sequences: the quote after the backslash really does
      // close the literal, so the following comment is a comment.
      const query = "SELECT 'a\\' /* c */ FROM accounts";
      expect(stripBqlBlockComments(query)).toBe(
        "SELECT 'a\\'         FROM accounts",
      );
    });

    it("handles adjacent quotes", () => {
      const query = "SELECT '', '/*x*/' /* c */ FROM accounts";
      expect(stripBqlBlockComments(query)).toBe(
        "SELECT '', '/*x*/'         FROM accounts",
      );
    });

    it("keeps a comment opener that only appears inside a literal", () => {
      const query = "SELECT '/*' FROM accounts";
      expect(stripBqlBlockComments(query)).toBe(query);
    });
  });

  describe("inputs that must stay engine errors", () => {
    it("returns an unterminated comment unchanged", () => {
      const query = "SELECT /* never closed FROM accounts";
      expect(stripBqlBlockComments(query)).toBe(query);
    });

    it("returns an unterminated string literal unchanged", () => {
      const query = "SELECT 'open /* c */ FROM accounts";
      expect(stripBqlBlockComments(query)).toBe(query);
    });

    it("normalizes comment-only input to whitespace, not to a valid query", () => {
      expect(stripBqlBlockComments("/* only a comment */").trim()).toBe("");
    });

    it("leaves a malformed query malformed", () => {
      expect(stripBqlBlockComments("/* c */ SELEKT account").trim()).toBe(
        "SELEKT account",
      );
    });

    it("does not invent support for line-comment syntaxes", () => {
      // `--`, `#` and `;` fail in the Python oracle too; this normalizer is
      // scoped to block comments and must leave them for the engine to reject.
      for (const query of [
        "-- c\nSELECT 1",
        "# c\nSELECT 1",
        "; c\nSELECT 1",
      ]) {
        expect(stripBqlBlockComments(query)).toBe(query);
      }
    });
  });

  it("returns the identical string when there is no comment", () => {
    expect(stripBqlBlockComments(PLAIN)).toBe(PLAIN);
  });
});
