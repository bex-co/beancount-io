import {
  Args,
  ArgsType,
  Ctx,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
} from "type-graphql";
import { AllowAnonymous, Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import type { ICliAuthService } from "@/features/auth/service/cli-auth-service";
import type { CliAuthSessionStatus } from "@/features/auth/data/cli-auth-session-model/types";

enum CliAuthStatus {
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

@InputType()
class CliAuthClientInfoInput {
  @Field(() => String, {
    nullable: true,
    description: "Client name, e.g. `beancount-cli`.",
  })
  name?: string;

  @Field(() => String, { nullable: true })
  version?: string;

  @Field(() => String, {
    nullable: true,
    description: "Machine name the client runs on.",
  })
  deviceLabel?: string;

  @Field(() => String, { nullable: true })
  platform?: string;
}

@ObjectType({
  description:
    "How the requesting device describes itself. Self-reported and unverified: show it so a person can recognize their own terminal, never treat it as evidence.",
})
class CliAuthClientInfoType {
  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  version?: string;

  @Field(() => String, { nullable: true })
  deviceLabel?: string;

  @Field(() => String, { nullable: true })
  platform?: string;

  @Field(() => String, {
    nullable: true,
    description: "Forwarded address seen when the request was made.",
  })
  ipAddress?: string;
}

@ObjectType()
class CreateCliAuthSessionResponse {
  @Field(() => String, {
    description:
      "The CLI's private verifier. Keep it in the process; never put it in a URL, a log, or the browser.",
  })
  deviceCode: string;

  @Field(() => String, {
    description:
      "Short code to display so the person can enter it in the browser.",
  })
  userCode: string;

  @Field(() => String)
  expiresAt: string;

  @Field(() => Int, {
    description: "Seconds the CLI should wait between status polls.",
  })
  pollIntervalSeconds: number;
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

@ObjectType()
class GetCliAuthRequestResponse {
  @Field(() => CliAuthStatus)
  status: CliAuthStatus;

  @Field(() => CliAuthClientInfoType)
  client: CliAuthClientInfoType;

  @Field(() => String)
  requestedAt: string;

  @Field(() => String)
  expiresAt: string;
}

@ArgsType()
class CliAuthDeviceCodeInput {
  @Field(() => String)
  deviceCode: string;
}

@ArgsType()
class CliAuthUserCodeInput {
  @Field(() => String)
  userCode: string;
}

@ArgsType()
class CreateCliAuthSessionInput {
  @Field(() => CliAuthClientInfoInput, { nullable: true })
  client?: CliAuthClientInfoInput;
}

/** Map the persisted session status to the GraphQL enum. */
const STATUS_TO_GRAPHQL: Record<CliAuthSessionStatus, CliAuthStatus> = {
  pending: CliAuthStatus.PENDING,
  denied: CliAuthStatus.DENIED,
  authorized: CliAuthStatus.AUTHORIZED,
  consumed: CliAuthStatus.CONSUMED,
};

/**
 * Transport for the device-authorization ceremony. Two audiences, two
 * credentials, and they never cross: the CLI's operations take the device code
 * it holds privately, the browser's take the short code a person typed. Nothing
 * the browser can see appears in an argument that returns a token.
 */
export class CliAuthResolver {
  constructor(private readonly cliAuthService: ICliAuthService) {}

  @AllowAnonymous()
  @Mutation(() => CreateCliAuthSessionResponse, {
    description:
      "Initiate a CLI authentication session. Returns the device code the CLI polls with and the user code to display for the person to enter in the browser.",
  })
  public async createCliAuthSession(
    @Ctx() ctx: IContext,
    @Args() args: CreateCliAuthSessionInput,
  ): Promise<CreateCliAuthSessionResponse> {
    return this.cliAuthService.createSession(
      args.client ?? {},
      forwardedIp(ctx),
    );
  }

  @Authenticated()
  @Query(() => GetCliAuthRequestResponse, {
    description:
      "Describe the CLI authentication request a user code names, so the consent screen can show who is asking before anyone approves.",
  })
  public async getCliAuthRequest(
    @Ctx() ctx: IContext,
    @Args() args: CliAuthUserCodeInput,
  ): Promise<GetCliAuthRequestResponse> {
    const request = await this.cliAuthService.describeRequest(
      args.userCode,
      ctx.getCurrentIdentity(),
    );

    return {
      status: STATUS_TO_GRAPHQL[request.status],
      client: request.client,
      requestedAt: request.requestedAt,
      expiresAt: request.expiresAt,
    };
  }

  @Authenticated()
  @Mutation(() => ConfirmCliAuthSessionResponse, {
    description:
      "Authorize the pending CLI session a user code names. Issues a JWT for the CLI and stores it for the matching device code to collect.",
  })
  public async confirmCliAuthSession(
    @Ctx() ctx: IContext,
    @Args() args: CliAuthUserCodeInput,
  ): Promise<ConfirmCliAuthSessionResponse> {
    await this.cliAuthService.authorizeSession(
      args.userCode,
      ctx.getCurrentIdentity(),
    );
    return { success: true };
  }

  @Authenticated()
  @Mutation(() => DenyCliAuthSessionResponse, {
    description:
      "Deny the pending CLI authentication request a user code names.",
  })
  public async denyCliAuthSession(
    @Ctx() ctx: IContext,
    @Args() args: CliAuthUserCodeInput,
  ): Promise<DenyCliAuthSessionResponse> {
    await this.cliAuthService.denySession(
      args.userCode,
      ctx.getCurrentIdentity(),
    );
    return { success: true };
  }

  @AllowAnonymous()
  @Query(() => GetCliAuthSessionResponse, {
    description:
      "Poll the status of a CLI authentication session. Only the initiating CLI can call this: it takes the device code, which never leaves that process.",
  })
  public async getCliAuthSession(
    @Args() args: CliAuthDeviceCodeInput,
  ): Promise<GetCliAuthSessionResponse> {
    const status = await this.cliAuthService.getSessionStatus(args.deviceCode);

    // A missing session and an unrecognized device code are the same answer.
    return {
      status: status ? STATUS_TO_GRAPHQL[status] : CliAuthStatus.EXPIRED,
    };
  }

  @AllowAnonymous()
  @Mutation(() => ConsumeCliAuthSessionResponse, {
    description:
      "Retrieve and consume the token from an authorized CLI auth session. Single-use, and only redeemable by the device code the session was created with.",
  })
  public async consumeCliAuthSession(
    @Args() args: CliAuthDeviceCodeInput,
  ): Promise<ConsumeCliAuthSessionResponse> {
    return this.cliAuthService.consumeSession(args.deviceCode);
  }
}

/**
 * Best-effort address of the requesting device, for display on the consent
 * screen. Client-controlled (2026 security review, finding 7), so it is shown
 * as a hint and never used to decide anything.
 */
function forwardedIp(ctx: IContext): string | undefined {
  return (
    ctx.reqHeaders?.["x-forwarded-for"]?.split(",")[0]?.trim() || undefined
  );
}
