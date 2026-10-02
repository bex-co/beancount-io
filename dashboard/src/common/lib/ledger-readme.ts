import { base64Decode } from "@/common/lib/utils/encode";

/** The settled public README used by both sides of initial hydration. */
export interface InitialLedgerReadme {
  ledgerId: string;
  path: string;
  status: "ready" | "unavailable";
  content: string | null;
}

export function decodeLedgerReadme(content: string | null | undefined) {
  if (!content) return null;
  try {
    const decoded = base64Decode(content);
    return decoded.trim() ? decoded : null;
  } catch {
    return null;
  }
}
