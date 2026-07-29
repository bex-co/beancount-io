import { useLazyQuery } from "@apollo/client/react";
import { SuggestTransactionCategoriesDocument } from "@/graphql/definitions";
import type { ParsedRow } from "../types";

export interface AISuggestion {
  rowIndex: number;
  targetAccount: string;
  confidence: number;
  reasoning: string;
}

export function useAICategorization(ledgerId: string) {
  const [executeQuery, { loading, error }] = useLazyQuery(
    SuggestTransactionCategoriesDocument,
  );

  const categorizeTransactions = async (
    rows: ParsedRow[],
  ): Promise<Map<number, AISuggestion>> => {
    const input = rows.map((row, index) => ({
      rowIndex: index,
      date: row.date,
      payee: row.payee,
      description: row.description,
      amount: row.amount,
    }));

    const result = await executeQuery({
      variables: {
        ledgerId,
        transactions: input,
      },
    });

    // Map results by rowIndex for easy lookup
    const suggestionMap = new Map<number, AISuggestion>();
    result.data?.suggestTransactionCategories?.forEach((s) => {
      if (s) {
        suggestionMap.set(s.rowIndex, {
          rowIndex: s.rowIndex,
          targetAccount: s.targetAccount,
          confidence: s.confidence,
          reasoning: s.reasoning || "",
        });
      }
    });

    return suggestionMap;
  };

  return {
    categorizeTransactions,
    loading,
    error,
  };
}
