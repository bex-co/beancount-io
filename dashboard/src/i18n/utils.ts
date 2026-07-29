export interface TranslationEntry {
  message: string;
  description: string;
}

export function extractMessages(
  obj: Record<string, TranslationEntry>,
): Record<string, string> {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      acc[key] = value.message;
      return acc;
    },
    {} as Record<string, string>,
  );
}
