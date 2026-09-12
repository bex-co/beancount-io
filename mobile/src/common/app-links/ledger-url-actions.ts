import * as Clipboard from "expo-clipboard";
import { Platform, Share } from "react-native";

export function shareLedgerUrl(url: string): void {
  // iOS treats message + url as two share items; Android shares the message.
  void Share.share(Platform.OS === "ios" ? { url } : { message: url });
}

export function copyLedgerUrl(url: string, onCopied: () => void): void {
  void Clipboard.setStringAsync(url).then(onCopied);
}
