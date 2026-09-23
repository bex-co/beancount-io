import { Arg, Ctx, Mutation, Resolver } from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import type { ILedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { ManagedPriceSource } from "./ledger-data-resolver.query";

@Resolver()
export class LedgerDataMutationResolver {
  constructor(private readonly dataService: ILedgerDataService) {}

  @Authenticated()
  @Mutation(() => [ManagedPriceSource], {
    description:
      "Make every managed price feed the ledger includes due now, re-fetch each, and return the same records as getLedgerManagedPrices. Never touches the repository; a failed re-fetch keeps the last validated revision and reports its error. Requires write capability on the ledger.",
  })
  async refreshLedgerManagedPrices(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<ManagedPriceSource[]> {
    return this.dataService.refreshManagedPrices({
      ledgerId,
      identity: ctx.getCurrentIdentity(),
    });
  }
}
