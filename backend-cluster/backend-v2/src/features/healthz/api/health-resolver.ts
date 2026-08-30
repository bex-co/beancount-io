import { Query } from "type-graphql";
import { AllowAnonymous } from "@/server/graphql/authenticated";

export class HealthResolver {
  @AllowAnonymous()
  @Query(() => String, { description: "is the server healthy?" })
  async health(): Promise<string> {
    return "OK";
  }
}
