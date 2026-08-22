import type { paths } from "./generated/api.js";

type ApiPath = keyof paths;

export class AdminClient {
  constructor(
    private baseUrl: string,
    private token: string,
  ) {}

  private async request(
    method: string,
    path: ApiPath,
    opts: { pathParams?: Record<string, string>; body?: unknown } = {},
  ): Promise<unknown> {
    let url = path as string;
    if (opts.pathParams) {
      for (const [k, v] of Object.entries(opts.pathParams)) {
        url = url.replace(`{${k}}`, encodeURIComponent(v));
      }
    }
    const headers: Record<string, string> = {
      "x-admin-token": this.token,
    };
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${this.baseUrl}${url}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  get(path: ApiPath, pathParams?: Record<string, string>): Promise<unknown> {
    return this.request("GET", path, { pathParams });
  }

  post(path: ApiPath, body?: unknown): Promise<unknown> {
    return this.request("POST", path, { body });
  }
}

export function makeClient(baseUrl: string, token: string): AdminClient {
  return new AdminClient(baseUrl, token);
}
