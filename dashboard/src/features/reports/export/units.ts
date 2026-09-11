import { isZeroStatementAmount } from "./presentation";

function isZeroAmount(value: unknown): boolean {
  const text = String(value ?? "").trim();
  return text === "" || isZeroStatementAmount(text);
}

/**
 * Units other than `presentationCurrency` that carry a nonzero amount
 * somewhere in `records`, sorted. `records` are flat currency-keyed balance
 * maps — a hierarchy node's rolled-up balance, a statement row's amounts, or
 * a series point's balance — gathered by the caller from its own shape.
 */
export function collectUnits(
  records: Array<Record<string, unknown> | null | undefined>,
  presentationCurrency: string,
): string[] {
  const units = new Set<string>();
  for (const record of records) {
    if (!record) continue;
    for (const [unit, value] of Object.entries(record)) {
      if (unit !== presentationCurrency && !isZeroAmount(value)) {
        units.add(unit);
      }
    }
  }
  return [...units].sort();
}

interface BalanceNode {
  balance?: Record<string, unknown> | null;
  balanceChildren?: Record<string, unknown> | null;
  children?: BalanceNode[] | null;
}

/** Every node's rolled-up balance in a hierarchy, preorder. */
export function collectHierarchyRecords(
  root?: BalanceNode | null,
): Array<Record<string, unknown>> {
  if (!root) return [];
  const records: Array<Record<string, unknown>> = [];
  const visit = (node: BalanceNode): void => {
    records.push(node.balanceChildren ?? node.balance ?? {});
    node.children?.forEach(visit);
  };
  visit(root);
  return records;
}
