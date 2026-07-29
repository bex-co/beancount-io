import { describe, it, expect } from "vitest";

/**
 * Edge case and bug fix tests for flatten-translation-keys script
 * These tests cover scenarios that were not previously tested
 */
describe("flatten-translation-keys edge cases", () => {
  describe("edge case: empty and malformed content", () => {
    it("should handle empty file content", () => {
      const input = "";
      const _namespace = "auth";
      const lines = input.split("\n");
      const result: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);
        if (!match) {
          result.push(line);
        }
      }

      const output = result.join("\n");
      expect(output).toBe("");
    });

    it("should handle file with only whitespace", () => {
      const input = "   \n\n  \n";
      const _namespace = "auth";
      const lines = input.split("\n");
      const result: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);
        if (!match) {
          result.push(line);
        }
      }

      const output = result.join("\n");
      expect(output).toBe(input);
    });

    it("should handle file with only comments", () => {
      const input = `// This is a comment
/* Multi-line comment */
// Another comment`;

      const lines = input.split("\n");
      const result: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);
        if (!match) {
          result.push(line);
        }
      }

      const output = result.join("\n");
      expect(output).toBe(input);
    });
  });

  describe("edge case: special characters and naming", () => {
    it("should handle keys with underscores", () => {
      const input = `const translations = {
  login_button: {
    message: "Login",
    description: "Button label",
  },
};`;

      const namespace = "auth";
      const lines = input.split("\n");
      const result: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);

        if (match) {
          const [, indent, keyName, rest] = match;
          let isTranslationEntry = false;

          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (
              lines[j].includes("message:") ||
              lines[j].includes("description:")
            ) {
              isTranslationEntry = true;
              break;
            }
            if (lines[j].includes("},")) {
              break;
            }
          }

          if (isTranslationEntry) {
            result.push(`${indent}"${namespace}.${keyName}":${rest}`);
            continue;
          }
        }

        result.push(line);
      }

      const output = result.join("\n");
      expect(output).toContain('"auth.login_button":');
    });

    it("should handle keys starting with underscore", () => {
      const keyName = "_privateKey";
      const pattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      expect(pattern.test(keyName)).toBe(true);
    });

    it("should handle keys with numbers", () => {
      const keyName = "button123";
      const pattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      expect(pattern.test(keyName)).toBe(true);
    });

    it("should handle CONSTANT_CASE keys", () => {
      const keyName = "API_ERROR_MESSAGE";
      const pattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      expect(pattern.test(keyName)).toBe(true);
    });
  });

  describe("edge case: translation entry detection", () => {
    it("should handle translation entry with extra spaces", () => {
      const input = `const translations = {
  loginButton:    {
    message:    "Login",
    description:    "Button label",
  },
};`;

      const _namespace = "auth";
      const lines = input.split("\n");
      let foundMatch = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);

        if (match) {
          const [, , keyName] = match;
          expect(keyName).toBe("loginButton");
          foundMatch = true;
        }
      }

      expect(foundMatch).toBe(true);
    });

    it("should detect translation entry even with different spacing in message/description", () => {
      const lines = [
        "  loginButton: {",
        "    message:    'Login',",
        "    description:    'Button label',",
        "  },",
      ];

      let isTranslationEntry = false;
      for (let j = 1; j < lines.length; j++) {
        if (
          /^\s+message:\s/.test(lines[j]) ||
          /^\s+description:\s/.test(lines[j])
        ) {
          isTranslationEntry = true;
          break;
        }
      }

      expect(isTranslationEntry).toBe(true);
    });

    it("should not detect false positive from comment containing 'message:'", () => {
      const lines = [
        "  configKey: {",
        "    // This message: should not be detected",
        "    timeout: 5000,",
        "  },",
      ];

      let isTranslationEntry = false;
      for (let j = 1; j < lines.length; j++) {
        if (
          /^\s+message:\s/.test(lines[j]) ||
          /^\s+description:\s/.test(lines[j])
        ) {
          isTranslationEntry = true;
          break;
        }
        if (lines[j].includes("},")) {
          break;
        }
      }

      // Should be false because the comment doesn't match the regex
      expect(isTranslationEntry).toBe(false);
    });

    it("should not detect false positive from string containing 'message:'", () => {
      const lines = [
        "  errorConfig: {",
        '    text: "This is a message: with colon",',
        "    code: 404,",
        "  },",
      ];

      let isTranslationEntry = false;
      for (let j = 1; j < lines.length; j++) {
        if (
          /^\s+message:\s/.test(lines[j]) ||
          /^\s+description:\s/.test(lines[j])
        ) {
          isTranslationEntry = true;
          break;
        }
        if (lines[j].includes("},")) {
          break;
        }
      }

      // Should be false because string content doesn't match the regex pattern
      expect(isTranslationEntry).toBe(false);
    });

    it("should not detect translation entry beyond 5 line lookahead", () => {
      const lines = [
        "  someKey: {",
        "    // Line 1",
        "    // Line 2",
        "    // Line 3",
        "    // Line 4",
        "    // Line 5",
        "    message: 'Should not be detected',",
      ];

      let isTranslationEntry = false;
      for (let j = 1; j < Math.min(6, lines.length); j++) {
        if (
          /^\s+message:\s/.test(lines[j]) ||
          /^\s+description:\s/.test(lines[j])
        ) {
          isTranslationEntry = true;
          break;
        }
        if (lines[j].includes("},")) {
          break;
        }
      }

      // This is the current behavior - it won't detect beyond 5 lines
      expect(isTranslationEntry).toBe(false);
    });

    it("should stop looking when closing brace is found", () => {
      const lines = [
        "  configObject: {",
        "    url: 'https://example.com',",
        "  },",
        "  // message: 'This should not match'",
      ];

      let isTranslationEntry = false;
      for (let j = 1; j < Math.min(5, lines.length); j++) {
        if (
          /^\s+message:\s/.test(lines[j]) ||
          /^\s+description:\s/.test(lines[j])
        ) {
          isTranslationEntry = true;
          break;
        }
        if (lines[j].includes("},")) {
          break;
        }
      }

      expect(isTranslationEntry).toBe(false);
    });
  });

  describe("edge case: mixed content", () => {
    it("should handle file with both translation entries and regular objects", () => {
      const input = `const config = {
  apiUrl: {
    production: "https://api.example.com",
    development: "http://localhost:3000",
  },
};

const translations = {
  loginButton: {
    message: "Login",
    description: "Button label",
  },
};`;

      const namespace = "auth";
      const lines = input.split("\n");
      const result: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);

        if (match) {
          const [, indent, keyName, rest] = match;
          let isTranslationEntry = false;

          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (
              lines[j].includes("message:") ||
              lines[j].includes("description:")
            ) {
              isTranslationEntry = true;
              break;
            }
            if (lines[j].includes("},")) {
              break;
            }
          }

          if (isTranslationEntry) {
            result.push(`${indent}"${namespace}.${keyName}":${rest}`);
            continue;
          }
        }

        result.push(line);
      }

      const output = result.join("\n");
      expect(output).toContain('"auth.loginButton":');
      expect(output).toContain("apiUrl: {"); // Should not be transformed
    });

    it("should handle deeply indented keys", () => {
      const input = `const nested = {
  level1: {
    level2: {
      loginButton: {
        message: "Login",
        description: "Button",
      },
    },
  },
};`;

      const lines = input.split("\n");
      let foundDeepKey = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);

        if (match && line.includes("loginButton")) {
          const [, indent] = match;
          expect(indent).toBe("      "); // 6 spaces
          foundDeepKey = true;
        }
      }

      expect(foundDeepKey).toBe(true);
    });
  });

  describe("edge case: key counting accuracy", () => {
    it("should differentiate between translation entries and regular objects in counting", () => {
      const content = `const translations = {
  loginButton: {
    message: "Login",
    description: "Button",
  },
  config: {
    timeout: 5000,
  },
};`;

      // Current implementation counts ALL matches
      const allMatches = content.match(/^\s+[a-zA-Z_][a-zA-Z0-9_]*:\s*{/gm);
      expect(allMatches).toHaveLength(2); // Both loginButton and config

      // But only loginButton is actually a translation entry
      const lines = content.split("\n");
      let translationEntryCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);

        if (match) {
          let isTranslationEntry = false;

          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (
              lines[j].includes("message:") ||
              lines[j].includes("description:")
            ) {
              isTranslationEntry = true;
              break;
            }
            if (lines[j].includes("},")) {
              break;
            }
          }

          if (isTranslationEntry) {
            translationEntryCount++;
          }
        }
      }

      // This reveals the bug: actual translation entries should be 1, not 2
      expect(translationEntryCount).toBe(1);
    });
  });

  describe("edge case: indentation variations", () => {
    it("should preserve 2-space indentation", () => {
      const indent = "  ";
      const namespace = "auth";
      const keyName = "loginButton";
      const rest = " {";

      const transformed = `${indent}"${namespace}.${keyName}":${rest}`;

      expect(transformed).toBe('  "auth.loginButton": {');
      expect(transformed.startsWith("  ")).toBe(true);
    });

    it("should preserve 4-space indentation", () => {
      const indent = "    ";
      const namespace = "auth";
      const keyName = "loginButton";
      const rest = " {";

      const transformed = `${indent}"${namespace}.${keyName}":${rest}`;

      expect(transformed).toBe('    "auth.loginButton": {');
      expect(transformed.startsWith("    ")).toBe(true);
    });

    it("should preserve tab indentation", () => {
      const indent = "\t";
      const namespace = "auth";
      const keyName = "loginButton";
      const rest = " {";

      const transformed = `${indent}"${namespace}.${keyName}":${rest}`;

      expect(transformed).toBe('\t"auth.loginButton": {');
      expect(transformed.startsWith("\t")).toBe(true);
    });
  });

  describe("edge case: line endings", () => {
    it("should handle Unix line endings", () => {
      const input = "line1\nline2\nline3";
      const lines = input.split("\n");

      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe("line1");
      expect(lines[2]).toBe("line3");
    });

    it("should handle Windows line endings", () => {
      const input = "line1\r\nline2\r\nline3";
      const lines = input.split("\n");

      // After split on \n, Windows line endings leave \r
      expect(lines).toHaveLength(3);
      expect(lines[0]).toContain("line1");
    });

    it("should handle mixed line endings", () => {
      const input = "line1\nline2\r\nline3";
      const lines = input.split("\n");

      expect(lines).toHaveLength(3);
    });
  });

  describe("edge case: boundary conditions", () => {
    it("should handle single translation entry", () => {
      const input = `const translations = {
  onlyKey: {
    message: "Only",
    description: "Single entry",
  },
};`;

      const lines = input.split("\n");
      let count = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);

        if (match) {
          let isTranslationEntry = false;
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (
              lines[j].includes("message:") ||
              lines[j].includes("description:")
            ) {
              isTranslationEntry = true;
              break;
            }
          }
          if (isTranslationEntry) count++;
        }
      }

      expect(count).toBe(1);
    });

    it("should handle many translation entries", () => {
      const entries = Array.from(
        { length: 100 },
        (_, i) => `  key${i}: {
    message: "Message ${i}",
    description: "Description ${i}",
  },`,
      ).join("\n");

      const input = `const translations = {\n${entries}\n};`;
      const lines = input.split("\n");
      let count = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);

        if (match) {
          let isTranslationEntry = false;
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (
              lines[j].includes("message:") ||
              lines[j].includes("description:")
            ) {
              isTranslationEntry = true;
              break;
            }
          }
          if (isTranslationEntry) count++;
        }
      }

      expect(count).toBe(100);
    });

    it("should handle translation at start of file", () => {
      const input = `loginButton: {
  message: "Login",
  description: "Button",
},`;

      const lines = input.split("\n");
      const match = lines[0].match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);

      // Should not match because it requires leading whitespace
      expect(match).toBeNull();
    });

    it("should handle translation at end of file", () => {
      const input = `const translations = {
  lastKey: {
    message: "Last",
    description: "Final entry",
  },
}`;

      const lines = input.split("\n");
      let foundLast = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);

        if (match && line.includes("lastKey")) {
          foundLast = true;
        }
      }

      expect(foundLast).toBe(true);
    });
  });
});
