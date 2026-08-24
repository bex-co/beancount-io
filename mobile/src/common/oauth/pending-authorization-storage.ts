import * as SecureStore from "expo-secure-store";
import {
  deserializePendingAuthorization,
  type PendingOAuthAuthorization,
} from "./authorization-result";

const PENDING_AUTHORIZATION_KEY = "oauth-pending-authorization";

export async function savePendingAuthorization(
  pending: PendingOAuthAuthorization,
): Promise<void> {
  await SecureStore.setItemAsync(
    PENDING_AUTHORIZATION_KEY,
    JSON.stringify(pending),
  );
}

export async function loadPendingAuthorization(): Promise<PendingOAuthAuthorization | null> {
  const value = await SecureStore.getItemAsync(PENDING_AUTHORIZATION_KEY);
  return value === null ? null : deserializePendingAuthorization(value);
}

export async function clearPendingAuthorization(): Promise<void> {
  await SecureStore.deleteItemAsync(PENDING_AUTHORIZATION_KEY);
}
