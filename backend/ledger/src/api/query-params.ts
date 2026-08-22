/** Query-string coercion shared by all route families (FastAPI-equivalent). */

type QueryValue = string | string[] | undefined;

export function strQuery(value: QueryValue): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function intQuery(value: QueryValue): number | undefined {
  const first = strQuery(value);
  if (first === undefined) return undefined;
  const parsed = parseInt(first, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function boolQuery(value: QueryValue): boolean | undefined {
  const first = strQuery(value);
  if (first === undefined) return undefined;
  return first === "true" || first === "1";
}
