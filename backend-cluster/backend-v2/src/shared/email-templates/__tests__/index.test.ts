import * as EmailTemplates from "../index";

describe("Email Templates Index", () => {
  // No export-existence tests: every render function below is called, so a
  // removed export already fails its execution test (and typechecking).

  describe("function execution", () => {
    it("renderWelcomeHtml should work", () => {
      const html = EmailTemplates.renderWelcomeHtml({
        dashboardUrl: "https://dashboard.beancount.io",
        mobileAppUrl: "https://app.beancount.io",
        helpCenterUrl: "https://beancount.io/docs/help-center",
      });
      expect(html).toContain("Welcome to Beancount.io!");
      expect(html).toContain("<!DOCTYPE html>");
    });

    it("renderWelcomeText should work", () => {
      const text = EmailTemplates.renderWelcomeText({
        dashboardUrl: "https://dashboard.beancount.io",
        mobileAppUrl: "https://app.beancount.io",
        helpCenterUrl: "https://beancount.io/docs/help-center",
      });
      expect(text).toContain("Welcome to Beancount.io!");
      expect(text).not.toContain("<");
    });

    it("renderPasswordResetHtml should work", () => {
      const html = EmailTemplates.renderPasswordResetHtml({
        resetLink: "https://dashboard.beancount.io/reset?token=abc123",
      });
      expect(html).toContain("Reset Your Password");
      expect(html).toContain("<!DOCTYPE html>");
    });

    it("renderPasswordResetText should work", () => {
      const text = EmailTemplates.renderPasswordResetText({
        resetLink: "https://dashboard.beancount.io/reset?token=abc123",
      });
      expect(text).toContain("Reset Your Password");
      expect(text).not.toContain("<");
    });

    it("renderSignupOtpHtml should work", () => {
      const html = EmailTemplates.renderSignupOtpHtml({
        otp: "123456",
      });
      expect(html).toContain("Verify Your Email Address");
      expect(html).toContain("123456");
      expect(html).toContain("<!DOCTYPE html>");
    });

    it("renderSignupOtpText should work", () => {
      const text = EmailTemplates.renderSignupOtpText({
        otp: "123456",
      });
      expect(text).toContain("Verify Your Email Address");
      expect(text).toContain("123456");
      expect(text).not.toContain("<");
    });
  });
});
