import { bannedUserMessage, welcomeMailLinks } from "../deployment-copy";

const dashboard = { url: "https://books.example.com/" };
const withMail = {
  dashboard,
  env: "production" as const,
  sendGrid: { apiKey: "SG.key" } as never,
};

describe("bannedUserMessage", () => {
  it("names the managed support channel on the managed service", () => {
    expect(bannedUserMessage(false)).toBe(
      "User is banned. If you need help, please contact https://beancount.io/tg.",
    );
  });

  it("names the operator, not beancount.io, on a self-hosted stack", () => {
    const message = bannedUserMessage(true);
    expect(message).toContain("the person who runs this server");
    expect(message).not.toContain("beancount.io");
  });
});

describe("welcomeMailLinks", () => {
  it("keeps the managed service's links whatever its mail setup", () => {
    expect(welcomeMailLinks({ dashboard }, false)).toEqual({
      dashboardUrl: "https://beancount.io/ledger",
      mobileAppUrl: "http://onelink.to/v3rz2v",
      helpCenterUrl: "https://beancount.io/docs/help-center",
    });
  });

  it("sends none from a self-hosted stack that cannot deliver mail", () => {
    expect(welcomeMailLinks({ dashboard }, true)).toBeNull();
    expect(
      welcomeMailLinks(
        { ...withMail, sendGrid: { apiKey: "" } as never },
        true,
      ),
    ).toBeNull();
    expect(
      welcomeMailLinks({ ...withMail, env: "development" as never }, true),
    ).toBeNull();
  });

  it("points a self-hosted stack's dashboard link at its own address", () => {
    expect(welcomeMailLinks(withMail, true)?.dashboardUrl).toBe(
      "https://books.example.com/ledger",
    );
  });
});
