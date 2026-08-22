import {
  Arg,
  Args,
  ArgsType,
  Authorized,
  Ctx,
  Field,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { IContext } from "@/server/graphql/context";
import type { ILedgerCollaboratorsWorkflow } from "@/features/ledger/workflow/ledger-collaborators-workflow";

@ObjectType()
class User {
  @Field(() => Number, { nullable: true })
  id?: number;

  @Field(() => String, { nullable: true })
  login?: string;

  @Field(() => String, { nullable: true })
  fullName?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => Boolean, { nullable: true })
  active?: boolean;

  @Field(() => Boolean, { nullable: true })
  isAdmin?: boolean;

  @Field(() => String, { nullable: true })
  created?: string;

  @Field(() => String, { nullable: true })
  lastLogin?: string;
}

@ObjectType()
class LedgerCollaborator {
  @Field(() => String, { nullable: true })
  permission?: string;

  @Field(() => String, { nullable: true })
  roleName?: string;

  @Field(() => User, { nullable: true })
  user?: User;
}

@ArgsType()
class PaginationArgs {
  @Field(() => Number, { nullable: true })
  page?: number;

  @Field(() => Number, { nullable: true })
  limit?: number;
}

@ArgsType()
class GetCollaboratorPermissionArgs {
  @Field(() => String)
  ledgerId: string;

  @Field(() => String)
  collaborator: string;
}

@ObjectType()
class CollaboratorUser extends User {
  @Field(() => String, { nullable: true })
  permission?: "read" | "write" | "admin";
}

@Resolver(() => CollaboratorUser)
export class LedgerCollaboratorsQueryResolver {
  constructor(
    private readonly collaboratorsWorkflow: ILedgerCollaboratorsWorkflow,
  ) {}

  @Query(() => [CollaboratorUser])
  @Authorized()
  async listLedgerCollaborators(
    @Arg("ledgerId") ledgerId: string,
    @Args() { page, limit }: PaginationArgs,
    @Ctx() ctx: IContext,
  ): Promise<CollaboratorUser[]> {
    return this.collaboratorsWorkflow.listCollaborators({
      userId: ctx.getCurrentUserId(),
      ledgerId,
      page,
      limit,
    });
  }

  @Query(() => LedgerCollaborator)
  @Authorized()
  async getLedgerCollaboratorPermission(
    @Args() { ledgerId, collaborator }: GetCollaboratorPermissionArgs,
    @Ctx() ctx: IContext,
  ): Promise<LedgerCollaborator> {
    return this.collaboratorsWorkflow.getCollaboratorPermission({
      userId: ctx.getCurrentUserId(),
      ledgerId,
      collaborator,
    });
  }
}
