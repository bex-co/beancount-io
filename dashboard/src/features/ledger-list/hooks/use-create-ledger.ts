import { useMutation } from "@apollo/client/react";
import type { DocumentNode } from "graphql";
import {
  CreateLedgerDocument,
  CreateLedgerInCurrencyDocument,
  type CreateLedgerMutationVariables,
} from "@/graphql/definitions";

/**
 * What the create form submits: CreateLedger's variables, or a Starter's
 * currency in place of a template (`currencyToSend` decides which).
 */
export type CreateLedgerFormValues =
  | (CreateLedgerMutationVariables & { currency?: undefined })
  | (Omit<CreateLedgerMutationVariables, "template"> & {
      currency: string;
      template?: never;
    });

/**
 * Create a ledger with the document its values need (w3/m62). Without a
 * currency this sends CreateLedger exactly as before the field existed, so a
 * server older than the `currency` argument keeps creating USD and Sample
 * ledgers; only a Starter in another currency sends CreateLedgerInCurrency.
 */
export function useCreateLedger(refetchQueries: DocumentNode[]) {
  const [createBasic, basic] = useMutation(CreateLedgerDocument, {
    refetchQueries,
  });
  const [createInCurrency, inCurrency] = useMutation(
    CreateLedgerInCurrencyDocument,
    { refetchQueries },
  );

  const createLedger = ({ currency, ...variables }: CreateLedgerFormValues) =>
    currency
      ? createInCurrency({
          variables: {
            name: variables.name,
            private: variables.private,
            description: variables.description,
            currency,
          },
        })
      : createBasic({ variables });

  return [
    createLedger,
    { loading: basic.loading || inCurrency.loading },
  ] as const;
}
