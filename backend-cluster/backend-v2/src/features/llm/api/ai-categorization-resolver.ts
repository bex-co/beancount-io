import { Arg, Ctx, Query, Resolver } from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import type { ILLMService } from "../service/llm-service";
import {
  TransactionToCategorizeInput,
  CategorySuggestion,
} from "./ai-categorization-resolver.types";
import { MAX_SUGGEST_TRANSACTIONS } from "../utils/suggest-categories-cap";

@Resolver()
export class LLMCategorizationQueryResolver {
  constructor(private readonly llm: ILLMService) {}

  @Authenticated()
  @Query(() => [CategorySuggestion], {
    description: `Suggest transaction categories based on payee, description, and transaction history. At most ${MAX_SUGGEST_TRANSACTIONS} transactions per call; split a larger import into several calls.`,
  })
  async suggestTransactionCategories(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("transactions", () => [TransactionToCategorizeInput])
    transactions: TransactionToCategorizeInput[],
    @Ctx() ctx: IContext,
  ): Promise<CategorySuggestion[]> {
    return this.llm.suggestCategories(
      ctx.getCurrentIdentity(),
      ledgerId,
      transactions,
      ctx.platform,
    );
  }
}
