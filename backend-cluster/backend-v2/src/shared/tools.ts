import crypto from "crypto";

export const makeGravatar = (str: string) => {
  return `https://www.gravatar.com/avatar/${md5(str)}?size=48`;
};

export const filterNullish = <T extends { [key: string]: unknown }>(
  obj: T,
): { [key: string]: unknown } => {
  const result: { [key: string]: unknown } = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
};

export function md5(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex");
}

/**
 * Converts a string from snake_case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Type map for converting snake_case keys to camelCase
 */
type CamelCaseMap<T> = {
  [K in keyof T as K extends string ? CamelCase<K> : K]: T[K] extends object
    ? CamelCaseMap<T[K]>
    : T[K];
};

/**
 * Converts a string to camelCase
 */
type CamelCase<S extends string> =
  S extends `${infer P1}_${infer P2}${infer P3}`
    ? `${P1}${Uppercase<P2>}${CamelCase<P3>}`
    : S;

/**
 * Converts object keys from snake_case to camelCase recursively
 */
export function convertKeysToCamelCase<T>(obj: T): CamelCaseMap<T> {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj as CamelCaseMap<T>;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamelCase) as CamelCaseMap<T>;
  }

  const result = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);
    result[camelKey] = convertKeysToCamelCase(value);
  }
  return result as CamelCaseMap<T>;
}
