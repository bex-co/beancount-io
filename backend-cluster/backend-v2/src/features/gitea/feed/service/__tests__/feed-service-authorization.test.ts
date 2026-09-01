import "reflect-metadata";
import { FeedService } from "../feed-service";
import {
  AUTHORIZATION_ACTIONS,
  userResource,
} from "@/server/api/authorization";
import { createMockContext } from "./test-fixtures";

describe("FeedService authorization", () => {
  it("authorizes the stable self resource before any feed source work", async () => {
    const identity = createMockContext().getCurrentIdentity();
    const authorizeOrThrow = jest.fn().mockRejectedValue(new Error("denied"));
    const getById = jest.fn();
    const service = new FeedService(
      {} as never,
      {} as never,
      {} as never,
      { user: { getById } } as never,
      {} as never,
      { authorizeOrThrow } as never,
    );

    await expect(
      service.getFeed({ offset: 0, limit: 10 }, identity),
    ).rejects.toThrow("denied");
    expect(authorizeOrThrow).toHaveBeenCalledWith({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.USER_SOCIAL_FEED_READ,
      resource: userResource(identity.userId),
    });
    expect(getById).not.toHaveBeenCalled();
  });
});
