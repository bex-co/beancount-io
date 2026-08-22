import { validateEmailUrl, escapeHtml } from "../url-validator";

describe("URL Validator", () => {
  describe("validateEmailUrl", () => {
    describe("valid URLs", () => {
      it("should accept https URLs", () => {
        const url = "https://example.com/path";
        expect(validateEmailUrl(url)).toBe(url);
      });

      it("should accept http URLs", () => {
        const url = "http://example.com/path";
        expect(validateEmailUrl(url)).toBe(url);
      });

      it("should accept mailto URLs", () => {
        const url = "mailto:user@example.com";
        expect(validateEmailUrl(url)).toBe(url);
      });

      it("should accept URLs with query parameters", () => {
        const url = "https://example.com/path?param=value&other=123";
        expect(validateEmailUrl(url)).toBe(url);
      });

      it("should accept URLs with fragments", () => {
        const url = "https://example.com/path#section";
        expect(validateEmailUrl(url)).toBe(url);
      });

      it("should accept URLs with ports", () => {
        const url = "https://example.com:8080/path";
        expect(validateEmailUrl(url)).toBe(url);
      });

      it("should trim whitespace from URLs", () => {
        const url = "  https://example.com/path  ";
        expect(validateEmailUrl(url)).toBe("https://example.com/path");
      });
    });

    describe("XSS prevention", () => {
      it("should reject javascript: protocol", () => {
        expect(() => validateEmailUrl("javascript:alert('xss')")).toThrow(
          "Dangerous protocol detected",
        );
      });

      it("should reject javascript: with uppercase", () => {
        expect(() => validateEmailUrl("JAVASCRIPT:alert('xss')")).toThrow(
          "Dangerous protocol detected",
        );
      });

      it("should reject javascript: with mixed case", () => {
        expect(() => validateEmailUrl("JaVaScRiPt:alert('xss')")).toThrow(
          "Dangerous protocol detected",
        );
      });

      it("should reject data: protocol", () => {
        expect(() =>
          validateEmailUrl("data:text/html,<script>alert('xss')</script>"),
        ).toThrow("Dangerous protocol detected");
      });

      it("should reject vbscript: protocol", () => {
        expect(() => validateEmailUrl("vbscript:msgbox('xss')")).toThrow(
          "Dangerous protocol detected",
        );
      });

      it("should reject file: protocol", () => {
        expect(() => validateEmailUrl("file:///etc/passwd")).toThrow(
          'Protocol "file:" is not allowed',
        );
      });

      it("should reject ftp: protocol", () => {
        expect(() => validateEmailUrl("ftp://example.com/file")).toThrow(
          'Protocol "ftp:" is not allowed',
        );
      });
    });

    describe("invalid inputs", () => {
      it("should reject empty string", () => {
        expect(() => validateEmailUrl("")).toThrow(
          "Invalid URL: URL must be a non-empty string",
        );
      });

      it("should reject null", () => {
        expect(() => validateEmailUrl(null as unknown as string)).toThrow(
          "Invalid URL: URL must be a non-empty string",
        );
      });

      it("should reject undefined", () => {
        expect(() => validateEmailUrl(undefined as unknown as string)).toThrow(
          "Invalid URL: URL must be a non-empty string",
        );
      });

      it("should reject non-string values", () => {
        expect(() => validateEmailUrl(123 as unknown as string)).toThrow(
          "Invalid URL: URL must be a non-empty string",
        );
      });

      it("should reject relative URLs", () => {
        expect(() => validateEmailUrl("/path/to/page")).toThrow(
          "is not a valid absolute URL",
        );
      });

      it("should reject malformed URLs", () => {
        expect(() => validateEmailUrl("not a url at all")).toThrow(
          "is not a valid absolute URL",
        );
      });

      it("should reject URLs with only whitespace", () => {
        expect(() => validateEmailUrl("   ")).toThrow(
          "is not a valid absolute URL",
        );
      });
    });
  });

  describe("escapeHtml", () => {
    it("should escape ampersands", () => {
      expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
    });

    it("should escape less than", () => {
      expect(escapeHtml("5 < 10")).toBe("5 &lt; 10");
    });

    it("should escape greater than", () => {
      expect(escapeHtml("10 > 5")).toBe("10 &gt; 5");
    });

    it("should escape double quotes", () => {
      expect(escapeHtml('Say "Hello"')).toBe("Say &quot;Hello&quot;");
    });

    it("should escape single quotes", () => {
      expect(escapeHtml("It's mine")).toBe("It&#039;s mine");
    });

    it("should escape HTML tags", () => {
      expect(escapeHtml("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;",
      );
    });

    it("should escape multiple special characters", () => {
      expect(escapeHtml("<a href=\"javascript:alert('xss')\">")).toBe(
        "&lt;a href=&quot;javascript:alert(&#039;xss&#039;)&quot;&gt;",
      );
    });

    it("should handle empty string", () => {
      expect(escapeHtml("")).toBe("");
    });

    it("should handle null", () => {
      expect(escapeHtml(null as unknown as string)).toBe("");
    });

    it("should handle undefined", () => {
      expect(escapeHtml(undefined as unknown as string)).toBe("");
    });

    it("should not double-escape", () => {
      const escaped = escapeHtml("Tom & Jerry");
      expect(escapeHtml(escaped)).toBe("Tom &amp;amp; Jerry");
    });

    it("should handle text without special characters", () => {
      expect(escapeHtml("Hello World")).toBe("Hello World");
    });
  });
});
