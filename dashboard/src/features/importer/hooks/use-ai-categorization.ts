import { useLazyQuery } from "@apollo/client/react";
import { SuggestTransactionCategoriesDocument } from "@/graphql/definitions";
import type { ParsedRow } from "../types";
import {
  categorizeInBatches,
  type AISuggestion,
} from "../utils/categorize-in-batches";

export function useAICategorization(ledgerId: string) {
  const [executeQuery, { loading, error }] = useLazyQuery(
    SuggestTransactionCategoriesDocument,
  );

  const categorizeTransactions = (
    rows: ParsedRow[],
  ): Promise<Map<number, AISuggestion>> => {
    // rowIndex is the row's position in the whole import, so suggestions
    // from every batch land on the right row.
    const input = rows.map((row, index) => ({
      rowIndex: index,
      date: row.date,
      payee: row.payee,
      description: row.description,
      amount: row.amount,
    }));

    return categorizeInBatches(input, async (transactions) => {
      const result = await executeQuery({
        variables: { ledgerId, transactions },
      });
      return (result.data?.suggestTransactionCategories ?? []).flatMap((s) =>
        s
          ? [
              {
                rowIndex: s.rowIndex,
                targetAccount: s.targetAccount,
                confidence: s.confidence,
                reasoning: s.reasoning || "",
              },
            ]
          : [],
      );
    });
  };

  return {
    categorizeTransactions,
    loading,
    error,
  };
}
