declare module "refractor" {
  import type { Grammar } from "prismjs";

  interface Refractor {
    languages: Record<string, Grammar>;
    highlight: (code: string, grammar: Grammar) => unknown;
    [key: string]: unknown;
  }

  export const refractor: Refractor;
}
