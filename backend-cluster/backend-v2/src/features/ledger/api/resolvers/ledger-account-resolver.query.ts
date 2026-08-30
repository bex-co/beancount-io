import { Arg, Ctx, Field, ObjectType, Query, Resolver } from "type-graphql";
import { AllowAnonymous } from "@/server/graphql/authenticated";
import { GraphQLJSONObject } from "graphql-scalars";
import { IContext } from "@/server/graphql/context";
import { parseLedgerId } from "@/shared/str";
import type { ILedgerAccountService } from "@/features/ledger/service/ledger-account-service";

@ObjectType()
class LedgerAccountItem {
  @Field(() => String)
  account: string;

  @Field(() => String)
  openedAt: string;

  @Field(() => String, { nullable: true })
  closedAt?: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  balance?: Record<string, string>;

  @Field(() => Number)
  entryCount: number;

  @Field(() => String)
  entryHash: string;

  @Field(() => String, { nullable: true })
  closeEntryHash?: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: "Metadata declared on the account's open directive",
  })
  meta?: Record<string, string | number | boolean | null>;
}

@Resolver()
export class LedgerAccountQueryResolver {
  constructor(private readonly ledgerAccount: ILedgerAccountService) {}

  @AllowAnonymous()
  @Query(() => [String], {
    description:
      "Get the accounts of a specific ledger. Optional status filter: 'open' (no closeDate) or 'closed' (has closeDate). Returns all accounts when omitted.",
  })
  async getLedgerAccounts(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("status", () => String, { nullable: true }) status: string | undefined,
    @Ctx() ctx: IContext,
  ): Promise<string[]> {
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    return this.ledgerAccount.getAccounts(
      ledgerOwner,
      ledgerName,
      status,
      ctx.identity,
    );
  }

  @AllowAnonymous()
  @Query(() => [LedgerAccountItem], {
    description:
      "Get all accounts with their open/close dates and open-directive metadata for a specific ledger",
  })
  async getLedgerAccountDirectives(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<LedgerAccountItem[]> {
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    return this.ledgerAccount.getAccountDirectives(
      ledgerOwner,
      ledgerName,
      ctx.identity,
    );
  }
}
