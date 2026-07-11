import { useIncomeStatementQuery } from "@/generated-graphql/graphql";

export const useIncomeStatement = (
  ledgerId: string,
  time?: string,
  interval?: string,
) => {
  const { loading, data, error, refetch } = useIncomeStatementQuery({
    variables: { ledgerId, time, interval },
    skip: !ledgerId,
    fetchPolicy: "network-only",
  });
  return { loading, data, error, refetch };
};
