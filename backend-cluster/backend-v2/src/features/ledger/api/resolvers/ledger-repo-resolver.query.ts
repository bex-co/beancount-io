import { Arg, Ctx, Query, Resolver } from "type-graphql";
import { AllowAnonymous } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import type { ILedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { LedgerCommit } from "./ledger-repo-resolver.types";

@Resolver()
export class LedgerRepoQueryResolver {
  constructor(private readonly repoService: ILedgerRepoService) {}

  // A public ledger's history is public, as `listCommits` answers it (w3/497);
  // the service's repository-read check still keeps a private one (w1/223).
  @AllowAnonymous()
  @Query(() => LedgerCommit, { nullable: true })
  async getLatestLedgerCommit(
    @Arg("ledgerId") ledgerId: string,
    @Arg("branchName", { defaultValue: "main" }) branchName: string,
    @Ctx() ctx: IContext,
  ): Promise<LedgerCommit | null> {
    return this.repoService.getLatestCommit({
      ledgerId,
      identity: ctx.identity,
      branchName,
    });
  }
}
