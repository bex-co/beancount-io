import { Query } from "type-graphql";

export class HealthResolver {
  @Query(() => String, { description: "is the server healthy?" })
  async health(): Promise<string> {
    return "OK";
  }
}
