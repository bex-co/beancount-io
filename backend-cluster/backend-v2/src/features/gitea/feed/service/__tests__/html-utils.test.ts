import { stripHtml } from "../html-utils";

describe("stripHtml", () => {
  it("should remove HTML tags from string", () => {
    const html = "<p>Hello <strong>world</strong></p>";
    const result = stripHtml(html);
    expect(result).toBe("Hello world");
  });

  it("should handle empty string", () => {
    const result = stripHtml("");
    expect(result).toBe("");
  });

  it("should handle string without HTML tags", () => {
    const text = "Plain text without tags";
    const result = stripHtml(text);
    expect(result).toBe("Plain text without tags");
  });

  it("should trim whitespace", () => {
    const html = "  <p>Content</p>  ";
    const result = stripHtml(html);
    expect(result).toBe("Content");
  });

  it("should limit to 200 characters", () => {
    const longText =
      "a".repeat(250) + " more text that should be truncated completely";
    const html = `<div>${longText}</div>`;
    const result = stripHtml(html);
    expect(result).toHaveLength(203); // 200 + "..."
    expect(result.endsWith("...")).toBe(true);
  });

  it("should not truncate text under 200 characters", () => {
    const shortText = "a".repeat(150);
    const html = `<p>${shortText}</p>`;
    const result = stripHtml(html);
    expect(result).toBe(shortText);
    expect(result).not.toContain("...");
  });

  it("should handle nested HTML tags", () => {
    const html =
      "<div><p>Paragraph with <em>emphasis</em> and <strong>bold</strong></p></div>";
    const result = stripHtml(html);
    expect(result).toBe("Paragraph with emphasis and bold");
  });

  it("should handle self-closing tags", () => {
    const html = "<p>Line 1<br/>Line 2<br />Line 3</p>";
    const result = stripHtml(html);
    expect(result).toBe("Line 1Line 2Line 3");
  });

  it("should handle HTML entities (not decode them)", () => {
    const html = "<p>&lt;tag&gt; &amp; &quot;text&quot;</p>";
    const result = stripHtml(html);
    expect(result).toBe("&lt;tag&gt; &amp; &quot;text&quot;");
  });

  describe("aggressive mode", () => {
    it("should normalize whitespace when aggressive is true", () => {
      const html = "<p>Text   with    multiple     spaces</p>";
      const result = stripHtml(html, true);
      expect(result).toBe("Text with multiple spaces");
    });

    it("should normalize newlines when aggressive is true", () => {
      const html = "<p>Line 1\n\nLine 2\n\n\nLine 3</p>";
      const result = stripHtml(html, true);
      expect(result).toBe("Line 1 Line 2 Line 3");
    });

    it("should normalize tabs when aggressive is true", () => {
      const html = "<p>Text\t\twith\t\t\ttabs</p>";
      const result = stripHtml(html, true);
      expect(result).toBe("Text with tabs");
    });

    it("should not normalize whitespace when aggressive is false", () => {
      const html = "<p>Text   with    spaces</p>";
      const result = stripHtml(html, false);
      expect(result).toBe("Text   with    spaces");
    });

    it("should normalize mixed whitespace characters when aggressive is true", () => {
      const html = "<div>Text \n with \t mixed   \r\n whitespace</div>";
      const result = stripHtml(html, true);
      expect(result).toBe("Text with mixed whitespace");
    });

    it("should still limit to 200 characters in aggressive mode", () => {
      const longText = "word ".repeat(50); // Creates 250 characters
      const html = `<p>${longText}</p>`;
      const result = stripHtml(html, true);
      expect(result).toHaveLength(203); // 200 + "..."
      expect(result.endsWith("...")).toBe(true);
    });
  });

  it("should handle malformed HTML gracefully", () => {
    const html = "<p>Unclosed tag <strong>bold text";
    const result = stripHtml(html);
    expect(result).toBe("Unclosed tag bold text");
  });

  it("should handle HTML with attributes", () => {
    const html =
      '<p class="test" id="para">Text with <a href="/link">link</a></p>';
    const result = stripHtml(html);
    expect(result).toBe("Text with link");
  });

  it("should handle script and style tags", () => {
    const html =
      "<div><script>alert('test')</script><p>Content</p><style>.class { color: red; }</style></div>";
    const result = stripHtml(html);
    expect(result).toBe("alert('test')Content.class { color: red; }");
  });

  it("should handle HTML comments", () => {
    const html = "<p>Text<!-- comment -->More text</p>";
    const result = stripHtml(html);
    // Comments are treated as tags and removed
    expect(result).toBe("TextMore text");
  });
});
