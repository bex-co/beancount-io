import { z } from "zod";
import { isCompleteAccountToken } from "./account-token";

export function buildOpenAccountSchema(
  prefixes: string[],
  messages: {
    required: string;
    mustStartWith: string;
    invalid: string;
  },
) {
  return z.object({
    date: z.date(),
    account: z
      .string()
      .min(1, messages.required)
      .refine(
        (val) =>
          prefixes.length === 0 ||
          prefixes.some((prefix) => val.startsWith(`${prefix}:`)),
        messages.mustStartWith,
      )
      .refine(isCompleteAccountToken, messages.invalid),
  });
}
