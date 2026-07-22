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

export const SelectedAssets =
  createGlobalFn<(value: string) => void>("SelectedAssets");
export const SelectedExpenses =
  createGlobalFn<(value: string) => void>("SelectedExpenses");
export const SelectedCurrency =
  createGlobalFn<(value: string) => void>("SelectedCurrency");

export const SelectedPayee =
  createGlobalFn<(value: string) => void>("SelectedPayee");

export const SelectedNarration =
  createGlobalFn<(value: string) => void>("SelectedNarration");

export const AddTransactionCallback = createGlobalFn<() => Promise<void>>(
  "AddTransactionCallback",
);

export const SelectedPostingAccount = createGlobalFn<(value: string) => void>(
  "SelectedPostingAccount",
);

export const SelectedFilterAccount = createGlobalFn<(value: string) => void>(
  "SelectedFilterAccount",
);
