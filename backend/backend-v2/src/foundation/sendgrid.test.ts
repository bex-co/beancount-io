import { SendGrid, ConsoleSendGrid } from "./sendgrid";
import { logger } from "@/shared/logger";
import sendgrid from "@sendgrid/mail";

jest.mock("@sendgrid/mail");
jest.mock("@/shared/logger", () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("SendGrid", () => {
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend = jest.fn();
    (sendgrid.send as jest.Mock) = mockSend;
    (sendgrid.setApiKey as jest.Mock) = jest.fn();
  });

  describe("constructor", () => {
    it("should initialize with API key", () => {
      const opts = {
        apiKey: "test-api-key",
        retryLimit: 3,
        defaultFrom: "default@example.com",
      };

      const sg = new SendGrid(opts);

      expect(sg.opts).toEqual(opts);
      expect(sendgrid.setApiKey).toHaveBeenCalledWith("test-api-key");
    });
  });

  describe("sendMail", () => {
    const mailData = {
      to: "recipient@example.com",
      subject: "Test Subject",
      html: "<p>Test content</p>",
    };

    it("should successfully send email on first attempt", async () => {
      const sg = new SendGrid({
        apiKey: "test-key",
        retryLimit: 3,
      });

      mockSend.mockResolvedValue([{ statusCode: 202 }]);

      await sg.sendMail(mailData);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "recipient@example.com",
          subject: "Test Subject",
          html: "<p>Test content</p>",
          from: "noreply@mail.beancount.io",
        }),
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("should use custom from address when provided", async () => {
      const sg = new SendGrid({
        apiKey: "test-key",
        retryLimit: 3,
      });

      mockSend.mockResolvedValue([{ statusCode: 202 }]);

      await sg.sendMail({
        ...mailData,
        from: "custom@example.com",
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "custom@example.com",
        }),
      );
    });

    it("should use defaultFrom from options when no from is provided", async () => {
      const sg = new SendGrid({
        apiKey: "test-key",
        retryLimit: 3,
        defaultFrom: "default@example.com",
      });

      mockSend.mockResolvedValue([{ statusCode: 202 }]);

      await sg.sendMail(mailData);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "default@example.com",
        }),
      );
    });

    it("should retry and succeed on second attempt", async () => {
      const sg = new SendGrid({
        apiKey: "test-key",
        retryLimit: 3,
      });

      const error = new Error("Network error");
      mockSend
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce([{ statusCode: 202 }]);

      await sg.sendMail(mailData);

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        `failed to SendGrid.sendMail: ${error}`,
      );
    });

    it("should retry up to retryLimit and throw error after all retries fail", async () => {
      const sg = new SendGrid({
        apiKey: "test-key",
        retryLimit: 2,
      });

      const error = new Error("Persistent error");
      mockSend.mockRejectedValue(error);

      await expect(sg.sendMail(mailData)).rejects.toThrow("Persistent error");

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple recipients", async () => {
      const sg = new SendGrid({
        apiKey: "test-key",
        retryLimit: 3,
      });

      mockSend.mockResolvedValue([{ statusCode: 202 }]);

      await sg.sendMail({
        ...mailData,
        to: ["recipient1@example.com", "recipient2@example.com"],
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["recipient1@example.com", "recipient2@example.com"],
        }),
      );
    });

    it("should send template ID when provided", async () => {
      const sg = new SendGrid({
        apiKey: "test-key",
        retryLimit: 3,
      });

      mockSend.mockResolvedValue([{ statusCode: 202 }]);

      await sg.sendMail({
        to: "recipient@example.com",
        templateId: "d-123456789",
        dynamicTemplateData: { name: "John" },
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: "d-123456789",
          dynamicTemplateData: { name: "John" },
        }),
      );
    });
  });

  describe("sendTemplate", () => {
    it("should successfully send template email", async () => {
      const sg = new SendGrid({
        apiKey: "test-key",
        retryLimit: 3,
      });

      mockSend.mockResolvedValue([{ statusCode: 202 }]);

      await sg.sendTemplate({
        to: "recipient@example.com",
        templateId: "d-123456789",
        dynamicTemplateData: { name: "John", date: "2024-01-01" },
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "recipient@example.com",
          from: "noreply@mail.beancount.io",
          templateId: "d-123456789",
          dynamicTemplateData: { name: "John", date: "2024-01-01" },
        }),
      );
    });

    it("should use custom from address in template email", async () => {
      const sg = new SendGrid({
        apiKey: "test-key",
        retryLimit: 3,
      });

      mockSend.mockResolvedValue([{ statusCode: 202 }]);

      await sg.sendTemplate({
        to: "recipient@example.com",
        templateId: "d-123456789",
        dynamicTemplateData: { name: "John" },
        from: "custom@example.com",
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "custom@example.com",
        }),
      );
    });

    it("should retry and succeed on second attempt", async () => {
      const sg = new SendGrid({
        apiKey: "test-key",
        retryLimit: 3,
      });

      const error = new Error("Network error");
      mockSend
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce([{ statusCode: 202 }]);

      await sg.sendTemplate({
        to: "recipient@example.com",
        templateId: "d-123456789",
        dynamicTemplateData: { name: "John" },
      });

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        `failed to SendGrid.sendTemplate: ${error}`,
      );
    });

    it("should throw error after all retries fail", async () => {
      const sg = new SendGrid({
        apiKey: "test-key",
        retryLimit: 2,
      });

      const error = new Error("Persistent error");
      mockSend.mockRejectedValue(error);

      await expect(
        sg.sendTemplate({
          to: "recipient@example.com",
          templateId: "d-123456789",
          dynamicTemplateData: { name: "John" },
        }),
      ).rejects.toThrow("Persistent error");

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledTimes(2);
    });
  });
});

