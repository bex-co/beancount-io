import {
  renderWelcomeHtml,
  renderWelcomeText,
  type WelcomeParams,
} from "../welcome.template";
import { EMAIL_THEME } from "../../components/email-theme";

describe("Welcome Email Template", () => {
  const validParams: WelcomeParams = {
    dashboardUrl: "https://dashboard.beancount.io",
    mobileAppUrl: "https://app.beancount.io",
    helpCenterUrl: "https://beancount.io/docs/help-center",
  };

  const validParamsWithName: WelcomeParams = {
    ...validParams,
    firstName: "Alice",
  };

  describe("renderWelcomeHtml", () => {
    describe("required elements", () => {
      it("should include generic welcome heading when no firstName", () => {
        const html = renderWelcomeHtml(validParams);
        expect(html).toContain("Welcome to Beancount.io!");
      });

      it("should include personalized greeting when firstName is provided", () => {
        const html = renderWelcomeHtml(validParamsWithName);
        expect(html).toContain("Welcome, Alice!");
      });

      it("should escape firstName to prevent XSS", () => {
        const html = renderWelcomeHtml({
          ...validParams,
          firstName: '<script>alert("xss")</script>',
        });
        expect(html).not.toContain("<script>");
        expect(html).toContain("&lt;script&gt;");
      });

      it("should include primary CTA button with dashboard URL", () => {
        const html = renderWelcomeHtml(validParams);
        expect(html).toContain(`href="${validParams.dashboardUrl}"`);
        expect(html).toContain("Open Your Dashboard");
      });

      it("should include action-oriented intro text", () => {
        const html = renderWelcomeHtml(validParams);
        expect(html).toContain(
          "Start tracking your finances in under 2 minutes",
        );
      });

      it("should include mobile app link with correct URL", () => {
        const html = renderWelcomeHtml(validParams);
        expect(html).toContain(`href="${validParams.mobileAppUrl}"`);
        expect(html).toContain("Download Mobile App");
      });

      it("should include help center link with correct URL", () => {
        const html = renderWelcomeHtml(validParams);
        expect(html).toContain(`href="${validParams.helpCenterUrl}"`);
        expect(html).toContain("Help Center");
      });

      it("should include link descriptions", () => {
        const html = renderWelcomeHtml(validParams);
        expect(html).toContain("Track your finances on the go");
        expect(html).toContain("Guides and tutorials to get you started");
      });

      it("should include closing message", () => {
        const html = renderWelcomeHtml(validParams);
        expect(html).toContain("Happy accounting!");
      });
    });

    describe("HTML structure", () => {
      it("should render complete HTML document", () => {
        const html = renderWelcomeHtml(validParams);
        expect(html).toContain("<!DOCTYPE html>");
        expect(html).toContain("<html>");
        expect(html).toContain("</html>");
      });

      it("should include proper title", () => {
        const html = renderWelcomeHtml(validParams);
        expect(html).toContain("<title>Welcome to Beancount.io!</title>");
      });

      it("should use email-friendly table layout for links", () => {
        const html = renderWelcomeHtml(validParams);
        expect(html).toContain("<table");
        expect(html).toContain("width: 100%");
        expect(html).toContain("border-collapse: collapse");
      });

      it("should apply proper styling to links", () => {
        const html = renderWelcomeHtml(validParams);
        expect(html).toContain(`color: ${EMAIL_THEME.light.primary}`);
        expect(html).toContain('class="email-link"');
        expect(html).toContain("text-decoration: underline");
        expect(html).toContain("font-weight: 600");
      });

      it("should include a prominent CTA button", () => {
        const html = renderWelcomeHtml(validParams);
        expect(html).toContain("display: inline-block");
        expect(html).toContain(
          `background-color: ${EMAIL_THEME.light.primary}`,
        );
        expect(html).toContain(`color: ${EMAIL_THEME.light.primaryForeground}`);
        expect(html).toContain("border-radius: 8px");
      });

      it("should include header with product name", () => {
        const html = renderWelcomeHtml(validParams);
        expect(html).toContain("<h1");
        expect(html).toContain("Beancount.io");
      });

      it("should include footer", () => {
        const html = renderWelcomeHtml(validParams);
        expect(html).toContain("Powered by Beancount.io");
      });
    });

    describe("XSS prevention", () => {
      it("should reject javascript: protocol in dashboardUrl", () => {
        expect(() =>
          renderWelcomeHtml({
            ...validParams,
            dashboardUrl: "javascript:alert('xss')",
          }),
        ).toThrow("Dangerous protocol detected");
      });

      it("should reject javascript: protocol in mobileAppUrl", () => {
        expect(() =>
          renderWelcomeHtml({
            ...validParams,
            mobileAppUrl: "javascript:alert('xss')",
          }),
        ).toThrow("Dangerous protocol detected");
      });

      it("should reject data: protocol in dashboardUrl", () => {
        expect(() =>
          renderWelcomeHtml({
            ...validParams,
            dashboardUrl: "data:text/html,<script>alert('xss')</script>",
          }),
        ).toThrow("Dangerous protocol detected");
      });

      it("should reject vbscript: protocol", () => {
        expect(() =>
          renderWelcomeHtml({
            ...validParams,
            dashboardUrl: "vbscript:msgbox('xss')",
          }),
        ).toThrow("Dangerous protocol detected");
      });

      it("should reject file: protocol", () => {
        expect(() =>
          renderWelcomeHtml({
            ...validParams,
            dashboardUrl: "file:///etc/passwd",
          }),
        ).toThrow('Protocol "file:" is not allowed');
      });

      it("should reject relative URLs", () => {
        expect(() =>
          renderWelcomeHtml({
            ...validParams,
            dashboardUrl: "/dashboard",
          }),
        ).toThrow("is not a valid absolute URL");
      });

      it("should reject malformed URLs", () => {
        expect(() =>
          renderWelcomeHtml({
            ...validParams,
            dashboardUrl: "not a url",
          }),
        ).toThrow("is not a valid absolute URL");
      });
    });

    describe("valid URL variations", () => {
      it("should accept http URLs", () => {
        const html = renderWelcomeHtml({
          ...validParams,
          dashboardUrl: "http://localhost:3000/dashboard",
          mobileAppUrl: "http://localhost:3001/app",
        });
        expect(html).toContain("http://localhost:3000/dashboard");
        expect(html).toContain("http://localhost:3001/app");
      });

      it("should accept URLs with query parameters", () => {
        const html = renderWelcomeHtml({
          ...validParams,
          dashboardUrl: "https://dashboard.beancount.io?welcome=true&user=123",
          mobileAppUrl: "https://app.beancount.io?platform=ios",
        });
        // Note: Template literals don't HTML-escape, so & remains as-is in href attributes
        expect(html).toContain("welcome=true&user=123");
        expect(html).toContain("platform=ios");
      });

      it("should accept URLs with fragments", () => {
        const html = renderWelcomeHtml({
          ...validParams,
          dashboardUrl: "https://dashboard.beancount.io#getting-started",
          mobileAppUrl: "https://app.beancount.io#download",
        });
        expect(html).toContain("#getting-started");
        expect(html).toContain("#download");
      });

      it("should accept URLs with ports", () => {
        const html = renderWelcomeHtml({
          ...validParams,
          dashboardUrl: "https://dashboard.beancount.io:8080/",
          mobileAppUrl: "https://app.beancount.io:9000/",
        });
        expect(html).toContain(":8080");
        expect(html).toContain(":9000");
      });

      it("should trim whitespace from URLs", () => {
        const html = renderWelcomeHtml({
          ...validParams,
          dashboardUrl: "  https://dashboard.beancount.io  ",
          mobileAppUrl: "  https://app.beancount.io  ",
        });
        expect(html).toContain("https://dashboard.beancount.io");
        expect(html).toContain("https://app.beancount.io");
        expect(html).not.toContain('"  https://');
      });
    });

    describe("edge cases", () => {
      it("should handle very long URLs", () => {
        const longUrl = `https://dashboard.beancount.io/${"param=value&".repeat(50)}`;
        const html = renderWelcomeHtml({
          ...validParams,
          dashboardUrl: longUrl,
        });
        expect(html).toContain("dashboard.beancount.io");
      });

      it("should handle URLs with special characters (encoded)", () => {
        const html = renderWelcomeHtml({
          ...validParams,
          dashboardUrl: "https://dashboard.beancount.io?name=John%20Doe",
          mobileAppUrl: "https://app.beancount.io?email=user%40example.com",
        });
        expect(html).toContain("name=John%20Doe");
        expect(html).toContain("email=user%40example.com");
      });
    });
  });

  describe("renderWelcomeText", () => {
    it("should render plain text version without HTML", () => {
      const text = renderWelcomeText(validParams);
      expect(text).not.toContain("<");
      expect(text).not.toContain(">");
      expect(text).not.toContain("&lt;");
      expect(text).not.toContain("&gt;");
    });

    it("should include generic welcome when no firstName", () => {
      const text = renderWelcomeText(validParams);
      expect(text).toContain("Welcome to Beancount.io!");
    });

    it("should include personalized greeting when firstName is provided", () => {
      const text = renderWelcomeText(validParamsWithName);
      expect(text).toContain("Welcome, Alice!");
    });

    it("should include product name header", () => {
      const text = renderWelcomeText(validParams);
      expect(text).toContain("Beancount.io");
      expect(text).toContain("================");
    });

    it("should include all URLs", () => {
      const text = renderWelcomeText(validParams);
      expect(text).toContain(validParams.dashboardUrl);
      expect(text).toContain(validParams.mobileAppUrl);
      expect(text).toContain(validParams.helpCenterUrl);
    });

    it("should include link descriptions", () => {
      const text = renderWelcomeText(validParams);
      expect(text).toContain("Track your finances on the go");
      expect(text).toContain("Guides and tutorials to get you started");
    });

    it("should include action-oriented intro", () => {
      const text = renderWelcomeText(validParams);
      expect(text).toContain("Start tracking your finances in under 2 minutes");
    });

    it("should include closing message", () => {
      const text = renderWelcomeText(validParams);
      expect(text).toContain("Happy accounting!");
    });

    it("should include footer", () => {
      const text = renderWelcomeText(validParams);
      expect(text).toContain("Powered by Beancount.io");
    });

    it("should be well-formatted with line breaks", () => {
      const text = renderWelcomeText(validParams);
      const lines = text.split("\n");
      expect(lines.length).toBeGreaterThan(10);
    });

    it("should not have leading or trailing whitespace", () => {
      const text = renderWelcomeText(validParams);
      expect(text).toBe(text.trim());
    });

    it("should include dashboard as primary link", () => {
      const text = renderWelcomeText(validParams);
      expect(text).toContain("Open Your Dashboard:");
    });

    it("should use bullet points or dashes for secondary links", () => {
      const text = renderWelcomeText(validParams);
      expect(text).toContain("- Download Mobile App:");
      expect(text).toContain("- Help Center:");
    });
  });
});
