import { formatAmount } from "@/common/lib/format/format-amount";

export const formatAmountWithCurrency = (amount: {
  number: string;
  currency: string;
}) => {
  return `${formatAmount(amount.number)} ${amount.currency}`;
};
