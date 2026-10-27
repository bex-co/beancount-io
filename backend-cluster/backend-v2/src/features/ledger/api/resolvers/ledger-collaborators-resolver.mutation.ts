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
import { withResolvedPreview } from "@/features/ledger/utils/flag-alias";
import { PREVIEW_FLAG_DESCRIPTION } from "@/features/ledger/utils/preview-flag-description";

@ArgsType()
class AddCollaboratorArgs {
  @Field(() => String)
  ledgerId: string;

  @Field(() => String)
  collaborator: string;

  @Field(() => String, { nullable: true })
  permission?: "read" | "write" | "admin";

  @Field(() => Boolean, {
    nullable: true,
    description: PREVIEW_FLAG_DESCRIPTION,
  })
  dryRun?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: "Alias of dryRun, as MCP spells it.",
  })
  dry_run?: boolean;
}

@ArgsType()
class DeleteCollaboratorArgs {
  @Field(() => String)
  ledgerId: string;

  @Field(() => String)
  collaborator: string;

  @Field(() => Boolean, {
    nullable: true,
    description: PREVIEW_FLAG_DESCRIPTION,
  })
  dryRun?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: "Alias of dryRun, as MCP spells it.",
  })
  dry_run?: boolean;
}

@ArgsType()
class LeaveLedgerArgs {
  @Field(() => String)
  ledgerId: string;

  @Field(() => Boolean, {
    nullable: true,
    description: PREVIEW_FLAG_DESCRIPTION,
  })
  dryRun?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: "Alias of dryRun, as MCP spells it.",
  })
  dry_run?: boolean;
}

@ObjectType()
class CollaboratorPreview {
  @Field(() => String)
  collaborator: string;

  @Field(() => String, { nullable: true })
  current: string | null;

  @Field(() => String, { nullable: true })
  requested: string | null;

  @Field(() => [String])
  warnings: string[];
}

@ObjectType()
class AddCollaboratorResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => Boolean, {
    nullable: true,
    description:
      "True when this is a preview: the checks ran and nothing changed. Commits echo false.",
  })
  dryRun?: boolean;

  @Field(() => CollaboratorPreview, {
    nullable: true,
    description:
      "The rendered would-be access change; present only on previews.",
  })
  preview?: CollaboratorPreview;
}

@ObjectType()
class DeleteCollaboratorResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => Boolean, {
    nullable: true,
    description:
      "True when this is a preview: the checks ran and nothing changed. Commits echo false.",
  })
  dryRun?: boolean;

  @Field(() => CollaboratorPreview, {
    nullable: true,
    description:
      "The rendered would-be access change; present only on previews.",
  })
  preview?: CollaboratorPreview;
}

@Resolver()
export class LedgerCollaboratorsMutationResolver {
  constructor(
    private readonly collaboratorsWorkflow: ILedgerCollaboratorsWorkflow,
  ) {}

  @Mutation(() => AddCollaboratorResponse)
  @Authenticated()
  async addOrUpdateLedgerCollaborator(
    @Args()
    { ledgerId, collaborator, permission, ...flag }: AddCollaboratorArgs,
    @Ctx() ctx: IContext,
  ): Promise<AddCollaboratorResponse> {
    return this.collaboratorsWorkflow.addOrUpdateCollaborator({
      identity: ctx.getCurrentIdentity(),
      ledgerId,
      collaborator,
      permission,
      input: withResolvedPreview(flag),
    });
  }

  @Mutation(() => DeleteCollaboratorResponse)
  @Authenticated()
  async deleteLedgerCollaborator(
    @Args() { ledgerId, collaborator, ...flag }: DeleteCollaboratorArgs,
    @Ctx() ctx: IContext,
  ): Promise<DeleteCollaboratorResponse> {
    return this.collaboratorsWorkflow.deleteCollaborator({
      identity: ctx.getCurrentIdentity(),
      ledgerId,
      collaborator,
      input: withResolvedPreview(flag),
    });
  }

  @Mutation(() => DeleteCollaboratorResponse)
  @Authenticated()
  async leaveLedger(
    @Args() { ledgerId, ...flag }: LeaveLedgerArgs,
    @Ctx() ctx: IContext,
  ): Promise<DeleteCollaboratorResponse> {
    return this.collaboratorsWorkflow.leaveLedger({
      identity: ctx.getCurrentIdentity(),
      ledgerId,
      input: withResolvedPreview(flag),
    });
  }
}
