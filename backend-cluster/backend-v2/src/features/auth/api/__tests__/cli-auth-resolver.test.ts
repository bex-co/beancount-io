import "reflect-metadata";
import { CliAuthResolver } from "../cli-auth-resolver";
import type { ICliAuthService } from "@/features/auth/service/cli-auth-service";
import type { Identity } from "@/server/api/identity";
import type { IContext } from "@/server/graphql/context";

const identity: Identity = {
  userId: "user-1",
  method: "session",
  scopes: new Set(),
};

const USER_CODE = "BCDF-GHJK";

describe("CliAuthResolver", () => {
  let resolver: CliAuthResolver;
  let service: jest.Mocked<ICliAuthService>;
  let context: IContext;

  beforeEach(() => {
    service = {
      createSession: jest.fn(),
      describeRequest: jest.fn(),
      authorizeSession: jest.fn(),
      denySession: jest.fn(),
      getSessionStatus: jest.fn(),
      consumeSession: jest.fn(),
    };
    context = {
      getCurrentIdentity: jest.fn().mockReturnValue(identity),
      reqHeaders: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    } as unknown as IContext;
    resolver = new CliAuthResolver(service);
  });

  it("passes the reported client and the forwarded address to the service", async () => {
    await resolver.createCliAuthSession(context, {
      client: { name: "beancount-cli", version: "0.4.1" },
    });

    expect(service.createSession).toHaveBeenCalledWith(
      { name: "beancount-cli", version: "0.4.1" },
      "203.0.113.7",
    );
  });

  it("starts a session for a client that reports nothing about itself", async () => {
    await resolver.createCliAuthSession(
      { reqHeaders: {} } as unknown as IContext,
      {},
    );

    expect(service.createSession).toHaveBeenCalledWith({}, undefined);
  });

  it("passes the resolved identity to the approval service", async () => {
    await resolver.confirmCliAuthSession(context, { userCode: USER_CODE });

    expect(context.getCurrentIdentity).toHaveBeenCalledTimes(1);
    expect(service.authorizeSession).toHaveBeenCalledWith(USER_CODE, identity);
  });

  it("passes the resolved identity to the denial service", async () => {
    await resolver.denyCliAuthSession(context, { userCode: USER_CODE });

    expect(context.getCurrentIdentity).toHaveBeenCalledTimes(1);
    expect(service.denySession).toHaveBeenCalledWith(USER_CODE, identity);
  });

  it("describes a request for the consent screen under the caller's identity", async () => {
    service.describeRequest.mockResolvedValue({
      status: "pending",
      client: { name: "beancount-cli", deviceLabel: "tian-mbp" },
      requestedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:10:00.000Z",
    });

    const result = await resolver.getCliAuthRequest(context, {
      userCode: USER_CODE,
    });

    expect(service.describeRequest).toHaveBeenCalledWith(USER_CODE, identity);
    expect(result.status).toBe("PENDING");
    expect(result.client.deviceLabel).toBe("tian-mbp");
  });

  it("polls status with the device code, and reports an unknown one as expired", async () => {
    service.getSessionStatus.mockResolvedValue(null);

    const result = await resolver.getCliAuthSession({
      deviceCode: "device-code",
    });

    expect(service.getSessionStatus).toHaveBeenCalledWith("device-code");
    expect(result.status).toBe("EXPIRED");
  });

  it("redeems with the device code", async () => {
    service.consumeSession.mockResolvedValue({
      token: "jwt-token",
      expireAt: "2026-01-31T00:00:00.000Z",
    });

    const result = await resolver.consumeCliAuthSession({
      deviceCode: "device-code",
    });

    expect(service.consumeSession).toHaveBeenCalledWith("device-code");
    expect(result.token).toBe("jwt-token");
  });
});
