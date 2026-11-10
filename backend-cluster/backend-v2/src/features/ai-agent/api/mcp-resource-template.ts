import {
  UriTemplate,
  type Variables,
} from "@modelcontextprotocol/sdk/shared/uriTemplate.js";
import { ZodError } from "zod";
import { BadUserInputError } from "@/shared/errors";
import { envelopeFromThrown, McpRequestFailure } from "./mcp-errors";

/**
 * A malformed URI, refused in the MCP envelope rather than as a domain error.
 *
 * The SDK matches a URI before any read callback of ours runs, so nothing
 * downstream can translate a throw from here: a plain `BadUserInputError`
 * carries no numeric code and the SDK serialized it as `-32603` with no
 * `data` (w1/036). The transport-shaped failure goes out as `-32602` with
 * `BAD_USER_INPUT` and the hint.
 */
function refuseUri(message: string, hint: string): never {
  throw new McpRequestFailure(
    envelopeFromThrown(new BadUserInputError(message, undefined, hint)),
  );
}

/**
 * The SDK expands RFC 6570 query expressions but cannot match them. Keep its
 * path matching and expansion, and match the advertised query parameters here.
 * A query can never overwrite a ledger or required path argument.
 */
export class QueryResourceTemplate extends UriTemplate {
  private readonly pathTemplates: readonly UriTemplate[];

  constructor(
    path: string,
    private readonly queryNames: readonly string[],
    pathAliases: readonly string[] = [],
  ) {
    super(`${path}${queryNames.length ? `{?${queryNames.join(",")}}` : ""}`);
    this.pathTemplates = [path, ...pathAliases].map(
      (template) => new UriTemplate(template),
    );
  }

  override match(uri: string): Variables | null {
    const url = new URL(uri);
    const path = uri.split("?")[0].split("#")[0];
    let variables: Variables | null = null;
    for (const template of this.pathTemplates) {
      variables = template.match(path);
      if (variables) break;
    }
    if (!variables) return null;
    try {
      for (const [name, value] of Object.entries(variables)) {
        variables[name] = Array.isArray(value)
          ? value.map(decodeURIComponent)
          : decodeURIComponent(value);
      }
    } catch {
      refuseUri(
        "Invalid URI encoding in resource path",
        "Percent-encode each path segment as UTF-8 (`encodeURIComponent`) and read it again.",
      );
    }
    if (url.hash)
      refuseUri(
        "Resource fragments are not supported",
        "Drop the `#` fragment; a resource URI takes a path and an optional query only.",
      );
    for (const [name, value] of url.searchParams) {
      if (!this.queryNames.includes(name) || name in variables) {
        refuseUri(
          `Unknown or repeated resource parameter: ${name}`,
          this.queryNames.length
            ? `This resource accepts ${this.queryNames.map((q) => `\`${q}\``).join(", ")}, each at most once; \`resources/templates/list\` publishes every template.`
            : "This resource takes no query parameters; `resources/templates/list` publishes every template.",
        );
      }
      variables[name] = value;
    }
    return variables;
  }
}

/**
 * A read that left off a query name its template requires, refused as such
 * (w1/187). Zod's own words for an absent name are "expected string, received
 * undefined", or "expected number, received NaN" once a coerced number has
 * read nothing, so a refusal of a top-level name the URI did not carry
 * becomes "`<name>` is required". Any other failure passes through unchanged.
 */
export function withRequiredQueryNames(
  error: unknown,
  queryNames: readonly string[],
  variables: Variables,
): unknown {
  if (!(error instanceof ZodError)) return error;
  const missing = [
    ...new Set(
      error.issues
        .map((issue) => issue.path)
        .filter((path) => path.length === 1)
        .map(([name]) => name)
        .filter(
          (name): name is string =>
            typeof name === "string" &&
            queryNames.includes(name) &&
            !(name in variables),
        ),
    ),
  ];
  if (missing.length === 0) return error;
  return new BadUserInputError(
    `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required`,
    missing[0],
  );
}

export function queryTemplate(
  path: string,
  queryNames: readonly string[],
  pathAliases?: readonly string[],
): QueryResourceTemplate {
  return new QueryResourceTemplate(path, queryNames, pathAliases);
}
