import { renderEmailHeader } from "../email-header";
import { renderEmailFooter, type EmailFooterParams } from "../email-footer";
import { EMAIL_THEME } from "../email-theme";

describe("Email Components", () => {
  describe("renderEmailHeader", () => {
    it("should render header with product name", () => {
      const html = renderEmailHeader("Beancount.io");
      expect(html).toContain("Beancount.io");
      expect(html).toContain("<h1");
      expect(html).toContain("</h1>");
    });

    it("should apply correct styles", () => {
      const html = renderEmailHeader("Test Product");
      expect(html).toContain("text-align: center");
      expect(html).toContain("font-weight: 700");
      expect(html).toContain(`background-color: ${EMAIL_THEME.light.card}`);
      expect(html).toContain(`background-color: ${EMAIL_THEME.light.primary}`);
    });

    it("should escape HTML in product name", () => {
      const html = renderEmailHeader("<script>alert('xss')</script>");
      expect(html).toContain(
        "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;",
      );
      expect(html).not.toContain("<script>");
    });

    it("should handle special characters", () => {
      const html = renderEmailHeader('Test & Co "Best" <2025>');
      expect(html).toContain("Test &amp; Co &quot;Best&quot; &lt;2025&gt;");
    });

    it("should handle Unicode characters", () => {
      const html = renderEmailHeader("Welcome 欢迎");
      expect(html).toContain("Welcome 欢迎");
    });

    it("should handle empty string", () => {
      const html = renderEmailHeader("");
      expect(html).toBeDefined();
      expect(html).toContain("<h1");
    });
  });

  describe("renderEmailFooter", () => {
    it("should render footer with default params", () => {
      const html = renderEmailFooter();
      expect(html).toContain("Powered by Beancount.io");
    });

    it("should handle empty params object", () => {
      const html = renderEmailFooter({});
      expect(html).toContain("Powered by Beancount.io");
    });

    it("should accept includeUnsubscribe param (reserved for future)", () => {
      const params: EmailFooterParams = {
        includeUnsubscribe: true,
      };
      const html = renderEmailFooter(params);
      expect(html).toBeDefined();
      expect(html).toContain("Powered by");
    });

    it("should accept unsubscribeUrl param (reserved for future)", () => {
      const params: EmailFooterParams = {
        unsubscribeUrl: "https://example.com/unsubscribe",
      };
      const html = renderEmailFooter(params);
      expect(html).toBeDefined();
    });

    it("should accept isTransactional param (reserved for future)", () => {
      const params: EmailFooterParams = {
        isTransactional: true,
      };
      const html = renderEmailFooter(params);
      expect(html).toBeDefined();
    });

    it("should accept all params together", () => {
      const params: EmailFooterParams = {
        includeUnsubscribe: true,
        unsubscribeUrl: "https://example.com/unsubscribe",
        isTransactional: false,
      };
      const html = renderEmailFooter(params);
      expect(html).toBeDefined();
      expect(html).toContain("Powered by");
    });

    it("should apply correct styles", () => {
      const html = renderEmailFooter();
      expect(html).toContain("text-align: center");
      expect(html).toContain(`background-color: ${EMAIL_THEME.light.muted}`);
      expect(html).toContain(`color: ${EMAIL_THEME.light.mutedForeground}`);
    });
  });
});
