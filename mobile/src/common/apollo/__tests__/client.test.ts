import { buildAuthHeaders } from "../auth-headers";

describe("Apollo authorization headers", () => {
  it("adds the token manager result without dropping operation headers", () => {
    expect(
      buildAuthHeaders({ "x-request-id": "request-1" }, "opaque-access"),
    ).toEqual({
      "x-request-id": "request-1",
      "x-app-id": "beancount-mobile",
      authorization: "Bearer opaque-access",
    });
  });

  it("does not create an authorization header for a signed-out request", () => {
    expect(buildAuthHeaders({}, undefined)).toEqual({
      "x-app-id": "beancount-mobile",
    });
  });
});
