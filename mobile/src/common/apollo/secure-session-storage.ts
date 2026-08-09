import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PersistentStorage } from "./persistent-var";

// Bearer credentials must live in the OS keychain/keystore — AsyncStorage is
// plaintext on disk. Reads fall back to the legacy AsyncStorage entry once,
// migrating it into secure storage and deleting the plaintext copy.
export const secureSessionStorage: PersistentStorage = {
  async getItem(key: string): Promise<string | null> {
    const secureValue = await SecureStore.getItemAsync(key);
    if (secureValue !== null) {
      return secureValue;
    }
    const legacyValue = await AsyncStorage.getItem(key);
    if (legacyValue !== null) {
      await SecureStore.setItemAsync(key, legacyValue);
      await AsyncStorage.removeItem(key);
    }
    return legacyValue;
  },
  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
};
