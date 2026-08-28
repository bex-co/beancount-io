// Relative, not `@/`, so the jest-lite runner can require this module — the
// same reason `picker-sections.ts` avoids the alias.
import type { useRouter } from "expo-router";
import { SelectedAccount } from "../../common/globalFnFactory";

/**
 * Which account ordering the picker browses. Both lists hold every account
 * (see `getAccountsAndCurrency`) and differ only in which root sorts first, so
 * "from" suits any picker that isn't choosing a destination.
 */
const PICKER_ORDER = {
  assets: "from",
  posting: "from",
  filter: "from",
  expenses: "to",
  budget: "to",
} as const;

export type AccountPickerType = keyof typeof PICKER_ORDER;

/** Unknown types fall back to the destination ordering, as they always did. */
export const accountOrderFor = (type?: string): "from" | "to" =>
  PICKER_ORDER[type as AccountPickerType] ?? PICKER_ORDER.expenses;

type PickerRouter = Pick<ReturnType<typeof useRouter>, "push">;

interface PushAccountPickerOptions {
  /** Which ordering to browse. */
  type: AccountPickerType;
  /** The field's current account, scrolled into view and check-marked. */
  current?: string;
  /** Receives the pick. Registered here so it cannot be registered wrongly. */
  onSelect: (account: string) => void;
}

/**
 * Open the account picker and register who receives the pick.
 *
 * The two steps used to be separate at seven call sites: set a per-type global
 * callback, then push with a `type` param. Nothing tied them together, so a
 * caller could set `SelectedAssets` while pushing `type: "expenses"` and the
 * pick would silently go nowhere. Here they are one call, and there is only one
 * key to set, so the mismatch is unrepresentable.
 *
 * A single shared key is safe for the same reason the per-type keys were: the
 * picker captures the callback into a ref on mount and releases it on unmount,
 * so what makes a stale callback impossible is registering immediately before
 * the push — which is now the only way to do it — not the name of the key.
 */
export const pushAccountPicker = (
  router: PickerRouter,
  { type, current, onSelect }: PushAccountPickerOptions,
): void => {
  SelectedAccount.setFn(onSelect);
  router.push({
    pathname: "/(app)/account-picker",
    params: { type, selectedItem: current },
  });
};
