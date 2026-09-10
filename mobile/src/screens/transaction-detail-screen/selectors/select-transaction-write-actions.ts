/**
 * Whether transaction detail may offer edit/delete header actions.
 * Requires both write permission and ready editable source context.
 */
export function shouldShowTransactionWriteActions(
  canWrite: boolean,
  sha256sum: string | null | undefined,
): boolean {
  return Boolean(canWrite && sha256sum);
}
