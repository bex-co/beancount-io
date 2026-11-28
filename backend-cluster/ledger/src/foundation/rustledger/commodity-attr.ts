import type {
  BeancountError,
  DirectiveJson,
  FileMap,
  MetaValueJson,
} from "@rustledger/wasm";
import { indexBlocks } from "./block-index";
import { beancountPluginRuns } from "./plugins/collect-plugins";
import { SOURCE_DATE } from "./source-date";
import { includeTraversalOrder } from "./source-slice";

/** The engine's two findings, each without a location. */
const MISSING = /^Commodity '([^']+)' missing required attribute '([^']+)'$/u;
const INVALID =
  /^Commodity '([^']+)' attribute '([^']+)' has invalid value '.*' \(allowed: (.*)\)$/su;
const COMMODITY = new RegExp(
  String.raw`^${SOURCE_DATE}\s+commodity\s+(\S+)`,
  "u",
);

const configError = (): BeancountError => ({
  message: "Invalid configuration for commodity_attr plugin; skipping.",
  code: "PLUGIN",
  phase: "plugin",
  hint: null,
  file: null,
  line: null,
  column: null,
  end_line: null,
  end_column: null,
  severity: "error",
});

/** A Python literal's text outside its strings, as JSON. */
const asJson = (code: string) =>
  code
    .replace(/\bNone\b/gu, "null")
    .replace(/\bTrue\b/gu, "true")
    .replace(/\bFalse\b/gu, "false")
    .replace(/\(/gu, "[")
    .replace(/\)/gu, "]")
    .replace(/,(\s*[\]}])/gu, "$1");

/**
 * Whether the plugin's config, which it reads with Python's `eval`, is a
 * dict: rewritten as JSON (quotes, `None`, `True`, `False`, tuples, trailing
 * commas), and not one when it does not read at all.
 */
function readsAsDict(config: string): boolean {
  let json = "";
  let code = "";
  for (let at = 0; at < config.length; at += 1) {
    const quote = config[at]!;
    if (quote !== "'" && quote !== '"') {
      code += quote;
      continue;
    }
    let text = "";
    let end = at + 1;
    for (; end < config.length && config[end] !== quote; end += 1) {
      if (config[end] === "\\") end += 1;
      text += config[end] ?? "";
    }
    if (end >= config.length) return false;
    json += asJson(code) + JSON.stringify(text);
    code = "";
    at = end;
  }
  try {
    const value: unknown = JSON.parse(json + asJson(code));
    return value !== null && typeof value === "object" && !Array.isArray(value);
  } catch {
    return false;
  }
}

/** A metadata value as Python's `str` gives it. */
function pythonText(value: Exclude<MetaValueJson, null>): string {
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "object") return `${value.number} ${value.currency}`;
  return value;
}

/** The config's allowed values, as the engine lists them. */
function allowedValues(list: string): string[] {
  try {
    const values: unknown = JSON.parse(list);
    if (Array.isArray(values)) return values.map(String);
  } catch {
    // Not JSON; the list as written.
  }
  return [list.replace(/^\[|\]$/gu, "")];
}

/**
 * Beancount's `commodity_attr` refuses a `commodity` directive missing an
 * attribute its config names, or giving one a value its list does not hold,
 * on the directive's line: "Missing attribute 'name' for Commodity directive
 * QAX", "Invalid value 'Energy' for attribute sector, Commodity directive
 * QAX; valid options: Tech". A config that is not a dict is reported, with no
 * location (`<commodity_attr>:0`). The engine reported both findings
 * unlocated in other words, an empty value as invalid, a list with nothing in
 * it as refusing every value, and a config it could not read not at all
 * (w31/156). Declared, the engine's findings take Beancount's words and the
 * commodity's line, the value read from the booked stream (`directives`).
 */
export function reconcileCommodityAttrErrors(
  errors: readonly BeancountError[],
  directives: readonly DirectiveJson[],
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  const runs = beancountPluginRuns(files[entryPoint], "commodity_attr");
  if (runs.length === 0) return [...errors];
  const commodities = new Map<string, DirectiveJson[]>();
  for (const directive of directives) {
    if (directive.type !== "commodity") continue;
    const list = commodities.get(directive.currency) ?? [];
    list.push(directive);
    commodities.set(directive.currency, list);
  }
  let places: Map<string, { file: string; line: number }[]> | undefined;
  const lines = () => {
    if (places !== undefined) return places;
    places = new Map();
    const index = indexBlocks(files);
    for (const file of includeTraversalOrder(files, entryPoint)) {
      for (const block of index.blocks(file)) {
        const currency = COMMODITY.exec(block.text)?.[1];
        if (currency === undefined) continue;
        const list = places.get(currency) ?? [];
        list.push({ file, line: block.startLine + 1 });
        places.set(currency, list);
      }
    }
    return places;
  };
  // A currency written twice is checked twice: the nth finding for a
  // commodity and attribute is about its nth directive.
  const seen = new Map<string, number>();
  const reconciled = errors.flatMap((error): BeancountError[] => {
    if (error.code !== "PLUGIN" || error.file) return [error];
    const missing = MISSING.exec(error.message);
    const invalid = missing === null ? INVALID.exec(error.message) : null;
    const [, currency = "", attribute = "", list] = missing ?? invalid ?? [];
    if (currency === "") return [error];
    const key = `${currency}\u0000${attribute}`;
    const nth = seen.get(key) ?? 0;
    seen.set(key, nth + 1);
    const value = commodities.get(currency)?.[nth]?.meta?.[attribute] ?? null;
    let message = `Missing attribute '${attribute}' for Commodity directive ${currency}`;
    if (invalid !== null && value !== null) {
      const allowed = allowedValues(list ?? "");
      // Beancount checks the value only against a list with something in it.
      if (allowed.length === 0) return [];
      message = `Invalid value '${pythonText(value)}' for attribute ${attribute}, Commodity directive ${currency}; valid options: ${allowed.join(", ")}`;
    }
    const at = lines().get(currency)?.[nth];
    return [
      {
        ...error,
        message,
        file: at?.file ?? null,
        line: at?.line ?? null,
        column: at ? 1 : null,
        end_line: null,
        end_column: null,
      },
    ];
  });
  return [
    ...reconciled,
    ...runs.flatMap((config) =>
      config !== null && !readsAsDict(config) ? [configError()] : [],
    ),
  ];
}
