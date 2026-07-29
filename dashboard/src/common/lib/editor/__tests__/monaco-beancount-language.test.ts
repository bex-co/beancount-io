import { describe, it, expect, vi, beforeAll } from "vitest";
import type * as monacoType from "monaco-editor";
import {
  registerBeancountLanguage,
  beancountLanguageConfig,
  beancountTokenProvider,
} from "../monaco-beancount-language";

// Mock console methods
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

// Mock monaco editor with proper typing
const mockLanguages = {
  getLanguages: vi.fn(
    () => [] as monacoType.languages.ILanguageExtensionPoint[],
  ),
  register: vi.fn(),
  setLanguageConfiguration: vi.fn(),
  setMonarchTokensProvider: vi.fn(),
};

const mockEditor = {
  defineTheme: vi.fn(),
};

// Create a partial mock of the monaco namespace
const mockMonaco = {
  languages: mockLanguages,
  editor: mockEditor,
} as unknown as typeof monacoType;

describe("Monaco Beancount Language", () => {
  beforeAll(() => {
    // Register once at the beginning for all tests
    consoleErrorSpy.mockClear();
    mockLanguages.getLanguages.mockReturnValue([]);
    registerBeancountLanguage(mockMonaco);
  });

  describe("beancountLanguageConfig", () => {
    it("should have line comment configuration", () => {
      expect(beancountLanguageConfig.comments).toBeDefined();
      expect(beancountLanguageConfig.comments?.lineComment).toBe(";");
    });

    it("should have bracket pairs", () => {
      expect(beancountLanguageConfig.brackets).toBeDefined();
      expect(beancountLanguageConfig.brackets).toContainEqual(["{", "}"]);
      expect(beancountLanguageConfig.brackets).toContainEqual(["[", "]"]);
      expect(beancountLanguageConfig.brackets).toContainEqual(["(", ")"]);
    });

    it("should have auto-closing pairs", () => {
      expect(beancountLanguageConfig.autoClosingPairs).toBeDefined();
      expect(beancountLanguageConfig.autoClosingPairs?.length).toBeGreaterThan(
        0,
      );
    });

    it("should include quotes in auto-closing pairs", () => {
      const quotePair = beancountLanguageConfig.autoClosingPairs?.find(
        (pair) => pair.open === '"',
      );
      expect(quotePair).toBeDefined();
      expect(quotePair?.close).toBe('"');
    });

    it("should have surrounding pairs", () => {
      expect(beancountLanguageConfig.surroundingPairs).toBeDefined();
      expect(beancountLanguageConfig.surroundingPairs?.length).toBeGreaterThan(
        0,
      );
    });
  });

  describe("beancountTokenProvider", () => {
    it("should have correct token postfix", () => {
      expect(beancountTokenProvider.tokenPostfix).toBe(".beancount");
    });

    it("should define beancount keywords", () => {
      expect(beancountTokenProvider.keywords).toBeDefined();
      expect(beancountTokenProvider.keywords).toContain("include");
      expect(beancountTokenProvider.keywords).toContain("plugin");
      expect(beancountTokenProvider.keywords).toContain("balance");
      expect(beancountTokenProvider.keywords).toContain("open");
      expect(beancountTokenProvider.keywords).toContain("close");
    });

    it("should define account root types", () => {
      expect(beancountTokenProvider.accountRoots).toBeDefined();
      expect(beancountTokenProvider.accountRoots).toContain("Assets");
      expect(beancountTokenProvider.accountRoots).toContain("Liabilities");
      expect(beancountTokenProvider.accountRoots).toContain("Equity");
      expect(beancountTokenProvider.accountRoots).toContain("Income");
      expect(beancountTokenProvider.accountRoots).toContain("Expenses");
    });

    it("should define operators", () => {
      expect(beancountTokenProvider.operators).toBeDefined();
      expect(beancountTokenProvider.operators).toContain("+");
      expect(beancountTokenProvider.operators).toContain("-");
      expect(beancountTokenProvider.operators).toContain("*");
      expect(beancountTokenProvider.operators).toContain("/");
      expect(beancountTokenProvider.operators).toContain("=");
    });

    it("should have tokenizer rules", () => {
      expect(beancountTokenProvider.tokenizer).toBeDefined();
      expect(beancountTokenProvider.tokenizer.root).toBeDefined();
      expect(beancountTokenProvider.tokenizer.string).toBeDefined();
      expect(beancountTokenProvider.tokenizer.whitespace).toBeDefined();
    });

    it("should have root tokenizer rules", () => {
      const rootRules = beancountTokenProvider.tokenizer.root;
      expect(Array.isArray(rootRules)).toBe(true);
      expect(rootRules.length).toBeGreaterThan(0);
    });

    it("should tokenize comments", () => {
      const rootRules = beancountTokenProvider.tokenizer.root;
      const commentRule = rootRules.find((rule) => {
        if (Array.isArray(rule) && rule[0] instanceof RegExp) {
          return rule[0].test("; comment");
        }
        return false;
      });
      expect(commentRule).toBeDefined();
    });

    it("should tokenize dates", () => {
      const rootRules = beancountTokenProvider.tokenizer.root;
      const dateRule = rootRules.find((rule) => {
        if (Array.isArray(rule) && rule[0] instanceof RegExp) {
          return rule[0].test("2024-01-15");
        }
        return false;
      });
      expect(dateRule).toBeDefined();
    });

    it("should include whitespace handling", () => {
      expect(beancountTokenProvider.tokenizer.root).toContainEqual({
        include: "@whitespace",
      });
    });
  });

  describe("registerBeancountLanguage", () => {
    it("should register the language with monaco", () => {
      expect(mockLanguages.register).toHaveBeenCalledWith({
        id: "beancount",
        extensions: [".bean", ".beancount"],
        aliases: ["Beancount", "beancount"],
      });
    });

    it("should set language configuration", () => {
      expect(mockLanguages.setLanguageConfiguration).toHaveBeenCalledWith(
        "beancount",
        beancountLanguageConfig,
      );
    });

    it("should set token provider", () => {
      expect(mockLanguages.setMonarchTokensProvider).toHaveBeenCalledWith(
        "beancount",
        beancountTokenProvider,
      );
    });

    it("should define dark theme", () => {
      expect(mockEditor.defineTheme).toHaveBeenCalledWith(
        "beancount-dark",
        expect.objectContaining({
          base: "vs-dark",
          inherit: true,
        }),
      );
    });

    it("should define light theme", () => {
      expect(mockEditor.defineTheme).toHaveBeenCalledWith(
        "beancount-light",
        expect.objectContaining({
          base: "vs",
          inherit: true,
        }),
      );
    });

    it("should prevent double registration", () => {
      const registerCallsBefore = mockLanguages.register.mock.calls.length;

      // Try to register again
      registerBeancountLanguage(mockMonaco);

      // Should not have registered again
      expect(mockLanguages.register.mock.calls.length).toBe(
        registerCallsBefore,
      );
    });
  });
});
