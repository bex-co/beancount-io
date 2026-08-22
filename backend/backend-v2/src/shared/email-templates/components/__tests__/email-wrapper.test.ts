import { renderEmailWrapper, type EmailWrapperParams } from "../email-wrapper";

describe("Email Wrapper", () => {
  const defaultParams: EmailWrapperParams = {
    title: "Test Email",
    productName: "Beancount.io",
    content: "<p>Test content</p>",
  };

  describe("HTML structure", () => {
    it("should render complete HTML document with DOCTYPE", () => {
      const html = renderEmailWrapper(defaultParams);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html>");
      expect(html).toContain("</html>");
    });

    it("should include meta tags for charset and viewport", () => {
      const html = renderEmailWrapper(defaultParams);
      expect(html).toContain('<meta charset="utf-8">');
      expect(html).toContain(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      );
    });

    it("should include title tag with provided title", () => {
      const html = renderEmailWrapper(defaultParams);
      expect(html).toContain("<title>Test Email</title>");
    });

    it("should include responsive styles for mobile", () => {
      const html = renderEmailWrapper(defaultParams);
      expect(html).toContain("@media only screen and (max-width: 600px)");
      expect(html).toContain(".email-content { padding: 20px !important; }");
    });

    it("should include email-body styles", () => {
      const html = renderEmailWrapper(defaultParams);
      expect(html).toContain('class="email-body"');
      expect(html).toContain("font-family");
      expect(html).toContain("max-width: 600px");
    });

    it("should include email-content wrapper", () => {
      const html = renderEmailWrapper(defaultParams);
      expect(html).toContain('class="email-content"');
      expect(html).toContain("background: #ffffff");
    });
  });

  describe("content integration", () => {
    it("should include provided content in email body", () => {
      const html = renderEmailWrapper(defaultParams);
      expect(html).toContain("<p>Test content</p>");
    });

    it("should include header with product name", () => {
      const html = renderEmailWrapper(defaultParams);
      expect(html).toContain("Beancount.io");
      expect(html).toContain("<h1");
    });

    it("should include footer", () => {
      const html = renderEmailWrapper(defaultParams);
      expect(html).toContain("Powered by Beancount.io");
    });

    it("should accept custom footer params", () => {
      const html = renderEmailWrapper({
        ...defaultParams,
        footer: {
          includeUnsubscribe: true,
          unsubscribeUrl: "https://example.com/unsubscribe",
        },
      });
      // Footer is reserved for future use, but should not error
      expect(html).toBeDefined();
    });
  });

  describe("XSS prevention", () => {
    it("should escape HTML in title", () => {
      const html = renderEmailWrapper({
        ...defaultParams,
        title: "<script>alert('xss')</script>",
      });
      expect(html).toContain(
        "<title>&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;</title>",
      );
      expect(html).not.toContain("<script>alert('xss')</script>");
    });

    it("should escape HTML in productName", () => {
      const html = renderEmailWrapper({
        ...defaultParams,
        productName: "<img src=x onerror=alert('xss')>",
      });
      expect(html).toContain("&lt;img src=x onerror=alert(");
      expect(html).not.toContain("<img src=x");
    });

    it("should handle special characters in title", () => {
      const html = renderEmailWrapper({
        ...defaultParams,
        title: 'Test & Company\'s "Best" Product <2025>',
      });
      expect(html).toContain(
        "<title>Test &amp; Company&#039;s &quot;Best&quot; Product &lt;2025&gt;</title>",
      );
    });

    it("should handle special characters in productName", () => {
      const html = renderEmailWrapper({
        ...defaultParams,
        productName: "Bean & Count <Pro>",
      });
      expect(html).toContain("Bean &amp; Count &lt;Pro&gt;");
    });
  });

  describe("edge cases", () => {
    it("should handle empty content", () => {
      const html = renderEmailWrapper({
        ...defaultParams,
        content: "",
      });
      expect(html).toContain('class="email-content"');
      expect(html).toBeDefined();
    });

    it("should handle long content", () => {
      const longContent = "<p>Long content</p>".repeat(100);
      const html = renderEmailWrapper({
        ...defaultParams,
        content: longContent,
      });
      expect(html).toContain(longContent);
    });

    it("should handle content with nested HTML", () => {
      const html = renderEmailWrapper({
        ...defaultParams,
        content: "<div><p>Nested <strong>bold</strong> text</p></div>",
      });
      expect(html).toContain(
        "<div><p>Nested <strong>bold</strong> text</p></div>",
      );
    });

    it("should handle Unicode characters in title", () => {
      const html = renderEmailWrapper({
        ...defaultParams,
        title: "Welcome 欢迎 स्वागत है",
      });
      expect(html).toContain("Welcome 欢迎 स्वागत है");
    });

    it("should handle Unicode characters in productName", () => {
      const html = renderEmailWrapper({
        ...defaultParams,
        productName: "Beancount™ ©2025",
      });
      expect(html).toContain("Beancount™ ©2025");
    });
  });

  describe("output format", () => {
    it("should produce valid email-friendly HTML", () => {
      const html = renderEmailWrapper(defaultParams);
      // Email HTML should use inline styles
      expect(html).toContain("style=");
      // Should not use class-based styling for content (except container classes)
      expect(html.match(/background:/g)?.length).toBeGreaterThan(1);
    });

    it("should be trimmed (no leading/trailing whitespace)", () => {
      const html = renderEmailWrapper(defaultParams);
      expect(html).toBe(html.trim());
    });

    it("should contain all structural elements in correct order", () => {
      const html = renderEmailWrapper(defaultParams);
      const doctypeIndex = html.indexOf("<!DOCTYPE html>");
      const htmlIndex = html.indexOf("<html>");
      const headIndex = html.indexOf("<head>");
      const bodyIndex = html.indexOf("<body");
      const headerIndex = html.indexOf("<h1");
      const contentIndex = html.indexOf("Test content");
      const footerIndex = html.indexOf("Powered by");
      const bodyEndIndex = html.indexOf("</body>");
      const htmlEndIndex = html.indexOf("</html>");

      expect(doctypeIndex).toBeLessThan(htmlIndex);
      expect(htmlIndex).toBeLessThan(headIndex);
      expect(headIndex).toBeLessThan(bodyIndex);
      expect(bodyIndex).toBeLessThan(headerIndex);
      expect(headerIndex).toBeLessThan(contentIndex);
      expect(contentIndex).toBeLessThan(footerIndex);
      expect(footerIndex).toBeLessThan(bodyEndIndex);
      expect(bodyEndIndex).toBeLessThan(htmlEndIndex);
    });
  });
});
