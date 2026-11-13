import sendgrid from "@sendgrid/mail";
import { SendGrid } from "../sendgrid";

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
  afterEach(() => send.mockClear());

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
});
