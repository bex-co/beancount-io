import * as Clipboard from "expo-clipboard";
import { Share } from "react-native";

export function shareLedgerUrl(url: string): void {
  void Share.share({ message: url, url });
}

export function copyLedgerUrl(url: string, onCopied: () => void): void {
  void Clipboard.setStringAsync(url).then(onCopied);
}
