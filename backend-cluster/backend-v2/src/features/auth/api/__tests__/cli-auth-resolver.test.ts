import "reflect-metadata";
import { CliAuthResolver } from "../cli-auth-resolver";
import type { ICliAuthService } from "@/features/auth/service/cli-auth-service";
import type { Identity } from "@/server/api/identity";
import type { IContext } from "@/server/graphql/context";

const identity: Identity = {
  userId: "user-1",
  method: "session",
  scopes: new Set(),
  capabilityExempt: true,
};

describe("CliAuthResolver", () => {
  let resolver: CliAuthResolver;
  let service: jest.Mocked<ICliAuthService>;
  let context: IContext;

  beforeEach(() => {
    service = {
      createSession: jest.fn(),
      authorizeSession: jest.fn(),
      denySession: jest.fn(),
      getSessionStatus: jest.fn(),
      consumeSession: jest.fn(),
    };
    context = {
      getCurrentIdentity: jest.fn().mockReturnValue(identity),
    } as unknown as IContext;
    resolver = new CliAuthResolver(service);
  });

  it("passes the resolved identity to the approval service", async () => {
    await resolver.confirmCliAuthSession(context, {
      sessionId: "cli-session-1",
    });

    expect(context.getCurrentIdentity).toHaveBeenCalledTimes(1);
    expect(service.authorizeSession).toHaveBeenCalledWith(
      "cli-session-1",
      identity,
    );
  });

  it("passes the resolved identity to the denial service", async () => {
    await resolver.denyCliAuthSession(context, {
      sessionId: "cli-session-1",
    });

    expect(context.getCurrentIdentity).toHaveBeenCalledTimes(1);
    expect(service.denySession).toHaveBeenCalledWith("cli-session-1", identity);
  });
});
