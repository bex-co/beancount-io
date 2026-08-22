import {
  renderPasswordResetHtml,
  renderPasswordResetText,
  type PasswordResetParams,
} from "../password-reset.template";
import {
  renderSignupOtpHtml,
  renderSignupOtpText,
  type SignupOtpParams,
} from "../signup-otp.template";

describe("Password Reset Email Template", () => {
  const validParams: PasswordResetParams = {
    resetLink: "https://dashboard.beancount.io/reset?token=abc123",
  };

  describe("renderPasswordResetHtml", () => {
    it("should include reset password heading", () => {
      const html = renderPasswordResetHtml(validParams);
      expect(html).toContain("Reset Your Password");
    });

    it("should include reset link button", () => {
      const html = renderPasswordResetHtml(validParams);
      expect(html).toContain(`href="${validParams.resetLink}"`);
      expect(html).toContain("Reset Password");
    });

    it("should include link in text for copy-paste", () => {
      const html = renderPasswordResetHtml(validParams);
      const linkCount = (
        html.match(
          new RegExp(
            validParams.resetLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "g",
          ),
        ) || []
      ).length;
      expect(linkCount).toBeGreaterThanOrEqual(2); // Button + plain text
    });

    it("should include security note", () => {
      const html = renderPasswordResetHtml(validParams);
      expect(html).toContain("Security Note");
      expect(html).toContain("This link will expire in 24 hours");
      expect(html).toContain("Don't share this link with anyone");
    });

    it("should include instructions", () => {
      const html = renderPasswordResetHtml(validParams);
      expect(html).toContain(
        "If you didn't make the request, just ignore this message",
      );
      expect(html).toContain(
        "If the button doesn't work, copy and paste this link into your browser",
      );
    });

    it("should reject javascript: protocol", () => {
      expect(() =>
        renderPasswordResetHtml({ resetLink: "javascript:alert('xss')" }),
      ).toThrow("Dangerous protocol detected");
    });

    it("should render complete HTML document", () => {
      const html = renderPasswordResetHtml(validParams);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain(
        "<title>Reset Your Password - Beancount.io</title>",
      );
    });
  });

  describe("renderPasswordResetText", () => {
    it("should render plain text without HTML", () => {
      const text = renderPasswordResetText(validParams);
      expect(text).not.toContain("<");
      expect(text).not.toContain(">");
    });

    it("should include reset password heading", () => {
      const text = renderPasswordResetText(validParams);
      expect(text).toContain("Reset Your Password");
    });

    it("should include reset link", () => {
      const text = renderPasswordResetText(validParams);
      expect(text).toContain(validParams.resetLink);
    });

    it("should include security note", () => {
      const text = renderPasswordResetText(validParams);
      expect(text).toContain("Security Note:");
      expect(text).toContain("This link will expire in 24 hours");
    });
  });
});

describe("Signup OTP Email Template", () => {
  const validParams: SignupOtpParams = {
    otp: "123456",
  };

  describe("renderSignupOtpHtml", () => {
    it("should include verify email heading", () => {
      const html = renderSignupOtpHtml(validParams);
      expect(html).toContain("Verify Your Email Address");
    });

    it("should display OTP code prominently", () => {
      const html = renderSignupOtpHtml(validParams);
      expect(html).toContain(validParams.otp);
      expect(html).toContain("Your Verification Code");
    });

    it("should include security note", () => {
      const html = renderSignupOtpHtml(validParams);
      expect(html).toContain("Security Note");
      expect(html).toContain("This code will expire in 10 minutes");
      expect(html).toContain("Don't share this code with anyone");
    });

    it("should include instructions", () => {
      const html = renderSignupOtpHtml(validParams);
      expect(html).toContain(
        "Enter this code in the signup form to complete your registration",
      );
    });

    it("should style OTP with monospace font", () => {
      const html = renderSignupOtpHtml(validParams);
      expect(html).toContain("font-family: monospace");
      expect(html).toContain("font-size: 32px");
      expect(html).toContain("letter-spacing: 8px");
    });

    it("should render complete HTML document", () => {
      const html = renderSignupOtpHtml(validParams);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<title>Verify Your Email - Beancount.io</title>");
    });

    it("should handle 6-digit OTP", () => {
      const html = renderSignupOtpHtml({ otp: "987654" });
      expect(html).toContain("987654");
    });

    it("should handle 4-digit OTP", () => {
      const html = renderSignupOtpHtml({ otp: "1234" });
      expect(html).toContain("1234");
    });
  });

  describe("renderSignupOtpText", () => {
    it("should render plain text without HTML", () => {
      const text = renderSignupOtpText(validParams);
      expect(text).not.toContain("<");
      expect(text).not.toContain(">");
    });

    it("should include verify email heading", () => {
      const text = renderSignupOtpText(validParams);
      expect(text).toContain("Verify Your Email Address");
    });

    it("should include OTP code", () => {
      const text = renderSignupOtpText(validParams);
      expect(text).toContain(`Your Verification Code: ${validParams.otp}`);
    });

    it("should include security note", () => {
      const text = renderSignupOtpText(validParams);
      expect(text).toContain("Security Note:");
      expect(text).toContain("This code will expire in 10 minutes");
    });

    it("should include instructions", () => {
      const text = renderSignupOtpText(validParams);
      expect(text).toContain(
        "Enter this code in the signup form to complete your registration",
      );
    });
  });
});