describe("ConsoleSendGrid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize and log message", () => {
      const opts = {
        apiKey: "test-key",
        retryLimit: 3,
      };

      const sg = new ConsoleSendGrid(opts);

      expect(sg.opts).toEqual(opts);
      expect(logger.debug).toHaveBeenCalledWith(
        "ConsoleSendGrid initialized for development environment",
      );
    });
  });

  describe("sendMail", () => {
    it("should log mail data without sending", async () => {
      const sg = new ConsoleSendGrid({
        apiKey: "test-key",
        retryLimit: 3,
      });

      await sg.sendMail({
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>This is a test email with some content</p>",
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "ConsoleSendGrid.sendMail called with data:",
        expect.objectContaining({
          to: "recipient@example.com",
          from: "noreply@mail.beancount.io",
          subject: "Test Subject",
          html: "<p>This is a test email with some content</p>",
        }),
      );
    });

    it("should log full HTML content without truncation", async () => {
      const sg = new ConsoleSendGrid({
        apiKey: "test-key",
        retryLimit: 3,
      });

      const longHtml = "a".repeat(200);

      await sg.sendMail({
        to: "recipient@example.com",
        subject: "Test",
        html: longHtml,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "ConsoleSendGrid.sendMail called with data:",
        expect.objectContaining({
          html: longHtml,
        }),
      );
    });

    it("should use custom from address", async () => {
      const sg = new ConsoleSendGrid({
        apiKey: "test-key",
        retryLimit: 3,
        defaultFrom: "default@example.com",
      });

      await sg.sendMail({
        to: "recipient@example.com",
        subject: "Test",
        text: "Test content",
        from: "custom@example.com",
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "ConsoleSendGrid.sendMail called with data:",
        expect.objectContaining({
          from: "custom@example.com",
        }),
      );
    });
  });

  describe("sendTemplate", () => {
    it("should log template data without sending", async () => {
      const sg = new ConsoleSendGrid({
        apiKey: "test-key",
        retryLimit: 3,
      });

      await sg.sendTemplate({
        to: "recipient@example.com",
        templateId: "d-123456789",
        dynamicTemplateData: { name: "John", date: "2024-01-01" },
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "ConsoleSendGrid.sendTemplate called with data:",
        expect.objectContaining({
          to: "recipient@example.com",
          from: "noreply@mail.beancount.io",
          templateId: "d-123456789",
          dynamicTemplateData: { name: "John", date: "2024-01-01" },
        }),
      );
    });
  });
});
