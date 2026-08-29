import { print } from "graphql";
import { describe, expect, it } from "vitest";
import {
  ApiKeysDocument,
  CreateApiKeyDocument,
  RevokeApiKeyDocument,
} from "@/graphql/definitions";

describe("personal access token GraphQL custody", () => {
  it("requests plaintext only from the fresh create response", () => {
    expect(print(ApiKeysDocument)).not.toContain("plaintext");
    expect(print(RevokeApiKeyDocument)).not.toContain("plaintext");
    expect(print(CreateApiKeyDocument)).toContain("plaintext");
  });
});
