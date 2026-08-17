// utils/globalFnFactory.ts

// Generic type for callback functions - more type-safe than 'Function'
type CallbackFunction = (...args: never[]) => unknown;

const globalFnStore = new Map<string, CallbackFunction>();

function createGlobalFn<T extends CallbackFunction>(
  key: string,
  initialFn?: T,
) {
  if (initialFn) {
    globalFnStore.set(key, initialFn);
  }

  return {
    setFn: (fn: T) => {
      globalFnStore.set(key, fn);
    },
    getFn: (): T | undefined => {
      return globalFnStore.get(key) as T | undefined;
    },
    deleteFn: () => {
      globalFnStore.delete(key);
    },
    hasFn: () => {
      return globalFnStore.has(key);
    },
  };
}

export const getGlobalFn = <T extends CallbackFunction>(key: string) => {
  return globalFnStore.get(key) as T | undefined;
};

/**
 * The account picker's one callback slot.
 *
 * Was five keys — `SelectedAssets`, `SelectedExpenses`, `SelectedPostingAccount`,
 * `SelectedFilterAccount`, `SelectedBudgetAccount` — one per caller type, on the
 * theory that separate names prevent one screen's stale callback firing for
 * another's pick. They don't: two screens that share a key are equally
 * mountable at once, which is why `SelectedAssets` needed a comment explaining
 * that add-transaction and quick-add both use it. What actually prevents a
 * stale fire is the picker capturing this into a ref on mount and releasing it
 * on unmount, plus registering immediately before the push — which
 * `pushAccountPicker` is now the only way to do.
 */
export const SelectedAccount =
  createGlobalFn<(value: string) => void>("SelectedAccount");

export const SelectedCurrency =
  createGlobalFn<(value: string) => void>("SelectedCurrency");

export const SelectedPayee =
  createGlobalFn<(value: string) => void>("SelectedPayee");

export const SelectedNarration =
  createGlobalFn<(value: string) => void>("SelectedNarration");

export const AddTransactionCallback = createGlobalFn<() => Promise<void>>(
  "AddTransactionCallback",
);

/**
 * Run whatever the screen that opened the add flow registered as its refresh,
 * then drop it — the registration is one-shot.
 *
 * Both entry points into the add flow (quick-add and split) go through this so
 * neither can forget the `deleteFn`. It runs as the `afterSuccess` of the
 * shared confirmation helper, i.e. immediately on a successful save and never
 * on a failed one.
 */
export const runAddTransactionCallback = async (): Promise<void> => {
  const callback = AddTransactionCallback.getFn();
  if (!callback) {
    return;
  }
  AddTransactionCallback.deleteFn();
  await callback();
};
