import sendgrid from "@sendgrid/mail";
import { ServiceUnavailableError } from "@/shared/errors";
import { ConsoleSendGrid, SendGrid } from "../sendgrid";

jest.mock("@sendgrid/mail", () => ({
  __esModule: true,
  default: {
    setApiKey: jest.fn(),
    setTimeout: jest.fn(),
    send: jest.fn(async () => undefined),
  },
}));

const send = sendgrid.send as jest.Mock;
const opts = { apiKey: "SG.test", retryLimit: 1 };

describe("SendGrid", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    send.mockClear();
  });

  describe("sendMail", () => {
    it("sends the mail in its unsubscribe group", async () => {
      await new SendGrid(opts).sendMail({
        to: "a@example.com",
        subject: "s",
        text: "t",
        asm: { groupId: 42 },
      });

      expect(send.mock.calls[0][0].asm).toEqual({ groupId: 42 });
    });

    it("leaves the request unchanged without a group", async () => {
      await new SendGrid(opts).sendMail({ to: "a@example.com", text: "t" });

      expect(send.mock.calls[0][0]).not.toHaveProperty("asm");
    });
  });

  describe("isSuppressed", () => {
    const respond = (response: Partial<Response> | Error) => {
      const fetchMock = jest.fn(async () => {
        if (response instanceof Error) throw response;
        return response as Response;
      });
      global.fetch = fetchMock as unknown as typeof fetch;
      return fetchMock;
    };

    it("finds the address in the group, ignoring case", async () => {
      const fetchMock = respond({
        ok: true,
        json: async () => ["A@Example.com"],
      });

      await expect(
        new SendGrid(opts).isSuppressed("a@example.com", 42),
      ).resolves.toBe(true);
      const [url, init] = fetchMock.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      expect(url).toBe(
        "https://api.sendgrid.com/v3/asm/groups/42/suppressions/search",
      );
      expect(JSON.parse(init.body as string)).toEqual({
        recipient_emails: ["a@example.com"],
      });
    });

    it("answers false for an address still in the group", async () => {
      respond({ ok: true, json: async () => [] });

      await expect(
        new SendGrid(opts).isSuppressed("a@example.com", 42),
      ).resolves.toBe(false);
    });

    it.each([
      ["an error status", { ok: false, status: 500 }],
      ["a network failure", new Error("socket hang up")],
    ])("fails rather than guess on %s", async (_label, response) => {
      respond(response);

      await expect(
        new SendGrid(opts).isSuppressed("a@example.com", 42),
      ).rejects.toBeInstanceOf(ServiceUnavailableError);
    });
  });

  it("treats nobody as suppressed in development", async () => {
    await expect(new ConsoleSendGrid(opts).isSuppressed()).resolves.toBe(false);
  });
});
