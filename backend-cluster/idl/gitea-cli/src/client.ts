export class GiteaClient {
  constructor(
    private baseUrl: string,
    private token: string,
  ) {}

  private async request(
    method: string,
    path: string,
    opts: {
      pathParams?: Record<string, string>;
      query?: Record<string, string | number>;
      body?: unknown;
    } = {},
  ): Promise<unknown> {
    let url = path;
    if (opts.pathParams) {
      for (const [k, v] of Object.entries(opts.pathParams)) {
        url = url.replace(`{${k}}`, encodeURIComponent(v));
      }
    }
    if (opts.query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined) params.set(k, String(v));
      }
      const qs = params.toString();
      if (qs) url = `${url}?${qs}`;
    }
    const headers: Record<string, string> = {
      Authorization: `token ${this.token}`,
    };
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${this.baseUrl}/api/v1${url}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 204) return { ok: true };
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

  get(path: string, pathParams?: Record<string, string>, query?: Record<string, string | number>): Promise<unknown> {
    return this.request("GET", path, { pathParams, query });
  }

  post(path: string, body?: unknown, pathParams?: Record<string, string>): Promise<unknown> {
    return this.request("POST", path, { body, pathParams });
  }

  patch(path: string, body?: unknown, pathParams?: Record<string, string>): Promise<unknown> {
    return this.request("PATCH", path, { body, pathParams });
  }

  delete(path: string, pathParams?: Record<string, string>): Promise<unknown> {
    return this.request("DELETE", path, { pathParams });
  }
}

export function makeClient(baseUrl: string, token: string): GiteaClient {
  return new GiteaClient(baseUrl, token);
}
