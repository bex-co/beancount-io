import { describe, it, expect, vi, beforeAll } from "vitest";
import type * as monacoType from "monaco-editor";
import {
  beancountLanguageConfig,
  beancountTokenProvider,
  registerBeancountLanguage,
} from "../monaco-beancount-language-vscode";

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
  registerFoldingRangeProvider: vi.fn(),
  FoldingRangeKind: {
    Region: 3,
  },
};

const mockEditor = {
  defineTheme: vi.fn(),
};

// Create a partial mock of the monaco namespace
const mockMonaco = {
  languages: mockLanguages,
  editor: mockEditor,
} as unknown as typeof monacoType;

/**
 * Tests for Monaco Beancount Language configuration
 *
 * Note: Tests for registerBeancountLanguage and folding provider require Monaco Editor
 * runtime which is difficult to mock in Vitest. These are tested manually and through
 * integration tests. This test file focuses on the language configuration exports.
 */
describe("Monaco Beancount Language (VSCode version)", () => {
  beforeAll(() => {
    // Register once at the beginning for all tests
    consoleErrorSpy.mockClear();
    mockLanguages.getLanguages.mockReturnValue([]);
    registerBeancountLanguage(mockMonaco);
  });
  describe("beancountLanguageConfig", () => {
    it("should define semicolon as line comment", () => {
      expect(beancountLanguageConfig.comments?.lineComment).toBe(";");
    });

    it("should define brackets", () => {
      expect(beancountLanguageConfig.brackets).toEqual([
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
      ]);
    });

    it("should define auto-closing pairs", () => {
      expect(beancountLanguageConfig.autoClosingPairs).toContainEqual({
        open: "{",
        close: "}",
      });
      expect(beancountLanguageConfig.autoClosingPairs).toContainEqual({
        open: '"',
        close: '"',
      });
    });
  });

  describe("beancountTokenProvider", () => {
    it("should have tokenPostfix", () => {
      expect(beancountTokenProvider.tokenPostfix).toBe(".beancount");
    });

    it("should have root tokenizer", () => {
      expect(beancountTokenProvider.tokenizer).toBeDefined();
      expect(beancountTokenProvider.tokenizer.root).toBeDefined();
      expect(Array.isArray(beancountTokenProvider.tokenizer.root)).toBe(true);
    });

    it("should tokenize comments", () => {
      const commentRule = beancountTokenProvider.tokenizer.root.find(
        (rule) => Array.isArray(rule) && rule[1] === "comment.beancount",
      );
      expect(commentRule).toBeDefined();
    });

    it("should tokenize dates", () => {
      const dateRule = beancountTokenProvider.tokenizer.root.find(
        (rule) => Array.isArray(rule) && rule[1] === "constant.beancount",
      );
      expect(dateRule).toBeDefined();
    });

    it("should tokenize account names", () => {
      const accountRule = beancountTokenProvider.tokenizer.root.find(
        (rule) => Array.isArray(rule) && rule[1] === "variable.beancount",
      );
      expect(accountRule).toBeDefined();
    });

    it("should tokenize currencies", () => {
      const currencyRule = beancountTokenProvider.tokenizer.root.find(
        (rule) => Array.isArray(rule) && rule[1] === "symbol.beancount",
      );
      expect(currencyRule).toBeDefined();
    });

    it("should tokenize numbers", () => {
      const numberRule = beancountTokenProvider.tokenizer.root.find(
        (rule) => Array.isArray(rule) && rule[1] === "number.beancount",
      );
      expect(numberRule).toBeDefined();
    });

    it("should tokenize keywords", () => {
      const keywordRule = beancountTokenProvider.tokenizer.root.find(
        (rule) => Array.isArray(rule) && rule[1] === "keyword.beancount",
      );
      expect(keywordRule).toBeDefined();
    });

    it("should have string tokenizer", () => {
      expect(beancountTokenProvider.tokenizer.string).toBeDefined();
      expect(Array.isArray(beancountTokenProvider.tokenizer.string)).toBe(true);
    });

    it("should have whitespace tokenizer", () => {
      expect(beancountTokenProvider.tokenizer.whitespace).toBeDefined();
      expect(Array.isArray(beancountTokenProvider.tokenizer.whitespace)).toBe(
        true,
      );
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

    it("should register folding range provider", () => {
      expect(mockLanguages.registerFoldingRangeProvider).toHaveBeenCalledWith(
        "beancount",
        expect.objectContaining({
          provideFoldingRanges: expect.any(Function),
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

  describe("Folding Provider", () => {
    // Helper to get the folding provider from mock
    function getFoldingProvider() {
      const registerCall =
        mockLanguages.registerFoldingRangeProvider.mock.calls[0];
      return registerCall[1];
    }

    // Helper to create a mock model from an array of lines
    function createMockModel(lines: string[]) {
      return {
        getLineCount: vi.fn().mockReturnValue(lines.length),
        getLineContent: vi.fn((line: number) => lines[line - 1] || ""),
      };
    }

    it("should generate folding ranges for org-mode style headers", () => {
      const foldingProvider = getFoldingProvider();
      const mockModel = createMockModel([
        "* Section 1",
        "Content line 1",
        "Content line 2",
        "** Subsection",
        "More content",
      ]);

      const ranges = foldingProvider.provideFoldingRanges(mockModel);

      expect(ranges).toBeDefined();
      expect(Array.isArray(ranges)).toBe(true);
      // Should have at least one folding range for the section
      expect(ranges.length).toBeGreaterThan(0);
    });

    it("should not create folding ranges for non-header lines", () => {
      const foldingProvider = getFoldingProvider();
      const mockModel = createMockModel([
        "2024-01-01 * Transaction",
        "  Assets:Checking  100 USD",
        "  Expenses:Food   -100 USD",
      ]);

      const ranges = foldingProvider.provideFoldingRanges(mockModel);

      expect(ranges).toBeDefined();
      expect(Array.isArray(ranges)).toBe(true);
      expect(ranges.length).toBe(0);
    });

    it("should handle nested headers correctly", () => {
      const foldingProvider = getFoldingProvider();
      const mockModel = createMockModel([
        "* Level 1",
        "Content 1",
        "** Level 2",
        "Content 2",
        "* Another Level 1",
        "Content 3",
      ]);

      const ranges = foldingProvider.provideFoldingRanges(mockModel);

      expect(ranges).toBeDefined();
      expect(Array.isArray(ranges)).toBe(true);
      // Should have folding ranges for nested structure
      expect(ranges.length).toBeGreaterThan(0);
    });

    it("should handle empty model", () => {
      const foldingProvider = getFoldingProvider();
      const mockModel = createMockModel([]);

      const ranges = foldingProvider.provideFoldingRanges(mockModel);

      expect(ranges).toBeDefined();
      expect(Array.isArray(ranges)).toBe(true);
      expect(ranges.length).toBe(0);
    });

    it("should handle single header at end of file", () => {
      const foldingProvider = getFoldingProvider();
      // Header at the end with no content after it
      const mockModel = createMockModel([
        "Content before",
        "More content",
        "* Header at end",
      ]);

      const ranges = foldingProvider.provideFoldingRanges(mockModel);

      expect(ranges).toBeDefined();
      expect(Array.isArray(ranges)).toBe(true);
      // Header at end with no content should not create a range
      expect(ranges.length).toBe(0);
    });

    it("should handle multiple asterisks as deeper levels", () => {
      const foldingProvider = getFoldingProvider();
      const mockModel = createMockModel([
        "*** Deep level 3",
        "Content",
        "**** Even deeper level 4",
        "More content",
      ]);

      const ranges = foldingProvider.provideFoldingRanges(mockModel);

      expect(ranges).toBeDefined();
      expect(Array.isArray(ranges)).toBe(true);
    });
  });
});
