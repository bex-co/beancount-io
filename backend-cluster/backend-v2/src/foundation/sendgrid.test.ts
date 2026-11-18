import { SendGrid, ConsoleSendGrid } from "./sendgrid";
import { logger } from "@/shared/logger";
import sendgrid from "@sendgrid/mail";
import type { MailService as MailServiceInstance } from "@sendgrid/mail";
import type { Client as SendGridClient } from "@sendgrid/client";
import { ServiceUnavailableError } from "@/shared/errors";

jest.mock("@sendgrid/mail");
jest.mock("@/shared/logger", () => {
  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    child: jest.fn(),
  };
  logger.child.mockReturnValue(logger);
  return { logger };
});

describe("SendGrid", () => {
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend = jest.fn();
    (sendgrid.send as jest.Mock) = mockSend;
    (sendgrid.setApiKey as jest.Mock) = jest.fn();
    (sendgrid.setTimeout as jest.Mock) = jest.fn();
  });

  afterEach(() => jest.restoreAllMocks());

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
      expect(sendgrid.setTimeout).toHaveBeenCalledWith(10_000);
    });

    it("applies the 10-second timeout to every real provider request and keeps the retry count", async () => {
      const { MailService } = jest.requireActual<{
        MailService: new () => MailServiceInstance;
      }>("@sendgrid/mail");
      const { Client } = jest.requireActual<{
        Client: new () => SendGridClient;
      }>("@sendgrid/client");
      const client = new Client();
      const sdk = new MailService();
      sdk.setClient(client);
      (sendgrid.setApiKey as jest.Mock).mockImplementation((apiKey: string) =>
        sdk.setApiKey(apiKey),
      );
      (sendgrid.setTimeout as jest.Mock).mockImplementation((timeout: number) =>
        sdk.setTimeout(timeout),
      );
      mockSend.mockImplementation((data) => sdk.send(data));
      const requests: unknown[] = [];
      const transport = jest
        .spyOn(client, "request")
        .mockImplementation(async (data) => {
          requests.push(client.createRequest(data));
          throw Object.assign(new Error("synthetic provider timeout"), {
            code: "ETIMEDOUT",
          });
        });
      const sg = new SendGrid({
        apiKey: "SG.synthetic-api-key",
        retryLimit: 2,
      });

      await expect(
        sg.sendMail({ to: "synthetic@example.com", text: "synthetic message" }),
      ).rejects.toBeInstanceOf(ServiceUnavailableError);

      expect(transport).toHaveBeenCalledTimes(2);
      expect(requests).toEqual([
        expect.objectContaining({ timeout: 10_000 }),
        expect.objectContaining({ timeout: 10_000 }),
      ]);
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
      expect(logger.error).toHaveBeenCalledWith("Email delivery failed", {
        operation: "sendMail",
        errorCategory: "MAIL_PROVIDER_FAILURE",
      });
    });

    it("should retry up to retryLimit and throw error after all retries fail", async () => {
      const sg = new SendGrid({
        apiKey: "test-key",
        retryLimit: 2,
      });

      const error = new Error("Persistent error");
      mockSend.mockRejectedValue(error);

      await expect(sg.sendMail(mailData)).rejects.toBeInstanceOf(
        ServiceUnavailableError,
      );

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
  });

  it("does not expose provider errors, recipients, credentials or message content", async () => {
    const operation = "sendMail";
    const secret = "synthetic-private-reset-token";
    const providerError = Object.assign(new Error(secret), {
      name: secret,
      response: { body: { errors: [{ message: secret }] } },
      request: { headers: { authorization: secret }, body: { to: secret } },
    });
    mockSend.mockRejectedValue(providerError);
    const sg = new SendGrid({ apiKey: secret, retryLimit: 2 });
    const failure = await sg
      .sendMail({
        to: `${secret}@example.com`,
        from: `${secret}@example.org`,
        subject: secret,
        html: secret,
        text: secret,
      })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ServiceUnavailableError);
    expect(failure).toMatchObject({
      category: "SERVICE_UNAVAILABLE",
      metadata: { service: "Email delivery", retryAfter: 5 },
    });
    expect(JSON.stringify(failure)).not.toContain(secret);
    expect((failure as Error).message).not.toContain(secret);
    expect((failure as Error).stack).not.toContain(secret);
    expect((failure as { cause?: unknown }).cause).toBeUndefined();
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect((logger.error as jest.Mock).mock.calls).toEqual([
      [
        "Email delivery failed",
        { operation, errorCategory: "MAIL_PROVIDER_FAILURE" },
      ],
      [
        "Email delivery failed",
        { operation, errorCategory: "MAIL_PROVIDER_FAILURE" },
      ],
    ]);
    expect(
      JSON.stringify((logger.error as jest.Mock).mock.calls),
    ).not.toContain(secret);
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

  it("logs only the recipient count, including for OTP and reset messages", async () => {
    const secret = "synthetic-private-otp-reset-token";
    const sg = new ConsoleSendGrid({
      apiKey: secret,
      retryLimit: 3,
      defaultFrom: `${secret}@example.org`,
    });
    jest.clearAllMocks();

    await sg.sendMail({
      to: [`${secret}@example.com`, "other@example.com"],
      from: `${secret}@example.org`,
      subject: secret,
      html: `<a href="${secret}">${secret}</a>`,
      text: secret,
    });

    expect((logger.debug as jest.Mock).mock.calls).toEqual([
      [
        "Email delivery suppressed in development",
        { operation: "sendMail", recipientCount: 2 },
      ],
    ]);
    expect(
      JSON.stringify((logger.debug as jest.Mock).mock.calls),
    ).not.toContain(secret);
    expect(sendgrid.send).not.toHaveBeenCalled();
  });

  it("counts a single recipient without logging the address", async () => {
    const sg = new ConsoleSendGrid({ apiKey: "synthetic-key", retryLimit: 2 });

    await sg.sendMail({ to: "synthetic@example.com", text: "private content" });

    expect(logger.debug).toHaveBeenLastCalledWith(
      "Email delivery suppressed in development",
      { operation: "sendMail", recipientCount: 1 },
    );
  });
});
