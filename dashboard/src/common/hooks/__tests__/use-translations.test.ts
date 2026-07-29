import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTranslations } from "../use-translations";

// Unmock the hook for these tests
vi.unmock("@/common/hooks/use-translations");

// Mock react-i18next with proper interpolation support
const mockChangeLanguage = vi.fn();
const mockI18n = {
  language: "en",
  changeLanguage: mockChangeLanguage,
  options: {},
  on: vi.fn(),
  off: vi.fn(),
};

/**
 * Helper function to simulate i18next interpolation
 * i18next uses {{param}} syntax (double braces)
 */
function interpolate(
  text: string | object,
  params?: Record<string, string | number>,
): string | object {
  // If it's not a string, return as-is (for structured format)
  if (typeof text !== "string") {
    return text;
  }

  // If no params, return text as-is
  if (!params) {
    return text;
  }

  // Replace {{param}} with actual values (i18next format)
  let result = text;
  Object.entries(params).forEach(([key, value]) => {
    // i18next uses {{key}} format (double braces)
    result = result.replace(new RegExp(`{{${key}}}`, "g"), String(value));
  });

  return result;
}

const mockT = vi.fn((key: string, options?: any) => {
  // Simulate i18next behavior with interpolation
  // Note: Our app uses {param} syntax (single braces) as configured in i18n.ts
  const params = options || {};

  // Mock translation data - strings only (extractMessages already extracted the message property)
  const translations: Record<string, string> = {
    "common.welcome": "Welcome to the application",
    "common.greeting": "Hello {{name}}, you have {{count}} messages",
    "common.singleParam": "Hello {{name}}",
    "common.multiParam": "{{greeting}} {{name}}, you have {{count}} items",
    "common.noInterpolation": "This has no parameters",
    "common.simple": "Simple translation string",
    "common.mixedBraces": "Wrong {format} and correct {{format}}",
    "common.nestedBraces": "Value: {{{{nested}}}}",
    "common.escapedBraces": "Literal \\{{value\\}}",
    "common.specialChars": "User: {{user}}, Email: {{email}}",
    "common.numeric": "Count: {{count}}, Price: ${{price}}",
    "common.emptyParam": "Value: {{value}}",
    "common.unicode": "Hello {{name}}, 你好 {{greeting}}",
  };

  const value = translations[key] || key;

  // Interpolate and return the string directly (i18next behavior without returnObjects)
  return interpolate(value, params);
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: mockI18n,
  }),
}));

