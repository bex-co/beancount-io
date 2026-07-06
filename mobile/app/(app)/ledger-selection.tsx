import { LedgerSelectionScreen } from "@/screens/ledger-selection";
import { Stack } from "expo-router";

export default function LedgerSelection() {
  return (
    <>
      <Stack.Screen options={{ title: "Ledger Selection" }} />
      <LedgerSelectionScreen />
    </>
  );
}
