import {
  Args,
  ArgsType,
  Authorized,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
} from "type-graphql";
import { IContext } from "@/server/graphql/context";
import type { ICliAuthService } from "@/features/auth/service/cli-auth-service";
import type { CliAuthSessionStatus } from "@/features/auth/data/cli-auth-session-model/types";

export enum CliAuthStatus {
  PENDING = "PENDING",
  AUTHORIZED = "AUTHORIZED",
  DENIED = "DENIED",
  EXPIRED = "EXPIRED",
  CONSUMED = "CONSUMED",
}

registerEnumType(CliAuthStatus, {
  name: "CliAuthStatus",
  description: "Status of a CLI authentication session",
});

@ObjectType()
class CreateCliAuthSessionResponse {
  @Field(() => String)
  sessionId: string;

  @Field(() => String)
  expiresAt: string;
}

@ObjectType()
class ConfirmCliAuthSessionResponse {
  @Field(() => Boolean)
  success: boolean;
}

@ObjectType()
class DenyCliAuthSessionResponse {
  @Field(() => Boolean)
  success: boolean;
}

@ObjectType()
class GetCliAuthSessionResponse {
  @Field(() => CliAuthStatus)
  status: CliAuthStatus;
}

@ObjectType()
class ConsumeCliAuthSessionResponse {
  @Field(() => String)
  token: string;

  @Field(() => String)
  expireAt: string;
}

@ArgsType()
class CliAuthSessionInput {
  @Field(() => String)
  sessionId: string;
}

/** Map the persisted session status to the GraphQL enum. */
const STATUS_TO_GRAPHQL: Record<CliAuthSessionStatus, CliAuthStatus> = {
  pending: CliAuthStatus.PENDING,
  denied: CliAuthStatus.DENIED,
  authorized: CliAuthStatus.AUTHORIZED,
  consumed: CliAuthStatus.CONSUMED,
};

export class CliAuthResolver {
  constructor(private readonly cliAuthService: ICliAuthService) {}

  @Mutation(() => CreateCliAuthSessionResponse, {
    description:
      "Initiate a CLI authentication session. Returns a sessionId the CLI uses to poll for completion.",
  })
  public async createCliAuthSession(): Promise<CreateCliAuthSessionResponse> {
    return this.cliAuthService.createSession();
  }

  @Authorized()
  @Mutation(() => ConfirmCliAuthSessionResponse, {
    description:
      "Authorize a pending CLI session. Issues a JWT token for the CLI and stores it in the session.",
  })
  public async confirmCliAuthSession(
    @Ctx() ctx: IContext,
    @Args() args: CliAuthSessionInput,
  ): Promise<ConfirmCliAuthSessionResponse> {
    await this.cliAuthService.authorizeSession(
      args.sessionId,
      ctx.getCurrentUserId(),
    );
    return { success: true };
  }

  @Authorized()
  @Mutation(() => DenyCliAuthSessionResponse, {
    description: "Deny a pending CLI authentication session.",
  })
  public async denyCliAuthSession(
    @Args() args: CliAuthSessionInput,
  ): Promise<DenyCliAuthSessionResponse> {
    await this.cliAuthService.denySession(args.sessionId);
    return { success: true };
  }

  @Query(() => GetCliAuthSessionResponse, {
    description:
      "Poll the status of a CLI authentication session. When AUTHORIZED, returns the token stored in the session.",
  })
  public async getCliAuthSession(
    @Args() args: CliAuthSessionInput,
  ): Promise<GetCliAuthSessionResponse> {
    const status = await this.cliAuthService.getSessionStatus(args.sessionId);

    // A missing session is treated as expired.
    return {
      status: status ? STATUS_TO_GRAPHQL[status] : CliAuthStatus.EXPIRED,
    };
  }

  @Mutation(() => ConsumeCliAuthSessionResponse, {
    description:
      "Retrieve and consume the token from an authorized CLI auth session. Single-use: clears the token from the session after returning it. Only the CLI should call this.",
  })
  public async consumeCliAuthSession(
    @Args() args: CliAuthSessionInput,
  ): Promise<ConsumeCliAuthSessionResponse> {
    return this.cliAuthService.consumeSession(args.sessionId);
  }
}