describe("useTranslations Hook - Interpolation Focus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockI18n.language = "en";
  });

  describe("i18next {{xxx}} interpolation syntax", () => {
    it("should interpolate single parameter with {{param}} syntax", () => {
      const { result } = renderHook(() => useTranslations());
      const translation = result.current.t("common.singleParam", {
        name: "Alice",
      });

      expect(mockT).toHaveBeenCalledWith("common.singleParam", {
        name: "Alice",
      });
      expect(translation).toBe("Hello Alice");
    });

    it("should interpolate multiple parameters with {{param}} syntax", () => {
      const { result } = renderHook(() => useTranslations());
      const translation = result.current.t("common.multiParam", {
        greeting: "Hi",
        name: "Bob",
        count: 10,
      });

      expect(translation).toBe("Hi Bob, you have 10 items");
    });

    it("should handle numeric interpolation correctly", () => {
      const { result } = renderHook(() => useTranslations());
      const translation = result.current.t("common.numeric", {
        count: 42,
        price: 99.99,
      });

      expect(translation).toBe("Count: 42, Price: $99.99");
    });

    it("should handle zero as a valid parameter value", () => {
      const { result } = renderHook(() => useTranslations());
      const translation = result.current.t("common.numeric", {
        count: 0,
        price: 0,
      });

      expect(translation).toBe("Count: 0, Price: $0");
    });

    it("should handle negative numbers in interpolation", () => {
      const { result } = renderHook(() => useTranslations());
      const translation = result.current.t("common.numeric", {
        count: -5,
        price: -10.5,
      });

      expect(translation).toBe("Count: -5, Price: $-10.5");
    });

    it("should handle string interpolation with special characters", () => {
      const { result } = renderHook(() => useTranslations());
      const translation = result.current.t("common.specialChars", {
        user: "john@example.com",
        email: "test+tag@domain.co.uk",
      });

      expect(translation).toBe(
        "User: john@example.com, Email: test+tag@domain.co.uk",
      );
    });

    it("should handle unicode characters in interpolation", () => {
      const { result } = renderHook(() => useTranslations());
      const translation = result.current.t("common.unicode", {
        name: "Alice",
        greeting: "世界",
      });

      expect(translation).toBe("Hello Alice, 你好 世界");
    });

    it("should handle empty string as parameter value", () => {
      const { result } = renderHook(() => useTranslations());
      const translation = result.current.t("common.emptyParam", {
        value: "",
      });

      expect(translation).toBe("Value: ");
    });

    it("should preserve unmatched {{placeholders}} when parameter is missing", () => {
      const { result } = renderHook(() => useTranslations());
      const translation = result.current.t("common.greeting", {
        name: "Alice",
        // count parameter is missing
      });

      expect(translation).toBe("Hello Alice, you have {{count}} messages");
    });

    it("should handle translation without any interpolation", () => {
      const { result } = renderHook(() => useTranslations());
      const translation = result.current.t("common.noInterpolation");

      expect(translation).toBe("This has no parameters");
    });

    it("should handle translation when params object is empty", () => {
      const { result } = renderHook(() => useTranslations());
      const translation = result.current.t("common.singleParam", {});

      expect(translation).toBe("Hello {{name}}");
    });

    it("should not interpolate single braces {xxx} (wrong format)", () => {
      const { result } = renderHook(() => useTranslations());
      const translation = result.current.t("common.mixedBraces", {
        format: "TEST",
      });

      // Only {{format}} should be replaced, not {format}
      expect(translation).toBe("Wrong {format} and correct TEST");
    });

    it("should handle repeated placeholders", () => {
      const { result } = renderHook(() => useTranslations());

      // Mock a translation with repeated placeholder
      mockT.mockImplementationOnce((key: string, options?: any) => {
        const params = options || {};
        const value = "{{name}} says hello to {{name}}";
        return interpolate(value, params);
      });

      const translation = result.current.t("common.repeated", {
        name: "Alice",
      });

      expect(translation).toBe("Alice says hello to Alice");
    });

    it("should handle whitespace around parameter names", () => {
      const { result } = renderHook(() => useTranslations());

      // Mock a translation with whitespace
      mockT.mockReturnValueOnce("Value: {{ count }}");

      const translation = result.current.t("common.whitespace", {
        count: 5,
      });

      // i18next doesn't trim whitespace in placeholders
      expect(translation).toBe("Value: {{ count }}");
    });

    it("should handle case-sensitive parameter names", () => {
      const { result } = renderHook(() => useTranslations());

      mockT.mockImplementationOnce((key: string, options?: any) => {
        const params = options || {};
        const value = "{{Name}} vs {{name}}";
        return interpolate(value, params);
      });

      const translation = result.current.t("common.caseSensitive", {
        Name: "UPPERCASE",
        name: "lowercase",
      });

      expect(translation).toBe("UPPERCASE vs lowercase");
    });

    it("should handle parameters with underscores and numbers", () => {
      const { result } = renderHook(() => useTranslations());

      mockT.mockImplementationOnce((key: string, options?: any) => {
        const params = options || {};
        const value = "{{user_id}} - {{item_1}} - {{count2}}";
        return interpolate(value, params);
      });

      const translation = result.current.t("common.specialNames", {
        user_id: "12345",
        item_1: "First",
        count2: 99,
      });

      expect(translation).toBe("12345 - First - 99");
    });

    it("should handle very long parameter values", () => {
      const { result } = renderHook(() => useTranslations());
      const longValue = "A".repeat(1000);

      const translation = result.current.t("common.singleParam", {
        name: longValue,
      });

      expect(translation).toBe(`Hello ${longValue}`);
    });

    it("should handle HTML/XML-like content in parameters", () => {
      const { result } = renderHook(() => useTranslations());
      const translation = result.current.t("common.singleParam", {
        name: "<script>alert('xss')</script>",
      });

      expect(translation).toBe("Hello <script>alert('xss')</script>");
    });

    it("should handle parameters with quotes", () => {
      const { result } = renderHook(() => useTranslations());

      mockT.mockImplementationOnce((key: string, options?: any) => {
        const params = options || {};
        const value = 'Message: "{{text}}"';
        return interpolate(value, params);
      });

      const translation = result.current.t("common.quotes", {
        text: "Hello 'world'",
      });

      expect(translation).toBe("Message: \"Hello 'world'\"");
    });

    it("should handle parameters with backslashes", () => {
      const { result } = renderHook(() => useTranslations());
      const translation = result.current.t("common.singleParam", {
        name: "C:\\Users\\Admin",
      });

      expect(translation).toBe("Hello C:\\Users\\Admin");
    });
  });

  describe("Translation with interpolation", () => {
    it("should get string from i18next and interpolate", () => {
      const { result } = renderHook(() => useTranslations());
      const translation = result.current.t("common.greeting", {
        name: "John",
        count: 5,
      });

      // Should be interpolated by i18next
      expect(translation).toBe("Hello John, you have 5 messages");
    });

    it("should handle translation without interpolation", () => {
      const { result } = renderHook(() => useTranslations());
      const translation = result.current.t("common.welcome");

      expect(translation).toBe("Welcome to the application");
    });

    it("should pass parameters directly to i18next", () => {
      const { result } = renderHook(() => useTranslations());
      result.current.t("common.greeting", { name: "Alice", count: 3 });

      expect(mockT).toHaveBeenCalledWith("common.greeting", {
        name: "Alice",
        count: 3,
      });
    });
  });

  describe("Parameter passing to i18next", () => {
    it("should pass all parameters to i18next", () => {
      const { result } = renderHook(() => useTranslations());
      const params = {
        name: "Alice",
        count: 10,
      };

      result.current.t("common.greeting", params);

      expect(mockT).toHaveBeenCalledWith("common.greeting", params);
    });

    it("should pass undefined when no params provided", () => {
      const { result } = renderHook(() => useTranslations());
      result.current.t("common.welcome");

      expect(mockT).toHaveBeenCalledWith("common.welcome", undefined);
    });

    it("should pass parameters directly without modification", () => {
      const { result } = renderHook(() => useTranslations());
      result.current.t("common.greeting", {
        name: "Bob",
        count: 7,
      });

      const callArgs = mockT.mock.calls[0][1];
      expect(callArgs).toHaveProperty("name", "Bob");
      expect(callArgs).toHaveProperty("count", 7);
    });
  });

  describe("Edge cases with interpolation", () => {
    it("should handle consecutive placeholders", () => {
      const { result } = renderHook(() => useTranslations());

      mockT.mockImplementationOnce((key: string, options?: any) => {
        const params = options || {};
        const value = "{{first}}{{second}}{{third}}";
        return interpolate(value, params);
      });

      const translation = result.current.t("common.consecutive", {
        first: "A",
        second: "B",
        third: "C",
      });

      expect(translation).toBe("ABC");
    });

    it("should handle placeholder at start of string", () => {
      const { result } = renderHook(() => useTranslations());

      mockT.mockImplementationOnce((key: string, options?: any) => {
        const params = options || {};
        const value = "{{name}} is here";
        return interpolate(value, params);
      });

      const translation = result.current.t("common.start", {
        name: "Alice",
      });

      expect(translation).toBe("Alice is here");
    });

    it("should handle placeholder at end of string", () => {
      const { result } = renderHook(() => useTranslations());

      mockT.mockImplementationOnce((key: string, options?: any) => {
        const params = options || {};
        const value = "Welcome, {{name}}";
        return interpolate(value, params);
      });

      const translation = result.current.t("common.end", {
        name: "Bob",
      });

      expect(translation).toBe("Welcome, Bob");
    });

    it("should handle only placeholder as entire message", () => {
      const { result } = renderHook(() => useTranslations());

      mockT.mockImplementationOnce((key: string, options?: any) => {
        const params = options || {};
        const value = "{{value}}";
        return interpolate(value, params);
      });

      const translation = result.current.t("common.only", {
        value: "CONTENT",
      });

      expect(translation).toBe("CONTENT");
    });
  });

  describe("Return type verification", () => {
    it("should always return string type after interpolation", () => {
      const { result } = renderHook(() => useTranslations());

      const translation1 = result.current.t("common.greeting", {
        name: "Test",
        count: 1,
      });
      const translation2 = result.current.t("common.welcome");
      const translation3 = result.current.t("common.simple");

      expect(typeof translation1).toBe("string");
      expect(typeof translation2).toBe("string");
      expect(typeof translation3).toBe("string");
    });
  });
});
