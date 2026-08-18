// persistentVar.ts
import { makeVar, ReactiveVar } from "@apollo/client";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage backend interface (defaults to AsyncStorage; pass secure storage for credential data)
export type PersistentStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

// Generic factory supporting persistent variables of any type
export function createPersistentVar<T>(
  key: string, // storage key
  defaultValue: T, // default value (used when the initial load fails)
  serialize?: (value: T) => string, // serializer (defaults to JSON.stringify)
  deserialize?: (value: string) => T, // deserializer (defaults to JSON.parse)
  storage: PersistentStorage = AsyncStorage, // storage backend
): [ReactiveVar<T>, () => Promise<T | null>, () => Promise<void>] {
  // Initialize the in-memory reactive variable
  const varInstance = makeVar<T>(defaultValue);

  // Serialization and deserialization methods (default to JSON)
  const serializeValue = serialize || ((value) => JSON.stringify(value));
  const deserializeValue = deserialize || ((value) => JSON.parse(value) as T);

  // Load the stored value and update the variable (async)
  const loadFromStorage = async (): Promise<T | null> => {
    try {
      const storedValue = await storage.getItem(key);
      if (storedValue !== null) {
        const result = deserializeValue(storedValue);
        varInstance(result); // update the in-memory variable
        return result;
      }
      return null;
    } catch (error) {
      console.error(`Failed to load ${key} from AsyncStorage:`, error);
      return null;
    }
  };

  // Watch for changes and write them to storage (async)
  const saveToStorage = async (newValue: T): Promise<void> => {
    try {
      const serializedValue = serializeValue(newValue);
      await storage.setItem(key, serializedValue);
    } catch (error) {
      console.error(`Failed to save ${key} to AsyncStorage:`, error);
    }
  };

  // The most recent write, so a caller that is about to do something
  // irreversible can wait for it. Writes are fire-and-forget by design — no
  // screen should block on AsyncStorage — but `reloadApp()` restarts the
  // process, and a restart that outruns the write comes back holding the old
  // value. Keeping only the latest promise is enough: AsyncStorage serializes
  // writes to a key, so awaiting the last one awaits the lot.
  let pendingWrite: Promise<void> = Promise.resolve();

  varInstance.onNextChange(function onNextChange(value) {
    pendingWrite = saveToStorage(value);
    // https://github.com/apollographql/apollo-client/blob/v3.13.8/src/react/hooks/useReactiveVar.ts#L33
    varInstance.onNextChange(onNextChange);
  });

  // Return the variable instance, an optional manual-load method, and a way to
  // await whatever write is currently in flight
  return [varInstance, loadFromStorage, () => pendingWrite];
}
