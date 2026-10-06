import { graphQLErrorCodes } from "../graphql-error-codes";

describe("graphQLErrorCodes", () => {
  it("collects every string code an Apollo error carries", () => {
    expect(
      graphQLErrorCodes({
        graphQLErrors: [
          { extensions: { code: "CONFLICT" } },
          { extensions: {} },
          { extensions: { code: 409 } },
          { extensions: { code: "FORBIDDEN" } },
        ],
      }),
    ).toEqual(["CONFLICT", "FORBIDDEN"]);
  });

  it("is empty for anything that isn't a GraphQL error", () => {
    expect(graphQLErrorCodes(new Error("Network request failed"))).toEqual([]);
    expect(graphQLErrorCodes({ graphQLErrors: "nope" })).toEqual([]);
    expect(graphQLErrorCodes(null)).toEqual([]);
    expect(graphQLErrorCodes("CONFLICT")).toEqual([]);
  });
});
