import {
  Args,
  ArgsType,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Resolver,
} from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import type { ILedgerCollaboratorsWorkflow } from "@/features/ledger/workflow/ledger-collaborators-workflow";

@ArgsType()
class AddCollaboratorArgs {
  @Field(() => String)
  ledgerId: string;

  @Field(() => String)
  collaborator: string;

  @Field(() => String, { nullable: true })
  permission?: "read" | "write" | "admin";
}

@ArgsType()
class DeleteCollaboratorArgs {
  @Field(() => String)
  ledgerId: string;

  @Field(() => String)
  collaborator: string;
}

@ArgsType()
class LeaveLedgerArgs {
  @Field(() => String)
  ledgerId: string;
}

@ObjectType()
class AddCollaboratorResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  message?: string;
}

@ObjectType()
class DeleteCollaboratorResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  message?: string;
}

@Resolver()
export class LedgerCollaboratorsMutationResolver {
  constructor(
    private readonly collaboratorsWorkflow: ILedgerCollaboratorsWorkflow,
  ) {}

  @Mutation(() => AddCollaboratorResponse)
  @Authenticated()
  async addOrUpdateLedgerCollaborator(
    @Args() { ledgerId, collaborator, permission }: AddCollaboratorArgs,
    @Ctx() ctx: IContext,
  ): Promise<AddCollaboratorResponse> {
    return this.collaboratorsWorkflow.addOrUpdateCollaborator({
      userId: ctx.getCurrentUserId(),
      ledgerId,
      collaborator,
      permission,
    });
  }

  @Mutation(() => DeleteCollaboratorResponse)
  @Authenticated()
  async deleteLedgerCollaborator(
    @Args() { ledgerId, collaborator }: DeleteCollaboratorArgs,
    @Ctx() ctx: IContext,
  ): Promise<DeleteCollaboratorResponse> {
    return this.collaboratorsWorkflow.deleteCollaborator({
      userId: ctx.getCurrentUserId(),
      ledgerId,
      collaborator,
    });
  }

  @Mutation(() => DeleteCollaboratorResponse)
  @Authenticated()
  async leaveLedger(
    @Args() { ledgerId }: LeaveLedgerArgs,
    @Ctx() ctx: IContext,
  ): Promise<DeleteCollaboratorResponse> {
    return this.collaboratorsWorkflow.leaveLedger({
      userId: ctx.getCurrentUserId(),
      ledgerId,
    });
  }
}
