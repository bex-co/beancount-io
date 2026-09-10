import {
  UriTemplate,
  type Variables,
} from "@modelcontextprotocol/sdk/shared/uriTemplate.js";
import { BadUserInputError } from "@/shared/errors";

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
      throw new BadUserInputError("Invalid URI encoding in resource path");
    }
    if (url.hash)
      throw new BadUserInputError("Resource fragments are not supported");
    for (const [name, value] of url.searchParams) {
      if (!this.queryNames.includes(name) || name in variables) {
        throw new BadUserInputError(
          `Unknown or repeated resource parameter: ${name}`,
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

