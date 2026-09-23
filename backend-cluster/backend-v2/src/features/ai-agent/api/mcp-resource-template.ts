import {
  UriTemplate,
  type Variables,
} from "@modelcontextprotocol/sdk/shared/uriTemplate.js";
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
  private readonly pathTemplate: UriTemplate;

  constructor(
    path: string,
    private readonly queryNames: readonly string[],
  ) {
    super(`${path}${queryNames.length ? `{?${queryNames.join(",")}}` : ""}`);
    this.pathTemplate = new UriTemplate(path);
  }

  override match(uri: string): Variables | null {
    const url = new URL(uri);
    const path = uri.split("?")[0].split("#")[0];
    const variables = this.pathTemplate.match(path);
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

export function queryTemplate(
  path: string,
  queryNames: readonly string[],
): QueryResourceTemplate {
  return new QueryResourceTemplate(path, queryNames);
}
